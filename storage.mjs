import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function openPostgres(connectionString) {
  const { Pool } = await import('pg');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl']) {
    url.searchParams.delete(key);
  }
  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000
  });
  pool.on('error', error => console.error('PostgreSQL idle connection error:', error.code || error.name));
  return pool;
}

export async function postgresStorage(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(160458831)');
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS asme_private;
      REVOKE ALL ON SCHEMA asme_private FROM PUBLIC;
      CREATE TABLE IF NOT EXISTS asme_private.records (
        kind text NOT NULL,
        id text NOT NULL,
        value jsonb NOT NULL,
        sequence bigint GENERATED ALWAYS AS IDENTITY,
        PRIMARY KEY (kind, id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS unique_student
        ON asme_private.records ((value->>'student')) WHERE kind='member';
      CREATE UNIQUE INDEX IF NOT EXISTS unique_registration
        ON asme_private.records ((value->>'event'), (value->>'email')) WHERE kind='registration';
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return {
    async list(kind) {
      const { rows } = await pool.query('SELECT value FROM asme_private.records WHERE kind=$1 ORDER BY sequence', [kind]);
      return rows.map(row => row.value);
    },
    async get(kind, id) {
      const { rows } = await pool.query('SELECT value FROM asme_private.records WHERE kind=$1 AND id=$2', [kind, id]);
      return rows[0]?.value ?? null;
    },
    async save(kind, value, id = randomUUID()) {
      const record = { ...value, id };
      await pool.query(`
        INSERT INTO asme_private.records (kind,id,value) VALUES ($1,$2,$3)
        ON CONFLICT (kind,id) DO UPDATE SET value=excluded.value
      `, [kind, id, record]);
      return record;
    },
    async seed(kind, id, value) {
      await pool.query(`INSERT INTO asme_private.records (kind,id,value) VALUES ($1,$2,$3)
        ON CONFLICT (kind,id) DO NOTHING`, [kind, id, { ...value, id }]);
    },
    async removeSession(id) {
      await pool.query("DELETE FROM asme_private.records WHERE kind='session' AND id=$1", [id]);
    },
    async pruneSessions(now) {
      await pool.query("DELETE FROM asme_private.records WHERE kind='session' AND (value->>'expires')::bigint <= $1", [now]);
    }
  };
}

async function sqliteStorage(dataDir) {
  const { DatabaseSync } = await import('node:sqlite');
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dataDir, 'asme.sqlite'));
  db.exec(`CREATE TABLE IF NOT EXISTS records (kind TEXT, id TEXT, value TEXT NOT NULL, PRIMARY KEY(kind,id));
    CREATE UNIQUE INDEX IF NOT EXISTS unique_student ON records(json_extract(value,'$.student')) WHERE kind='member';
    CREATE UNIQUE INDEX IF NOT EXISTS unique_registration ON records(json_extract(value,'$.event'),json_extract(value,'$.email')) WHERE kind='registration';`);
  return {
    list(kind) {
      return db.prepare('SELECT value FROM records WHERE kind=? ORDER BY rowid').all(kind).map(row => JSON.parse(row.value));
    },
    get(kind, id) {
      const row = db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind, id);
      return row ? JSON.parse(row.value) : null;
    },
    save(kind, value, id = randomUUID()) {
      const record = { ...value, id };
      db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value')
        .run(kind, id, JSON.stringify(record));
      return record;
    },
    seed(kind, id, value) {
      db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO NOTHING').run(kind, id, JSON.stringify({ ...value, id }));
    },
    removeSession(id) {
      db.prepare("DELETE FROM records WHERE kind='session' AND id=?").run(id);
    },
    pruneSessions(now) {
      db.prepare("DELETE FROM records WHERE kind='session' AND json_extract(value,'$.expires') <= ?").run(now);
    }
  };
}

export async function openStorage() {
  if (!Object.hasOwn(process.env, 'DATABASE_URL')) {
    return sqliteStorage(process.env.ASME_DATA_DIR || 'data');
  }
  const pool = await openPostgres(process.env.DATABASE_URL);
  try {
    return await postgresStorage(pool);
  } catch (error) {
    await pool.end();
    throw error;
  }
}
