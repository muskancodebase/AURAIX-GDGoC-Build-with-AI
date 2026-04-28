import crypto from 'crypto';
import getDb from './db';

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

export function createSession(userId: number): string {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  getDb()
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(id, userId, expiresAt);
  return id;
}

export function getSession(sessionId: string | undefined | null): SessionUser | null {
  if (!sessionId) return null;
  const row = getDb()
    .prepare(`
      SELECT u.id, u.name, u.role, u.email
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
    `)
    .get(sessionId) as SessionUser | undefined;
  return row ?? null;
}

export function deleteSession(sessionId: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
