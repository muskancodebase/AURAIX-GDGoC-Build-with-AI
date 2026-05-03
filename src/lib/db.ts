import { createClient, type Client } from '@libsql/client';

let _client: Client | null = null;
let _initialized = false;

export function getDb(): Client {
  if (!_client) {
    const url = process.env.LIBSQL_URL;
    const authToken = process.env.LIBSQL_AUTH_TOKEN;
    if (!url) throw new Error('LIBSQL_URL environment variable is not set');
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function ensureSchema(): Promise<void> {
  if (_initialized) return;
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      founder_id  TEXT NOT NULL,
      category    TEXT NOT NULL,
      content     TEXT NOT NULL,
      summary     TEXT NOT NULL DEFAULT '',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conflicts (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_a_id        INTEGER NOT NULL REFERENCES decisions(id),
      decision_b_id        INTEGER NOT NULL REFERENCES decisions(id),
      severity             TEXT NOT NULL,
      conflict_type        TEXT NOT NULL,
      explanation          TEXT NOT NULL,
      suggested_resolution TEXT NOT NULL,
      status               TEXT DEFAULT 'open',
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _initialized = true;
}
