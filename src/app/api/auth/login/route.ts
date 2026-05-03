import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureSchema } from '@/lib/db';
import { verifyPassword, createSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await ensureSchema();
    const result = await getDb().execute({
      sql: 'SELECT id, name, role, email, password_hash FROM users WHERE email = ?',
      args: [email.toLowerCase().trim()],
    });

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const row = result.rows[0];
    const user = {
      id: Number(row.id),
      name: row.name as string,
      role: row.role as string,
      email: row.email as string,
      password_hash: row.password_hash as string,
    };

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionId = await createSession(user.id);

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role, email: user.email },
    });
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 86400,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
