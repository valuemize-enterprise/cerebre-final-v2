const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Connection pool ───────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error', err);
});

// ── Query helper ─────────────────────────────────────────────
const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

// ── Transaction helper ────────────────────────────────────────
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, getClient, withTransaction };

// ── Run as script: node src/db/db.js migrate ─────────────────
if (require.main === module) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  pool.query(sql)
    .then(() => { console.log('[DB] Schema applied'); process.exit(0); })
    .catch((err) => { console.error('[DB] Migration failed', err); process.exit(1); });
}
