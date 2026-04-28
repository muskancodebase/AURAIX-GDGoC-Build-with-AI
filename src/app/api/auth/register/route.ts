import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { hashPassword, createSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, role, email, password } = await request.json();

    if (!name?.trim() || !role?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const password_hash = hashPassword(password);
    const info = db
      .prepare('INSERT INTO users (name, role, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(name.trim(), role.trim(), email.toLowerCase().trim(), password_hash);

    const userId = info.lastInsertRowid as number;
    const sessionId = createSession(userId);

    const res = NextResponse.json({
      success: true,
      user: { id: userId, name: name.trim(), role: role.trim(), email: email.toLowerCase().trim() },
    });
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 86400,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
