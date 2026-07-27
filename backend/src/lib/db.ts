import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

import { SCHEMA_SQL } from './schema.js';
import { LocalFileStore, RemoteHttpStore, type SnapshotStore } from './snapshot-store.js';

/**
 * Adaptateur SQLite (sql.js) exposant une API **synchrone** :
 *   db.prepare(sql).run(...) / .get(...) / .all(...)
 *
 * La base tient entièrement en mémoire ; seules les sauvegardes sont
 * asynchrones. C'est ce qui permet de tourner sur un hébergement gratuit au
 * système de fichiers éphémère sans transformer les 100+ appels des routes en
 * appels asynchrones.
 *
 * Contrainte : une seule instance à la fois. Deux conteneurs partageant le même
 * instantané s'écraseraient mutuellement — ne pas activer l'autoscaling.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * `DATABASE_REMOTE_URL` (+ `DATABASE_REMOTE_TOKEN`) bascule sur un stockage objet
 * distant. Sinon on écrit sur disque : `DATABASE_PATH`, ou `backend/data/` par
 * défaut — chemin qui se résout aussi bien depuis `src/lib` (tsx) que depuis
 * `dist/lib` (build compilé).
 */
const REMOTE_URL = process.env.DATABASE_REMOTE_URL;
const DB_FILE = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '..', '..', 'data', 'lumina.db');

/** Le distant est plus lent et facturé à la requête : on espace davantage. */
const SAVE_DEBOUNCE_MS = Number(process.env.DATABASE_SAVE_DEBOUNCE_MS) || (REMOTE_URL ? 2000 : 100);

type Row = Record<string, SqlValue>;

const store: SnapshotStore = REMOTE_URL
  ? new RemoteHttpStore(REMOTE_URL, process.env.DATABASE_REMOTE_TOKEN)
  : new LocalFileStore(DB_FILE);

const SQL = await initSqlJs({
  locateFile: (file: string) => path.join(path.dirname(require.resolve('sql.js')), file),
});

const snapshot = await store.load();
const sqlite: Database = snapshot ? new SQL.Database(snapshot) : new SQL.Database();

sqlite.run(SCHEMA_SQL);

let saveTimer: NodeJS.Timeout | null = null;
let dirty = false;
/** Envoi en cours : on n'écrit jamais deux instantanés en parallèle. */
let saving: Promise<void> | null = null;
/** Une écriture est arrivée pendant l'envoi : il faudra en refaire un. */
let resaveNeeded = false;

async function writeSnapshot(): Promise<void> {
  // `dirty` est remis à false AVANT l'export : toute écriture survenant pendant
  // l'envoi doit programmer un nouvel instantané, pas être considérée incluse.
  dirty = false;
  const data = sqlite.export();
  try {
    await store.save(data);
  } catch (error) {
    // On se remet en attente : la prochaine écriture, ou l'arrêt, réessaiera.
    dirty = true;
    console.error("Sauvegarde de l'instantané échouée :", error);
  }
}

async function runSave(): Promise<void> {
  if (saving) {
    resaveNeeded = true;
    return;
  }
  saving = writeSnapshot();
  await saving;
  saving = null;

  if (resaveNeeded) {
    resaveNeeded = false;
    await runSave();
  }
}

function scheduleSave(): void {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void runSave();
  }, SAVE_DEBOUNCE_MS);
  saveTimer.unref();
}

/** Vide la file d'attente et attend que le dernier instantané soit écrit. */
async function flush(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (saving) await saving;
  if (dirty) await runSave();
}

if (!snapshot) {
  await store.save(sqlite.export());
  console.log(`Base SQLite créée (${store.description})`);
} else {
  console.log(`Base SQLite chargée (${store.description})`);
}

/**
 * Arrêt propre. Les hébergeurs envoient SIGTERM avant d'éteindre un conteneur,
 * ce qui laisse le temps d'un dernier envoi réseau.
 */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void flush().then(() => process.exit(0));
  });
}

/**
 * Dernier filet de sécurité : `exit` interdit toute opération asynchrone, donc
 * seul le disque local peut encore être sauvé. En stockage distant, la
 * protection repose entièrement sur les signaux ci-dessus.
 */
process.on('exit', () => {
  if (dirty && store.saveSync) store.saveSync(sqlite.export());
});

/** SQLite n'accepte que null/number/string/Uint8Array : on normalise le reste. */
function toSqlValue(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'bigint') return Number(value);
  return JSON.stringify(value);
}

function bindParams(params: unknown[]): SqlValue[] {
  return params.map(toSqlValue);
}

/** Exécute `sql`, libère la statement, et renvoie les lignes demandées. */
function query(sql: string, params: unknown[], collect: 'none' | 'first' | 'all'): Row[] {
  const statement = sqlite.prepare(sql);
  const rows: Row[] = [];
  try {
    statement.bind(bindParams(params));
    while (statement.step()) {
      if (collect === 'none') break;
      rows.push(statement.getAsObject());
      if (collect === 'first') break;
    }
  } catch (error) {
    console.error('SQL Error:', error, '\nSQL:', sql, '\nParams:', params);
    throw error;
  } finally {
    statement.free();
  }
  return rows;
}

class DatabaseWrapper {
  /** Exécute une ou plusieurs instructions SQL sans résultat. */
  exec(sql: string): void {
    sqlite.run(sql);
    scheduleSave();
  }

  /**
   * `T` décrit la forme attendue des lignes : `prepare<Client>('SELECT ...')`
   * évite un cast au point d'appel. Par défaut, les colonnes brutes.
   */
  prepare<T = Row>(sql: string) {
    return {
      run: (...params: unknown[]): { changes: number } => {
        query(sql, params, 'none');
        scheduleSave();
        return { changes: sqlite.getRowsModified() };
      },
      get: (...params: unknown[]): T | undefined =>
        query(sql, params, 'first')[0] as T | undefined,
      all: (...params: unknown[]): T[] => query(sql, params, 'all') as unknown as T[],
    };
  }

  pragma(pragma: string): void {
    sqlite.run(`PRAGMA ${pragma};`);
  }

  /** Force l'écriture immédiate de l'instantané. */
  saveToFile(): Promise<void> {
    return flush();
  }

  async close(): Promise<void> {
    await flush();
    sqlite.close();
  }
}

export const db = new DatabaseWrapper();
export default db;
