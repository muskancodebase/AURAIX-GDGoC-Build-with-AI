'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const FOUNDERS = ['Alice (CEO)', 'Bob (CTO)'];

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/log',       label: 'Log Decision', icon: '✏️' },
  { href: '/conflicts', label: 'Conflict Inbox', icon: '⚠️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [founder, setFounder] = useState('Alice (CEO)');

  useEffect(() => {
    const stored = localStorage.getItem('syncguard_founder');
    if (stored) setFounder(stored);
  }, []);

  const handleFounderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFounder(e.target.value);
    localStorage.setItem('syncguard_founder', e.target.value);
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛡️</div>
        <span className="sidebar-logo-text">SyncGuard</span>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-founder">
        <label>Active Founder</label>
        <select value={founder} onChange={handleFounderChange}>
          {FOUNDERS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
    </nav>
  );
}
