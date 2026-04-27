import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { generate_daily_briefing } from '@/lib/gemini';

export async function GET(request: NextRequest) {
  try {
    const founder = request.nextUrl.searchParams.get('founder') || 'Alice (CEO)';
    const db = getDb();

    const recentDecisions = db.prepare(
      `SELECT category, summary, created_at FROM decisions
       WHERE created_at >= datetime('now', '-7 days')
       ORDER BY created_at DESC LIMIT 20`
    ).all() as { category: string; summary: string; created_at: string }[];

    const openConflicts = db.prepare(
      `SELECT conflict_type as conflictType, explanation, severity FROM conflicts WHERE status = 'open'`
    ).all() as { conflictType: string; explanation: string; severity: string }[];

    const conflictCount = db.prepare(
      `SELECT COUNT(*) as count FROM conflicts WHERE status = 'open'`
    ).get() as { count: number };

    let tasks;
    try {
      tasks = await generate_daily_briefing(founder, recentDecisions, openConflicts);
    } catch (aiError) {
      console.error('AI briefing error:', aiError);
      tasks = [
        { priority: 'green' as const, title: 'Log your first decision', context: 'Get started by logging a team decision.', action: 'Log Now' },
        { priority: 'blue' as const, title: 'Explore the dashboard', context: 'Familiarize yourself with SyncGuard features.', action: 'Explore' },
      ];
    }

    return NextResponse.json({ tasks, conflictCount: conflictCount.count });
  } catch (error) {
    console.error('Briefing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
