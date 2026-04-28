import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getDb from '@/lib/db';
import { detect_conflict, ConflictResult } from '@/lib/gemini';
import { getSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = getSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { content, category } = body;

    if (!content || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const founder_id = `${user.name} (${user.role})`;
    const db = getDb();

    const priorDecisions = db
      .prepare(`SELECT id, founder_id, category, summary, created_at FROM decisions ORDER BY created_at DESC LIMIT 50`)
      .all() as { id: number; founder_id: string; category: string; summary: string; created_at: string }[];

    let result: ConflictResult;
    try {
      result = await detect_conflict(content, priorDecisions);
    } catch (aiError) {
      console.error('AI error, saving without conflict check:', aiError);
      result = { hasConflict: false, summary: content.slice(0, 200) };
    }

    const info = db
      .prepare(`INSERT INTO decisions (founder_id, category, content, summary) VALUES (?, ?, ?, ?)`)
      .run(founder_id, category, content, result.summary);
    const newDecisionId = info.lastInsertRowid;

    let conflictId = null;
    if (result.hasConflict && result.priorDecisionId) {
      const priorExists = db.prepare('SELECT id FROM decisions WHERE id = ?').get(result.priorDecisionId);
      if (priorExists) {
        const conflictInfo = db
          .prepare(
            `INSERT INTO conflicts (decision_a_id, decision_b_id, severity, conflict_type, explanation, suggested_resolution)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(
            result.priorDecisionId,
            newDecisionId,
            result.severity || 'blue',
            result.conflictType || 'Unknown',
            result.explanation || 'Potential conflict detected.',
            result.suggestedResolution || 'Review both decisions and align.'
          );
        conflictId = conflictInfo.lastInsertRowid;
      }
    }

    return NextResponse.json({
      success: true,
      decisionId: newDecisionId,
      summary: result.summary,
      conflict: result.hasConflict
        ? {
            id: conflictId,
            severity: result.severity,
            conflictType: result.conflictType,
            explanation: result.explanation,
            suggestedResolution: result.suggestedResolution,
          }
        : null,
    });
  } catch (error) {
    console.error('Log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
