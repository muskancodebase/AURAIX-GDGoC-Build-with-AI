'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CATEGORIES = ['All', 'Product', 'Investor', 'Customer', 'Finance', 'Other'];

const CATEGORY_COLOR: Record<string, string> = {
  Product: 'blue',
  Investor: 'amber',
  Customer: 'green',
  Finance: 'red',
  Other: 'blue',
};

interface Decision {
  id: number;
  founder_id: string;
  category: string;
  summary: string;
  content: string;
  created_at: string;
}

export default function HistoryPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/decisions')
      .then((r) => r.json())
      .then((data) => setDecisions(data.decisions || []))
      .catch(() => setDecisions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? decisions : decisions.filter((d) => d.category === filter);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return d; }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Decision History</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${decisions.length} decision${decisions.length !== 1 ? 's' : ''} logged by your team`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 150 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Link href="/log" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + Log Decision
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, justifyContent: 'center' }}>
          <span className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading decisions…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No decisions yet</div>
          <div className="empty-state-text">
            {filter === 'All'
              ? 'Log your first decision to start building your team\'s history.'
              : `No ${filter} decisions logged yet.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((d) => {
            const color = CATEGORY_COLOR[d.category] || 'blue';
            const isOpen = expanded === d.id;
            return (
              <div key={d.id} className="conflict-card" style={{ marginBottom: 0, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : d.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span className={`severity-badge ${color}`}>{d.category}</span>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{d.founder_id}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {formatDate(d.created_at)}
                  </span>
                </div>

                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                  {d.summary || d.content.slice(0, 140)}
                </div>

                {isOpen && d.content && d.content !== d.summary && (
                  <div style={{
                    marginTop: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    {d.content}
                  </div>
                )}

                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  {isOpen ? '▲ collapse' : '▼ view full decision'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
