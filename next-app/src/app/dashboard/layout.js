'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarNav from '@/components/SidebarNav';
import Avatar from '@/components/Avatar';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [photoUrl, setPhotoUrl] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!storedToken || !storedUser) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      // Redirect employee to their allowed landing page
      if (parsed.role === 'employee') {
        const path = window.location.pathname;
        const allowed = ['/dashboard/my-attendance', '/dashboard/my-leave', '/dashboard/profile', '/dashboard/settings'];
        if (!allowed.includes(path)) {
          router.replace('/dashboard/my-attendance');
        }
      }
    } catch {
      router.push('/');
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [router]);

  // Refresh the sidebar's copy of the user when the profile page saves changes,
  // and load the AttendDesk profile photo (fresh signed URL) for the sidebar avatar.
  useEffect(() => {
    const loadPhoto = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.profile) setPhotoUrl(d.profile.photoUrl || null); })
        .catch(() => {});
    };
    const refresh = () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } catch {}
      loadPhoto();
    };
    loadPhoto();
    window.addEventListener('user-updated', refresh);
    return () => window.removeEventListener('user-updated', refresh);
  }, []);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">Loading…</div>;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div className="grid grid-cols-[260px_1fr] h-screen bg-[var(--color-bg)]">
        <aside className="bg-[var(--color-bg)] border-r border-[var(--color-card-border)] flex flex-col">
          <Link href={user.role === 'employee' ? '/dashboard/my-attendance' : '/dashboard'} className="p-6 flex items-center gap-3 text-xl font-bold text-[var(--color-text-main)] no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-sm text-white">A</div>
            Attendance Pro
          </Link>

          <SidebarNav role={user.role} />

          <div className="p-6 border-t border-[var(--color-card-border)] flex flex-col items-start">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 w-full rounded-lg p-2 -m-2 no-underline transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <Avatar
                image={photoUrl || user.avatarImage}
                initials={user.avatar}
                alt={user.name}
                className="w-9 h-9 font-semibold text-[0.85rem] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-semibold text-[var(--color-text-main)] truncate">{user.name}</div>
                <div className="text-[0.75rem] text-[var(--color-text-muted)] truncate">{user.email}</div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="btn-outline w-full mt-3 py-1.5 text-xs text-[var(--color-red)] border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.05)]"
            >
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex flex-col flex-1 bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.05),transparent_50%)] overflow-hidden relative">
          
          {/* Top Right Theme Toggle */}
          <div className="absolute top-6 right-8 z-50">
            <div className="bg-white dark:bg-[#1a1f2e] p-1 rounded-full flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-800">
              <button
                onClick={() => toggleTheme('light')}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  theme === 'light' 
                    ? 'bg-[#0052FF] text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              </button>
              <button
                onClick={() => toggleTheme('dark')}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  theme === 'dark' 
                    ? 'bg-[#0052FF] text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 pt-20">
            {children}
          </div>
        </main>
      </div>
  );
}
