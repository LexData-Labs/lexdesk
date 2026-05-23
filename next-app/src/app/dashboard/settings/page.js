'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

const ROLES = [
  { role: 'superadmin', label: 'Super Admin',  permissions: ['Dashboard', 'Employees', 'Attendance', 'Calendar', 'Analytics', 'Profile', 'Settings'] },
  { role: 'admin',      label: 'Admin',        permissions: ['Dashboard', 'Employees', 'Attendance', 'Calendar', 'Analytics', 'Profile'] },
  { role: 'employee',   label: 'Employee',     permissions: ['Employees', 'Attendance', 'Calendar', 'Profile'] },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sheetId, setSheetId] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(stored);
      if (stored?.role !== 'superadmin') router.push('/dashboard');
    } catch {
      router.push('/');
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Roles, permissions, and configuration" />

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Google Sheets Source</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          The data source is configured via environment variables (set in Vercel Project Settings):
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">GOOGLE_SHEET_ID</div>
            <code className="text-white text-xs break-all">{process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '(set on server)'}</code>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">GOOGLE_API_KEY</div>
            <code className="text-white text-xs">(set on server — never exposed to client)</code>
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Update these in Vercel and redeploy to point at a different spreadsheet.
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Roles & Permissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 px-3 font-medium">Allowed modules</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map(r => (
                <tr key={r.role} className="border-t border-[var(--color-card-border)]">
                  <td className="py-3 pr-3"><span className="text-white font-semibold">{r.label}</span><div className="text-xs text-[var(--color-text-muted)]">{r.role}</div></td>
                  <td className="py-3 px-3 flex flex-wrap gap-2">
                    {r.permissions.map(p => (
                      <span key={p} className="px-2 py-1 text-xs rounded bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)]">{p}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Demo Accounts</h3>
        <div className="text-xs text-[var(--color-text-muted)] space-y-1 font-mono">
          <div>superadmin@example.com / admin123</div>
          <div>admin@example.com / admin123</div>
          <div>employee@example.com / user123</div>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Replace these in <code>src/lib/auth.js</code> and rotate bcrypt hashes before going to production.
        </p>
      </div>
    </div>
  );
}
