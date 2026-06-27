import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.dirname(config.database.path);
try {
  mkdirSync(dataDir, { recursive: true });
} catch {
  // Directory already exists
}

// Load existing database or create new one
function loadDbData(): Uint8Array | undefined {
  if (existsSync(config.database.path)) {
    return new Uint8Array(readFileSync(config.database.path));
  }
  return undefined;
}

// Save database to disk
function saveDb(db: SqlJsDatabase) {
  const data = db.export();
  writeFileSync(config.database.path, Buffer.from(data));
}

// Initialize sql.js and database
const SQL = await initSqlJs();
const dbInstance = new SQL.Database(loadDbData());

// Set pragmas
dbInstance.run('PRAGMA journal_mode = WAL');
dbInstance.run('PRAGMA foreign_keys = ON');
dbInstance.run('PRAGMA busy_timeout = 5000');

// Auto-save on exit
process.on('exit', () => {
  try { saveDb(dbInstance); } catch {}
});
process.on('SIGINT', () => { saveDb(dbInstance); process.exit(0); });
process.on('SIGTERM', () => { saveDb(dbInstance); process.exit(0); });

// --- better-sqlite3 compatible wrapper ---

interface StatementResult {
  columns: string[];
  values: any[][];
}

class WrappedStatement {
  private stmt: any;
  private db: SqlJsDatabase;

  constructor(db: SqlJsDatabase, sql: string) {
    this.db = db;
    this.stmt = db.prepare(sql);
  }

  all(...params: unknown[]): any[] {
    this.stmt.bind(params.length > 0 ? params : undefined);
    const rows: any[] = [];
    while (this.stmt.step()) {
      rows.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return rows;
  }

  run(...params: unknown[]): { changes: number } {
    if (params.length > 0) {
      this.stmt.bind(params);
    }
    this.stmt.step();
    this.stmt.reset();
    return { changes: this.db.getRowsModified() };
  }

  get(...params: unknown[]): any {
    if (params.length > 0) {
      this.stmt.bind(params);
    }
    if (this.stmt.step()) {
      const row = this.stmt.getAsObject();
      this.stmt.reset();
      return row;
    }
    this.stmt.reset();
    return undefined;
  }
}

// Wrapped DB with better-sqlite3 compatible API
const wrappedDb = {
  prepare(sql: string): WrappedStatement {
    return new WrappedStatement(dbInstance, sql);
  },

  exec(sql: string): void {
    dbInstance.run(sql);
  },

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      dbInstance.run('BEGIN IMMEDIATE');
      try {
        const result = fn(...args);
        dbInstance.run('COMMIT');
        // Save after each transaction
        saveDb(dbInstance);
        return result;
      } catch (err) {
        dbInstance.run('ROLLBACK');
        throw err;
      }
    }) as T;
  },

  pragma(pragmaStr: string): void {
    dbInstance.run(`PRAGMA ${pragmaStr}`);
  },

  close(): void {
    saveDb(dbInstance);
    dbInstance.close();
  },

  // Expose raw sql.js db for advanced usage
  _raw: dbInstance,
};

export { wrappedDb as db };

// Periodic save (every 30 seconds)
setInterval(() => {
  try { saveDb(dbInstance); } catch {}
}, 30000);

// Convert parameters to SQLite-compatible types
function sanitizeParams(params?: unknown[]): unknown[] | undefined {
  if (!params) return params;
  return params.map(p => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (Array.isArray(p) || (typeof p === 'object' && p !== null)) {
      return JSON.stringify(p);
    }
    return p;
  });
}

interface QueryResult {
  rows: any[];
  rowCount: number;
}

function executeQuery(sql: string, params?: unknown[], dbRef: typeof wrappedDb = wrappedDb): QueryResult {
  const sanitizedParams = sanitizeParams(params);

  let convertedSql = sql;
  if (sanitizedParams && sanitizedParams.length > 0) {
    convertedSql = sql.replace(/\$(\d+)/g, '?');
  }

  convertedSql = convertedSql
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
    .replace(/COALESCE/gi, 'COALESCE')
    .replace(/::text/gi, '')
    .replace(/::integer/gi, '')
    .replace(/::boolean/gi, '')
    .replace(/GREATEST\(([^,]+),\s*(\d+)\)/gi, 'MAX($1, $2)');

  // Auto-generate UUID for INSERT statements that need an id
  const insertMatch = convertedSql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const tableName = insertMatch[1];
    const columns = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
    const tablesNeedingId = ['users', 'songs', 'playlists', 'generation_jobs', 'comments', 'reference_tracks', 'contact_submissions'];

    if (tablesNeedingId.includes(tableName.toLowerCase()) && !columns.includes('id')) {
      const newId = randomUUID();
      const updatedColumns = 'id, ' + insertMatch[2];
      const valuesMatch = convertedSql.match(/VALUES\s*\(([^)]+)\)/i);
      if (valuesMatch) {
        const updatedValues = `VALUES ('${newId}', ${valuesMatch[1]})`;
        convertedSql = convertedSql.replace(/\([^)]+\)\s*VALUES/i, `(${updatedColumns}) VALUES`);
        convertedSql = convertedSql.replace(/VALUES\s*\([^)]+\)/i, updatedValues);
      }
    }
  }

  try {
    const isSelect = /^\s*(SELECT|RETURNING)/i.test(convertedSql) ||
                     convertedSql.includes('RETURNING');

    if (isSelect || convertedSql.includes('RETURNING')) {
      const stmt = dbRef.prepare(convertedSql);
      const rows = sanitizedParams ? stmt.all(...sanitizedParams) : stmt.all();
      return { rows, rowCount: rows.length };
    } else {
      const stmt = dbRef.prepare(convertedSql);
      const result = sanitizedParams ? stmt.run(...sanitizedParams) : stmt.run();
      return { rows: [], rowCount: result.changes };
    }
  } catch (error) {
    console.error('SQLite query error:', error);
    console.error('SQL:', convertedSql);
    console.error('Params:', sanitizedParams);
    throw error;
  }
}

class SqliteClient {
  private inTransaction = false;

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    return executeQuery(sql, params, wrappedDb);
  }

  release() {
    if (this.inTransaction) {
      try {
        wrappedDb.exec('ROLLBACK');
      } catch {}
      this.inTransaction = false;
    }
  }
}

export const pool = {
  query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
    return executeQuery(sql, params);
  },

  connect: async () => {
    const client = new SqliteClient();
    const originalQuery = client.query.bind(client);
    client.query = async (sql: string, params?: unknown[]) => {
      const upperSql = sql.trim().toUpperCase();
      if (upperSql === 'BEGIN') {
        wrappedDb.exec('BEGIN IMMEDIATE');
        (client as any).inTransaction = true;
        return { rows: [], rowCount: 0 };
      }
      if (upperSql === 'COMMIT') {
        wrappedDb.exec('COMMIT');
        (client as any).inTransaction = false;
        saveDb(dbInstance);
        return { rows: [], rowCount: 0 };
      }
      if (upperSql === 'ROLLBACK') {
        wrappedDb.exec('ROLLBACK');
        (client as any).inTransaction = false;
        return { rows: [], rowCount: 0 };
      }
      return originalQuery(sql, params);
    };
    return client;
  },

  end: async () => {
    wrappedDb.close();
  }
};
