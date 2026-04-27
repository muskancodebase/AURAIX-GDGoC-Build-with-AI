'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BriefingTask {
  priority: 'red' | 'amber' | 'green' | 'blue';
  title: string;
  context: string;
  action: string;
}

const priorityLabels: Record<string, string> = {
  red: 'Critical',
  amber: 'High',
  green: 'Normal',
  blue: 'Info',
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<BriefingTask[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const founder = localStorage.getItem('syncguard_founder') || 'Alice (CEO)';
    fetch(`/api/briefing?founder=${encodeURIComponent(founder)}`)
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setConflictCount(data.conflictCount || 0);
      })
      .catch(() => {
        setTasks([
          { priority: 'blue', title: 'Welcome to SyncGuard', context: 'Log your first decision to get started.', action: 'Log Decision' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Daily Briefing</h1>
        <p className="page-subtitle">Your AI-generated priority tasks for today</p>
      </div>

      <div className="section-label">Today&apos;s Tasks</div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, justifyContent: 'center' }}>
          <span className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating your briefing…</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No tasks yet</div>
          <div className="empty-state-text">Log some decisions to generate your daily briefing.</div>
        </div>
      ) : (
        <div className="priority-grid">
          {tasks.map((task, i) => (
            <div key={i} className={`priority-card ${task.priority}`}>
              <div className={`priority-badge ${task.priority}`}>
                {task.priority === 'red' && '🔴'}
                {task.priority === 'amber' && '🟠'}
                {task.priority === 'green' && '🟢'}
                {task.priority === 'blue' && '🔵'}
                {' '}{priorityLabels[task.priority]}
              </div>
              <div className="priority-card-title">{task.title}</div>
              <div className="priority-card-context">{task.context}</div>
              <button className={`priority-card-action ${task.priority}`}>{task.action}</button>
            </div>
          ))}
        </div>
      )}

      <div className="glow-divider" />

      <div className="section-label">Conflict Status</div>

      <Link href="/conflicts" style={{ textDecoration: 'none' }}>
        <div className="conflicts-summary">
          <div className="conflict-count-badge">{conflictCount}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
              Active Conflict{conflictCount !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {conflictCount > 0
                ? 'Click to review and resolve decision conflicts.'
                : 'No open conflicts — your team is in sync! 🎉'}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
