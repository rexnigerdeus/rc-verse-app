// src/lib/bibleDb.ts
//
// Service d'accès à la Bible locale (SQLite embarquée dans l'app).
// Permet de lire n'importe quel chapitre offline, sans appel réseau.
//
// Source : assets/database/merged_bibles.sqlite (16 MB, contient KJV + LSG1910 + FreJND).
// Schéma :
//   translations(id, code, title)
//   books(id, name)        -- id = numéro biblique (1=Genèse, 19=Psaumes, 43=Jean, etc.)
//   verses(id, translation_id, book_id, chapter, verse, text)
//
// Schéma compatible avec les codes de version utilisés dans bible.tsx
// (ex: 'FRLSG' → LSG1910 dans la base).

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'bibles.db';

/**
 * Mapping code court (UI) → code présent dans la base SQLite.
 * Quand une version n'existe pas en local, on tombe sur LSG1910 (par défaut).
 */
const VERSION_MAP: Record<string, string> = {
  FRLSG: 'LSG1910',
  FRDBY: 'FreJND', // J.N. Darby
  NBS: 'LSG1910', // pas dispo en local → fallback
  BDS: 'LSG1910', // pas dispo en local → fallback
  FRPDV17: 'LSG1910', // pas dispo en local → fallback
};

export interface LocalVerse {
  verse: number;
  text: string;
}

export interface LocalBook {
  id: number; // numéro biblique (1-66)
  name: string;
}

let dbReady: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initialise et retourne l'instance de la base locale.
 * Au premier appel : copie assets/database/merged_bibles.sqlite vers
 * le répertoire de documents (expo-sqlite ne peut pas lire depuis assets).
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbReady) return dbReady;

  dbReady = (async () => {
    // 1. Chemin cible dans le sandbox de l'app
    const targetPath = `${FileSystem.documentDirectory}${DB_NAME}`;
    const targetUri = targetPath.startsWith('file://') ? targetPath : `file://${targetPath}`;

    // 2. Vérifier si déjà copiée
    const info = await FileSystem.getInfoAsync(targetUri);
    if (!info.exists) {
      // 3. Charger l'asset bundled et le copier
      const asset = Asset.fromModule(require('../../assets/database/merged_bibles.sqlite'));
      await asset.downloadAsync();
      if (!asset.localUri) {
        throw new Error('[bibleDb] Impossible de charger merged_bibles.sqlite depuis assets');
      }
      await FileSystem.copyAsync({ from: asset.localUri, to: targetUri });
    }

    // 4. Ouvrir la base (expo-sqlite résout le chemin iOS/Android)
    return SQLite.openDatabaseAsync(DB_NAME);
  })();

  return dbReady;
}

/**
 * Récupère un chapitre complet de la Bible, en local.
 * Renvoie un tableau vide si la version n'existe pas en local (fallback à gérer en amont).
 */
export async function getChapterLocal(
  versionCode: string,
  bookNumber: number,
  chapter: number
): Promise<LocalVerse[]> {
  const localCode = VERSION_MAP[versionCode] ?? 'LSG1910';
  const db = await getDb();

  // Récupère translation_id
  const translationRows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM translations WHERE code = ?',
    [localCode]
  );
  if (translationRows.length === 0) return [];
  const translationId = translationRows[0].id;

  // Récupère les versets du chapitre
  const rows = await db.getAllAsync<{ verse: number; text: string }>(
    `SELECT verse, text
       FROM verses
      WHERE translation_id = ?
        AND book_id = ?
        AND chapter = ?
      ORDER BY verse ASC`,
    [translationId, bookNumber, chapter]
  );

  // Nettoie le texte (la base contient parfois ¶, [], etc.)
  return rows.map((r) => ({
    verse: r.verse,
    text: r.text
      .replace(/¶/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .trim(),
  }));
}

/**
 * Renvoie le nom d'un livre par son numéro biblique.
 */
export async function getBookNameLocal(bookNumber: number): Promise<string | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM books WHERE id = ?',
    [bookNumber]
  );
  return rows[0]?.name ?? null;
}

/**
 * Indique si une version est disponible en local (cache-friendly).
 */
export function isVersionLocal(versionCode: string): boolean {
  // Toutes les versions FR sont mappées vers LSG1910 ou FreJND.
  // Seules les versions explicitement listées sont garanties couvertes.
  return ['FRLSG', 'FRDBY'].includes(versionCode);
}
