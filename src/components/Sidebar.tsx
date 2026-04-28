'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User { name: string; role: string; email: string; }

const navItems = [
  { href: '/dashboard', label: 'Dashboard',     icon: '⚡' },
  { href: '/log',       label: 'Log Decision',  icon: '✏️' },
  { href: '/conflicts', label: 'Conflict Inbox', icon: '⚠️' },
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
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
        {user ? (
          <>
            <div className="sidebar-user-info">
              <div className="sidebar-avatar">{initials(user.name)}</div>
              <div>
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : '↩ Sign Out'}
            </button>
          </>
        ) : (
          <div style={{ height: 60, background: 'var(--bg-card)', borderRadius: 8, opacity: 0.4 }} />
        )}
      </div>
    </nav>
  );
}
