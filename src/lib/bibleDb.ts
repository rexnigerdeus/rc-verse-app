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
//
// ⚠️ IMPORTANT : ce module est lazy-loaded. Les imports dynamiques (Asset,
// FileSystem, SQLite) sont faits UNIQUEMENT dans getDb() pour éviter que
// le require() top-level du .sqlite fasse crasher l'app au boot sur iOS natif.

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

let dbReady: Promise<any> | null = null;

/**
 * Initialise et retourne l'instance de la base locale.
 * Au premier appel : importe les modules natifs et copie la base depuis assets.
 * Lazy-load pour éviter les crashs iOS natif au boot.
 */
async function getDb(): Promise<any> {
  if (dbReady) return dbReady;

  dbReady = (async () => {
    // Imports dynamiques : ne s'exécutent qu'au premier accès à la Bible,
    // pas au démarrage de l'app.
    const [{ Asset }, FileSystem, SQLite] = await Promise.all([
      import('expo-asset'),
      import('expo-file-system/legacy'),
      import('expo-sqlite'),
    ]);

    // 1. Chemin cible dans le sandbox de l'app
    const docDir = FileSystem.documentDirectory ?? '';
    const targetPath = `${docDir}${DB_NAME}`;
    const targetUri = targetPath.startsWith('file://') ? targetPath : `file://${targetPath}`;

    // 2. Vérifier si déjà copiée
    let exists = false;
    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      exists = !!info?.exists;
    } catch {
      exists = false;
    }

    if (!exists) {
      // 3. Charger l'asset bundled et le copier
      try {
        const asset = Asset.fromModule(require('../../assets/database/merged_bibles.sqlite'));
        // Sur iOS natif, downloadAsync peut crasher si l'asset n'est pas dans le bundle.
        // On évite cet appel pour les assets bundled : localUri est déjà défini.
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        const sourceUri = asset.localUri;
        if (!sourceUri) {
          console.warn('[bibleDb] Asset localUri indisponible');
          return null;
        }
        await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
      } catch (e) {
        console.warn('[bibleDb] Copy failed', e);
        return null;
      }
    }

    // 4. Ouvrir la base (expo-sqlite résout le chemin iOS/Android)
    try {
      return await SQLite.openDatabaseAsync(DB_NAME);
    } catch (e) {
      console.warn('[bibleDb] openDatabaseAsync failed', e);
      return null;
    }
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
  if (!db) return [];

  // Récupère translation_id
  const translationRows = await db.getAllAsync(
    'SELECT id FROM translations WHERE code = ?',
    [localCode]
  ) as Array<{ id: number }>;
  if (translationRows.length === 0) return [];
  const translationId = translationRows[0].id;

  // Récupère les versets du chapitre
  const rows = await db.getAllAsync(
    `SELECT verse, text
       FROM verses
      WHERE translation_id = ?
        AND book_id = ?
        AND chapter = ?
      ORDER BY verse ASC`,
    [translationId, bookNumber, chapter]
  ) as Array<{ verse: number; text: string }>;

  // Nettoie le texte (la base contient parfois ¶, [], etc.)
  return rows.map((r: any) => ({
    verse: r.verse,
    text: String(r.text ?? '')
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
  if (!db) return null;
  const rows = await db.getAllAsync(
    'SELECT name FROM books WHERE id = ?',
    [bookNumber]
  ) as Array<{ name: string }>;
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
