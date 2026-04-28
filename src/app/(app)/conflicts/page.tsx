'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConflictItem {
  id: number;
  severity: string;
  conflict_type: string;
  explanation: string;
  suggested_resolution: string;
  da_founder: string;
  da_summary: string;
  da_date: string;
  db_founder: string;
  db_summary: string;
  db_date: string;
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [taskLoading, setTaskLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await fetch('/api/conflicts');
      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch {
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  const handleAction = async (id: number, action: 'resolve' | 'override') => {
    setActionLoading(id);
    try {
      await fetch('/api/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      showToast(action === 'resolve' ? 'Conflict marked as resolved' : 'Overridden with newer decision', 'success');
      fetchConflicts();
    } catch {
      showToast('Error updating conflict', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTask = async (c: ConflictItem) => {
    setTaskLoading(c.id);
    const taskContent = `TASK from conflict #${c.id}: ${c.conflict_type}\n\nDecision A (${c.da_founder}): ${c.da_summary}\nDecision B (${c.db_founder}): ${c.db_summary}\n\nSuggested resolution: ${c.suggested_resolution}`;

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: taskContent, category: 'Other' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Task logged to decision log', 'success');
      } else {
        showToast('Failed to create task', 'error');
      }
    } catch {
      showToast('Error creating task', 'error');
    } finally {
      setTaskLoading(null);
    }
  };

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Conflict Inbox</h1>
        <p className="page-subtitle">
          {conflicts.length} open conflict{conflicts.length !== 1 ? 's' : ''} — sorted by severity
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, justifyContent: 'center' }}>
          <span className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading conflicts…</span>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <div className="empty-state-title">No open conflicts</div>
          <div className="empty-state-text">Your team is in sync! All decisions are aligned.</div>
        </div>
      ) : (
        conflicts.map((c) => (
          <div key={c.id} className="conflict-card">
            <div className="conflict-card-header">
              <span className={`severity-badge ${c.severity}`}>
                {c.severity === 'red' && '🔴 Critical'}
                {c.severity === 'amber' && '🟠 High'}
                {c.severity === 'blue' && '🔵 Info'}
              </span>
              <span className="conflict-type-label">{c.conflict_type}</span>
            </div>

            <div className="decision-pair">
              <div className="decision-box">
                <div className="decision-box-label">Decision A</div>
                <div className="decision-box-meta">{c.da_founder} · {formatDate(c.da_date)}</div>
                <div className="decision-box-text">{c.da_summary}</div>
              </div>
              <div className="decision-box">
                <div className="decision-box-label">Decision B</div>
                <div className="decision-box-meta">{c.db_founder} · {formatDate(c.db_date)}</div>
                <div className="decision-box-text">{c.db_summary}</div>
              </div>
            </div>

            <div className="ai-explanation">
              <div className="ai-explanation-label">🤖 AI Explanation</div>
              <div className="ai-explanation-text">{c.explanation}</div>
            </div>

            <div className="ai-resolution">
              <div className="ai-resolution-label">💡 Suggested Resolution</div>
              <div className="ai-resolution-text">{c.suggested_resolution}</div>
            </div>

            <div className="conflict-actions">
              <button
                className="btn btn-success"
                onClick={() => handleAction(c.id, 'resolve')}
                disabled={actionLoading === c.id || taskLoading === c.id}
              >
                {actionLoading === c.id ? <span className="spinner" /> : '✅'} Mark Resolved
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => handleAction(c.id, 'override')}
                disabled={actionLoading === c.id || taskLoading === c.id}
              >
                ⏩ Override with newer
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => handleCreateTask(c)}
                disabled={taskLoading === c.id || actionLoading === c.id}
              >
                {taskLoading === c.id ? <span className="spinner" /> : '📝'} Create Task
              </button>
            </div>
          </div>
        ))
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
