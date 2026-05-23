'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarNav from '@/components/SidebarNav';
import { SheetsProvider } from '@/lib/SheetsContext';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!storedToken || !storedUser) {
      router.push('/');
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch {
      router.push('/');
    }
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">Loading…</div>;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <SheetsProvider>
      <div className="grid grid-cols-[260px_1fr] h-screen bg-[var(--color-bg)]">
        <aside className="bg-[var(--color-bg)] border-r border-[var(--color-card-border)] flex flex-col">
          <Link href="/dashboard" className="p-6 flex items-center gap-3 text-xl font-bold text-[var(--color-text-main)] no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-sm">A</div>
            Attendance Pro
          </Link>

          <SidebarNav role={user.role} />

          <div className="p-6 border-t border-[var(--color-card-border)] flex flex-col items-start">
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] flex items-center justify-center font-semibold text-[0.85rem]">
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-semibold text-white truncate">{user.name}</div>
                <div className="text-[0.75rem] text-[var(--color-text-muted)] truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-outline w-full mt-4 py-1.5 text-xs text-[var(--color-red)] border-[rgba(239,68,68,0.3)]"
            >
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex flex-col bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.05),transparent_50%)] overflow-hidden">
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </SheetsProvider>
  );
}
