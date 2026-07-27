import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

import { SCHEMA_SQL } from './schema.js';

/**
 * Adaptateur SQLite (sql.js) exposant une API synchrone :
 *   db.prepare(sql).run(...) / .get(...) / .all(...)
 *
 * sql.js travaille en mémoire : chaque écriture programme une sauvegarde
 * différée du fichier `data/lumina.db` (écriture atomique), avec un flush
 * garanti à l'arrêt du process.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * `DATABASE_PATH` permet de pointer vers un volume persistant (Docker, disque Render).
 * Sans elle, on retombe sur `backend/data/` — le chemin se résout aussi bien depuis
 * `src/lib` (tsx) que depuis `dist/lib` (build compilé).
 */
const DB_FILE = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '..', '..', 'data', 'lumina.db');
const DATA_DIR = path.dirname(DB_FILE);
const SAVE_DEBOUNCE_MS = 100;

type Row = Record<string, SqlValue>;

const SQL = await initSqlJs({
  locateFile: (file: string) => path.join(path.dirname(require.resolve('sql.js')), file),
});

fs.mkdirSync(DATA_DIR, { recursive: true });

const dbFileExisted = fs.existsSync(DB_FILE);
const sqlite: Database = dbFileExisted
  ? new SQL.Database(fs.readFileSync(DB_FILE))
  : new SQL.Database();

sqlite.run(SCHEMA_SQL);

let saveTimer: NodeJS.Timeout | null = null;
let dirty = false;

/** Écriture atomique : fichier temporaire puis renommage. */
function persist(): void {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, Buffer.from(sqlite.export()));
  fs.renameSync(tmpFile, DB_FILE);
  dirty = false;
}

function scheduleSave(): void {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persist();
  }, SAVE_DEBOUNCE_MS);
  saveTimer.unref();
}

function flush(): void {
  if (!dirty) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  persist();
}

if (!dbFileExisted) {
  persist();
  console.log(`Base SQLite créée : ${DB_FILE}`);
}

process.on('exit', flush);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    flush();
    process.exit(0);
  });
}

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

  /** Force l'écriture immédiate sur disque. */
  saveToFile(): void {
    flush();
  }

  close(): void {
    flush();
    sqlite.close();
  }
}

export const db = new DatabaseWrapper();
export default db;
