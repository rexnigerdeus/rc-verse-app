// src/lib/offlineDb.ts
//
// Couche de persistance locale pour le mode offline-first.
// On stocke une copie miroir des données utilisateur (carnet, prières)
// dans une base SQLite embarquée, pour pouvoir :
//   1. Lire les données sans réseau
//   2. Écrire de nouvelles entrées offline (elles seront sync plus tard)
//   3. Marquer chaque ligne avec _sync_status pour savoir ce qui doit partir
//
// Schéma aligné sur Supabase pour simplifier la synchro.

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'offline_data.db';

export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Ouvre la base et applique le schéma. Idempotent.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY,
        server_id INTEGER,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        tag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        _sync_status TEXT NOT NULL DEFAULT 'synced',
        _local_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS prayer_requests (
        id INTEGER PRIMARY KEY,
        server_id INTEGER,
        user_id TEXT NOT NULL,
        request_text TEXT NOT NULL,
        is_fulfilled INTEGER NOT NULL DEFAULT 0,
        fulfilled_at TEXT,
        created_at TEXT NOT NULL,
        _sync_status TEXT NOT NULL DEFAULT 'synced',
        _local_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_journal_sync
        ON journal_entries(_sync_status);
      CREATE INDEX IF NOT EXISTS idx_journal_user
        ON journal_entries(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_prayer_sync
        ON prayer_requests(_sync_status);
      CREATE INDEX IF NOT EXISTS idx_prayer_user
        ON prayer_requests(user_id, created_at DESC);
    `);
    return db;
  })();
  return dbPromise;
}

/* --------------------------------------------------------------------------
 * Helpers internes
 * -------------------------------------------------------------------------- */

const newLocalId = (): number => Date.now() * 1000 + Math.floor(Math.random() * 1000);

const toIsoNow = (): string => new Date().toISOString();

/* --------------------------------------------------------------------------
 * CARNET (Journal)
 * -------------------------------------------------------------------------- */

export interface LocalJournalEntry {
  id: number;
  server_id: number | null;
  user_id: string;
  content: string;
  tag: string;
  created_at: string;
  _sync_status: SyncStatus;
  _local_updated_at: string;
}

/**
 * Remplace toutes les entrées du carnet pour cet utilisateur (pull depuis serveur).
 * On supprime localement celles qui ont disparu côté serveur.
 */
export async function replaceJournal(
  userId: string,
  entries: Array<Omit<LocalJournalEntry, 'id' | '_sync_status' | '_local_updated_at'>>
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    // 1. Récupère les server_id actuellement en local pour cet user
    const existing = await db.getAllAsync<{ server_id: number | null; id: number }>(
      'SELECT id, server_id FROM journal_entries WHERE user_id = ?',
      [userId]
    );
    const serverIdsFromServer = new Set(entries.map((e) => e.server_id).filter(Boolean));

    // 2. Supprime celles qui ont disparu du serveur ET qui étaient synced
    for (const row of existing) {
      if (row.server_id !== null && !serverIdsFromServer.has(row.server_id)) {
        await db.runAsync(
          "DELETE FROM journal_entries WHERE id = ? AND _sync_status = 'synced'",
          [row.id]
        );
      }
    }

    // 3. Upsert chaque entrée du serveur (toujours 'synced')
    for (const e of entries) {
      if (e.server_id == null) continue;
      const existingRow = existing.find((r) => r.server_id === e.server_id);
      if (existingRow) {
        await db.runAsync(
          `UPDATE journal_entries
              SET content = ?, tag = ?, created_at = ?, _sync_status = 'synced'
            WHERE id = ?`,
          [e.content, e.tag, e.created_at, existingRow.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO journal_entries
            (server_id, user_id, content, tag, created_at, _sync_status)
            VALUES (?, ?, ?, ?, ?, 'synced')`,
          [e.server_id, userId, e.content, e.tag, e.created_at]
        );
      }
    }
  });
}

/**
 * Lit toutes les entrées du carnet pour cet utilisateur.
 */
export async function getJournal(userId: string): Promise<LocalJournalEntry[]> {
  const db = await getDb();
  return db.getAllAsync<LocalJournalEntry>(
    `SELECT * FROM journal_entries
      WHERE user_id = ?
      ORDER BY created_at DESC`,
    [userId]
  );
}

/**
 * Crée une nouvelle entrée offline. Retourne l'entrée créée avec son id local.
 */
export async function createJournalEntry(
  userId: string,
  content: string,
  tag: string
): Promise<LocalJournalEntry> {
  const db = await getDb();
  const localId = newLocalId();
  const createdAt = toIsoNow();
  await db.runAsync(
    `INSERT INTO journal_entries
      (id, server_id, user_id, content, tag, created_at, _sync_status)
      VALUES (?, NULL, ?, ?, ?, ?, 'pending_create')`,
    [localId, userId, content, tag, createdAt]
  );
  return {
    id: localId,
    server_id: null,
    user_id: userId,
    content,
    tag,
    created_at: createdAt,
    _sync_status: 'pending_create',
    _local_updated_at: createdAt,
  };
}

/* --------------------------------------------------------------------------
 * PRIÈRES (Prayer requests)
 * -------------------------------------------------------------------------- */

export interface LocalPrayerRequest {
  id: number;
  server_id: number | null;
  user_id: string;
  request_text: string;
  is_fulfilled: number; // 0 | 1
  fulfilled_at: string | null;
  created_at: string;
  _sync_status: SyncStatus;
  _local_updated_at: string;
}

export async function replacePrayers(
  userId: string,
  entries: Array<Omit<LocalPrayerRequest, 'id' | '_sync_status' | '_local_updated_at'>>
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const existing = await db.getAllAsync<{ server_id: number | null; id: number }>(
      'SELECT id, server_id FROM prayer_requests WHERE user_id = ?',
      [userId]
    );
    const serverIdsFromServer = new Set(entries.map((e) => e.server_id).filter(Boolean));

    for (const row of existing) {
      if (row.server_id !== null && !serverIdsFromServer.has(row.server_id)) {
        await db.runAsync(
          "DELETE FROM prayer_requests WHERE id = ? AND _sync_status = 'synced'",
          [row.id]
        );
      }
    }

    for (const e of entries) {
      if (e.server_id == null) continue;
      const existingRow = existing.find((r) => r.server_id === e.server_id);
      if (existingRow) {
        await db.runAsync(
          `UPDATE prayer_requests
              SET request_text = ?, is_fulfilled = ?, fulfilled_at = ?, _sync_status = 'synced'
            WHERE id = ?`,
          [e.request_text, e.is_fulfilled, e.fulfilled_at, existingRow.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO prayer_requests
            (server_id, user_id, request_text, is_fulfilled, fulfilled_at, created_at, _sync_status)
            VALUES (?, ?, ?, ?, ?, ?, 'synced')`,
          [e.server_id, userId, e.request_text, e.is_fulfilled, e.fulfilled_at, e.created_at]
        );
      }
    }
  });
}

export async function getPrayers(userId: string): Promise<LocalPrayerRequest[]> {
  const db = await getDb();
  return db.getAllAsync<LocalPrayerRequest>(
    `SELECT * FROM prayer_requests
      WHERE user_id = ?
      ORDER BY created_at DESC`,
    [userId]
  );
}

export async function createPrayerRequest(
  userId: string,
  requestText: string
): Promise<LocalPrayerRequest> {
  const db = await getDb();
  const localId = newLocalId();
  const createdAt = toIsoNow();
  await db.runAsync(
    `INSERT INTO prayer_requests
      (id, server_id, user_id, request_text, is_fulfilled, fulfilled_at, created_at, _sync_status)
      VALUES (?, NULL, ?, ?, 0, NULL, ?, 'pending_create')`,
    [localId, userId, requestText, createdAt]
  );
  return {
    id: localId,
    server_id: null,
    user_id: userId,
    request_text: requestText,
    is_fulfilled: 0,
    fulfilled_at: null,
    created_at: createdAt,
    _sync_status: 'pending_create',
    _local_updated_at: createdAt,
  };
}

export async function markPrayerFulfilled(localId: number): Promise<void> {
  const db = await getDb();
  const fulfilledAt = toIsoNow();
  await db.runAsync(
    `UPDATE prayer_requests
        SET is_fulfilled = 1,
            fulfilled_at = ?,
            _sync_status = CASE WHEN server_id IS NULL THEN 'pending_update' ELSE 'pending_update' END,
            _local_updated_at = ?
      WHERE id = ?`,
    [fulfilledAt, fulfilledAt, localId]
  );
}

/* --------------------------------------------------------------------------
 * Queue de synchronisation
 * -------------------------------------------------------------------------- */

export interface PendingOp {
  table: 'journal_entries' | 'prayer_requests';
  localId: number;
  op: 'create' | 'update';
}

/**
 * Récupère toutes les opérations en attente de sync.
 */
export async function getPendingOps(): Promise<PendingOp[]> {
  const db = await getDb();
  const journalPending = await db.getAllAsync<{ id: number }>(
    "SELECT id FROM journal_entries WHERE _sync_status IN ('pending_create', 'pending_update')"
  );
  const prayerPending = await db.getAllAsync<{ id: number }>(
    "SELECT id FROM prayer_requests WHERE _sync_status IN ('pending_create', 'pending_update')"
  );
  return [
    ...journalPending.map((r) => ({
      table: 'journal_entries' as const,
      localId: r.id,
      op: 'create' as const,
    })),
    ...prayerPending.map((r) => ({
      table: 'prayer_requests' as const,
      localId: r.id,
      op: 'create' as const,
    })),
  ];
}

/**
 * Marque une opération comme synchronisée et stocke le server_id retourné.
 */
export async function markSynced(
  table: 'journal_entries' | 'prayer_requests',
  localId: number,
  serverId: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${table}
        SET server_id = ?, _sync_status = 'synced'
      WHERE id = ?`,
    [serverId, localId]
  );
}

/**
 * Compte le nombre d'éléments en attente (pour l'indicateur UI).
 */
export async function countPending(): Promise<number> {
  const db = await getDb();
  const journal = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM journal_entries WHERE _sync_status IN ('pending_create', 'pending_update')"
  );
  const prayer = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM prayer_requests WHERE _sync_status IN ('pending_create', 'pending_update')"
  );
  return (journal?.c ?? 0) + (prayer?.c ?? 0);
}

/* --------------------------------------------------------------------------
 * Reset complet (utile pour debug / logout)
 * -------------------------------------------------------------------------- */

export async function clearAllOfflineData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM journal_entries;
    DELETE FROM prayer_requests;
  `);
}
