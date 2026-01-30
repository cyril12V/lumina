import pg from 'pg';
const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Test connection
pool.query('SELECT NOW()').then(() => {
  console.log('PostgreSQL connected successfully');
}).catch((err) => {
  console.error('PostgreSQL connection error:', err);
});

// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Database wrapper to match SQLite-like API
class DatabaseWrapper {
  // Execute SQL without returning results
  exec(sql: string) {
    return pool.query(sql);
  }

  // Prepare a statement (returns object with run, get, all methods)
  prepare(sql: string) {
    const pgSql = convertPlaceholders(sql);

    return {
      async run(...params: any[]) {
        try {
          const result = await pool.query(pgSql, params);
          return { changes: result.rowCount || 0 };
        } catch (error) {
          console.error('SQL Error:', error, '\nSQL:', pgSql, '\nParams:', params);
          throw error;
        }
      },
      async get(...params: any[]) {
        try {
          const result = await pool.query(pgSql, params);
          return result.rows[0] || undefined;
        } catch (error) {
          console.error('SQL Error:', error, '\nSQL:', pgSql, '\nParams:', params);
          throw error;
        }
      },
      async all(...params: any[]) {
        try {
          const result = await pool.query(pgSql, params);
          return result.rows;
        } catch (error) {
          console.error('SQL Error:', error, '\nSQL:', pgSql, '\nParams:', params);
          throw error;
        }
      }
    };
  }

  // For compatibility - does nothing in PostgreSQL
  pragma(_pragma: string) {
    // PostgreSQL doesn't need pragmas
  }

  // For compatibility
  saveToFile() {
    // PostgreSQL persists automatically
  }

  // Close pool
  async close() {
    await pool.end();
  }
}

export const db = new DatabaseWrapper();
export default db;
