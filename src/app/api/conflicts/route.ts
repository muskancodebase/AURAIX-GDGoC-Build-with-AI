import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const conflicts = db.prepare(`
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
    `).all();

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Conflicts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'resolve') {
      db.prepare('UPDATE conflicts SET status = ? WHERE id = ?').run('resolved', id);
    } else if (action === 'override') {
      db.prepare('UPDATE conflicts SET status = ? WHERE id = ?').run('overridden', id);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conflicts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
