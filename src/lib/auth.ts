import crypto from 'crypto';
import { getDb, ensureSchema } from './db';

export const SESSION_COOKIE = 'sg_session';
const SESSION_DAYS = 7;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export interface SessionUser {
  id: number;
  name: string;
  role: string;
  email: string;
}

export async function createSession(userId: number): Promise<string> {
  await ensureSchema();
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await getDb().execute({
    sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    args: [id, userId, expiresAt],
  });
  return id;
}

export async function getSession(sessionId: string | undefined | null): Promise<SessionUser | null> {
  if (!sessionId) return null;
  await ensureSchema();
  const result = await getDb().execute({
    sql: `SELECT u.id, u.name, u.role, u.email
          FROM sessions s JOIN users u ON s.user_id = u.id
          WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')`,
    args: [sessionId],
  });
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name as string,
    role: row.role as string,
    email: row.email as string,
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await ensureSchema();
  await getDb().execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    args: [sessionId],
  });
}
