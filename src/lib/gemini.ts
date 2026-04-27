const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─────────────────────────────────────────────
// CONFLICT DETECTION  (exact prompt as specified)
// ─────────────────────────────────────────────
export interface ConflictResult {
  hasConflict: boolean;
  severity?: 'red' | 'amber' | 'blue';
  conflictType?: string;
  explanation?: string;
  suggestedResolution?: string;
  priorDecisionId?: number;
  summary: string;
}

export async function detect_conflict(
  newDecision: string,
  priorDecisions: { id: number; founder_id: string; category: string; summary: string; created_at: string }[]
): Promise<ConflictResult> {
  const priorList = priorDecisions.length
    ? priorDecisions
        .map(
          (d, i) =>
            `[${i + 1}] ID:${d.id} | Founder: ${d.founder_id} | Category: ${d.category} | Date: ${d.created_at}\n    "${d.summary}"`
        )
        .join('\n')
    : 'No prior decisions on record.';

  const prompt = `You are a conflict detection system for a co-founding team. You will be given a new decision logged by one founder and a list of prior decisions from the team's decision log. Your job is to determine if the new decision contradicts, makes stale, or is incompatible with any prior decision.

NEW DECISION:
"${newDecision}"

PRIOR DECISIONS:
${priorList}

INSTRUCTIONS:
1. First, write a 1-2 sentence SUMMARY of the new decision (field: summary).
2. Then determine if any prior decision CONFLICTS with this new decision.
3. A conflict exists if the new decision: contradicts, reverses, makes stale, or is strategically incompatible with a prior decision.
4. If a conflict is found, respond with JSON. If not, still respond with JSON but set hasConflict to false.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "<1-2 sentence plain-English summary of the new decision>",
  "hasConflict": true or false,
  "severity": "red" | "amber" | "blue" | null,
  "conflictType": "<e.g. Direct Contradiction | Strategic Misalignment | Stale Decision>" | null,
  "explanation": "<2-3 sentence explanation of the conflict>" | null,
  "suggestedResolution": "<Actionable 1-2 sentence resolution suggestion>" | null,
  "priorDecisionId": <ID number from prior list, or null>
}

Severity guide: red = direct contradiction, amber = strategic misalignment, blue = potentially stale.`;

  const raw = await callGemini(prompt);
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try {
    return JSON.parse(cleaned) as ConflictResult;
  } catch {
    // Fallback: no conflict, just return extracted summary
    const summaryMatch = cleaned.match(/"summary"\s*:\s*"([^"]+)"/);
    return { hasConflict: false, summary: summaryMatch?.[1] ?? newDecision.slice(0, 120) };
  }
}

// ─────────────────────────────────────────────
// DAILY BRIEFING  (exact prompt as specified)
// ─────────────────────────────────────────────
export interface BriefingTask {
  priority: 'red' | 'amber' | 'green' | 'blue';
  title: string;
  context: string;
  action: string;
}

export async function generate_daily_briefing(
  founderName: string,
  recentDecisions: { category: string; summary: string; created_at: string }[],
  openConflicts: { conflictType: string; explanation: string; severity: string }[]
): Promise<BriefingTask[]> {
  const decisionList = recentDecisions.length
    ? recentDecisions.map((d) => `- [${d.category}] ${d.summary} (${d.created_at})`).join('\n')
    : 'No recent decisions logged.';

  const conflictList = openConflicts.length
    ? openConflicts.map((c) => `- [${c.severity.toUpperCase()}] ${c.conflictType}: ${c.explanation}`).join('\n')
    : 'No open conflicts.';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `You are a co-founder assistant. Generate a ranked daily task list for a founder based on the inputs below. Each task must be actionable, specific, and time-relevant.

FOUNDER: ${founderName}
DATE: ${today}

RECENT DECISIONS (last 7 days):
${decisionList}

OPEN CONFLICTS:
${conflictList}

INSTRUCTIONS:
Generate 4–6 prioritised tasks for ${founderName} today.
Each task must have:
- priority: "red" (critical), "amber" (high), "green" (normal), or "blue" (informational)
- title: short action-oriented title (max 8 words)
- context: one sentence of context/reason
- action: the button label (2-4 words, e.g. "Resolve Now", "Schedule Meeting", "Review Decision")

Respond ONLY with valid JSON array:
[
  { "priority": "red", "title": "...", "context": "...", "action": "..." },
  ...
]`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try {
    return JSON.parse(cleaned) as BriefingTask[];
  } catch {
    return [
      { priority: 'blue', title: 'Review recent team decisions', context: 'Stay aligned on the latest decisions logged by your co-founder.', action: 'View Log' },
      { priority: 'green', title: 'Check open conflict inbox', context: 'Ensure no unresolved conflicts are blocking progress.', action: 'View Conflicts' },
    ];
  }
}

// ─────────────────────────────────────────────
// AUDIO TRANSCRIPTION
// ─────────────────────────────────────────────
export async function transcribe_audio(audioBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Transcribe this audio recording accurately. Return only the transcribed text, no labels, no timestamps, no commentary.' },
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini transcription error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
