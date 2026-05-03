import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, ensureSchema } from '@/lib/db';
import { getSession, SESSION_COOKIE } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await ensureSchema();
    const result = await getDb().execute(
      `SELECT id, founder_id, category, summary, content, created_at
       FROM decisions
       ORDER BY created_at DESC
       LIMIT 100`
    );

    const decisions = result.rows.map((row) => ({
      id: Number(row.id),
      founder_id: row.founder_id as string,
      category: row.category as string,
      summary: row.summary as string,
      content: row.content as string,
      created_at: row.created_at as string,
    }));

    return NextResponse.json({ decisions });
  } catch (error) {
    console.error('Decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
