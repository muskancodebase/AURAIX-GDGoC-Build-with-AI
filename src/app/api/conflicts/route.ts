import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, ensureSchema } from '@/lib/db';
import { getSession, SESSION_COOKIE } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await ensureSchema();
    const result = await getDb().execute(`
      SELECT
        c.id, c.severity, c.conflict_type, c.explanation, c.suggested_resolution, c.status, c.created_at,
        da.id as da_id, da.founder_id as da_founder, da.summary as da_summary, da.created_at as da_date,
        db2.id as db_id, db2.founder_id as db_founder, db2.summary as db_summary, db2.created_at as db_date
      FROM conflicts c
      JOIN decisions da ON c.decision_a_id = da.id
      JOIN decisions db2 ON c.decision_b_id = db2.id
      WHERE c.status = 'open'
      ORDER BY
        CASE c.severity WHEN 'red' THEN 1 WHEN 'amber' THEN 2 WHEN 'blue' THEN 3 END,
        c.created_at DESC
    `);

    const conflicts = result.rows.map((row) => ({
      id: Number(row.id),
      severity: row.severity as string,
      conflict_type: row.conflict_type as string,
      explanation: row.explanation as string,
      suggested_resolution: row.suggested_resolution as string,
      status: row.status as string,
      created_at: row.created_at as string,
      da_id: Number(row.da_id),
      da_founder: row.da_founder as string,
      da_summary: row.da_summary as string,
      da_date: row.da_date as string,
      db_id: Number(row.db_id),
      db_founder: row.db_founder as string,
      db_summary: row.db_summary as string,
      db_date: row.db_date as string,
    }));

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Conflicts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    await ensureSchema();
    const db = getDb();

    if (action === 'resolve') {
      await db.execute({ sql: 'UPDATE conflicts SET status = ? WHERE id = ?', args: ['resolved', id] });
    } else if (action === 'override') {
      await db.execute({ sql: 'UPDATE conflicts SET status = ? WHERE id = ?', args: ['overridden', id] });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conflicts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
