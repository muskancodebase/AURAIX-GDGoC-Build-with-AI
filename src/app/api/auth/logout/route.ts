import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionId) await deleteSession(sessionId);

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
