'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User { name: string; role: string; email: string; }

const navItems = [
  { href: '/dashboard', label: 'Dashboard',     icon: '⚡' },
  { href: '/history',   label: 'History',       icon: '🕐' },
  { href: '/log',       label: 'Log Decision',  icon: '✏️' },
  { href: '/conflicts', label: 'Conflict Inbox', icon: '⚠️' },
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // null = loading, false = not authenticated, User = signed in
  const [user, setUser] = useState<User | null | false>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user || false))
      .catch(() => setUser(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/auth');
    }
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

      <div className="sidebar-user">
        <div className="sidebar-session-label">Active Session</div>

        {user === null ? (
          <div className="sidebar-skeleton">
            <div className="skeleton-line" style={{ width: '75%', height: 13, marginBottom: 8 }} />
            <div className="skeleton-line" style={{ width: '50%', height: 10 }} />
          </div>
        ) : user === false ? (
          <div className="sidebar-not-signed-in">
            <div className="sidebar-not-signed-in-title">Not signed in</div>
            <div className="sidebar-not-signed-in-sub">Go to auth to continue</div>
            <Link href="/auth" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10, textDecoration: 'none', display: 'flex', fontSize: 13 }}>
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="sidebar-user-info">
              <div className="sidebar-avatar">{initials(user.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : '↩ Sign Out'}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
