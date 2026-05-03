import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, ensureSchema } from '@/lib/db';
import { generate_daily_briefing } from '@/lib/gemini';
import { getSession, SESSION_COOKIE } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const founderLabel = `${user.name} (${user.role})`;
    await ensureSchema();
    const db = getDb();

    const decisionsResult = await db.execute(
      `SELECT category, summary, created_at FROM decisions
       WHERE created_at >= datetime('now', '-7 days')
       ORDER BY created_at DESC LIMIT 20`
    );
    const recentDecisions = decisionsResult.rows.map((row) => ({
      category: row.category as string,
      summary: row.summary as string,
      created_at: row.created_at as string,
    }));

    const conflictsResult = await db.execute(
      `SELECT conflict_type as conflictType, explanation, severity FROM conflicts WHERE status = 'open'`
    );
    const openConflicts = conflictsResult.rows.map((row) => ({
      conflictType: row.conflictType as string,
      explanation: row.explanation as string,
      severity: row.severity as string,
    }));

    const countResult = await db.execute(
      `SELECT COUNT(*) as count FROM conflicts WHERE status = 'open'`
    );
    const count = Number(countResult.rows[0].count);

    let tasks;
    try {
      tasks = await generate_daily_briefing(founderLabel, recentDecisions, openConflicts);
    } catch (aiError) {
      console.error('AI briefing error:', aiError);
      tasks = [
        { priority: 'green' as const, title: 'Log your first decision', context: 'Get started by logging a team decision.', action: 'Log Now' },
        { priority: 'blue' as const, title: 'Explore the dashboard', context: 'Familiarise yourself with SyncGuard features.', action: 'Explore' },
      ];
    }

    return NextResponse.json({ tasks, conflictCount: count });
  } catch (error) {
    console.error('Briefing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
