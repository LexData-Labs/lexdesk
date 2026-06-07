'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';

const ROLES = [
  { role: 'superadmin', label: 'Super Admin',  permissions: ['Dashboard', 'Employees', 'Attendance', 'Calendar', 'Analytics', 'Leave Approvals', 'AttendDesk', 'Settings'] },
  { role: 'admin',      label: 'Admin',        permissions: ['Dashboard', 'Employees', 'Attendance', 'Calendar', 'Analytics', 'Leave Approvals', 'AttendDesk', 'Settings'] },
  { role: 'employee',   label: 'Employee',     permissions: ['My Attendance', 'My Leave', 'Settings'] },
];

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', employee: 'Employee' };

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [defaultPassword, setDefaultPassword] = useState('changeme123');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [listError, setListError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', role: '', employeeId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setListError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(data.users || []);
      if (data.defaultPassword) setDefaultPassword(data.defaultPassword);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    let current = null;
    try {
      current = JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      router.push('/');
      return;
    }
    if (!current) { router.push('/'); return; }
    setUser(current);
    // Only admins/superadmins load the account list (GET /api/users is role-gated).
    if (current.role === 'admin' || current.role === 'superadmin') fetchUsers();
    else setLoadingUsers(false);
  }, [router, fetchUsers]);

  if (!user) return null;

  const isSuper = user.role === 'superadmin';
  const isAdmin = user.role === 'admin';
  const isManager = isSuper || isAdmin;
  const creatableRoles = isSuper ? ['admin', 'employee'] : isAdmin ? ['employee'] : [];
  const canManage = creatableRoles.length > 0;

  const canRemove = (target) => {
    if (String(user.id) === String(target.id)) return false;
    if (target.role === 'superadmin') return false;
    if (isSuper) return target.role === 'admin' || target.role === 'employee';
    if (isAdmin) return target.role === 'employee';
    return false;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    const role = form.role || creatableRoles[0];
    if (!form.name.trim() || !form.email.trim() || !role) {
      setFormError('Name, email and role are required.');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          role,
          employeeId: role === 'employee' ? form.employeeId.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');
      setForm({ name: '', email: '', role: '', employeeId: '' });
      await fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (target) => {
    if (!window.confirm(`Remove ${target.name} (${target.email})? They will no longer be able to sign in.`)) return;
    setListError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove user');
      await fetchUsers();
    } catch (err) {
      setListError(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pw.current || !pw.next) { setPwError('Enter your current and new password.'); return; }
    if (pw.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('New password and confirmation do not match.'); return; }
    setPwBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPw({ current: '', next: '', confirm: '' });
      setPwSuccess('Password changed.');
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
    }
  };

  const selectedRole = form.role || creatableRoles[0] || '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Roles, permissions, and configuration" />

      {/* Change Password — every signed-in user can change their own */}
      <div className="card max-w-xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg">Change Password</h3>
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-5">
          Updates your AttendDesk sign-in password (web, mobile, and kiosk).
        </p>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Current password</label>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">New password</label>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Confirm new password</label>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Use at least 8 characters.</p>
          {pwError && <p className="text-sm text-[var(--color-red)]">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-[var(--color-green)]">{pwSuccess}</p>}
          <div>
            <button type="submit" disabled={pwBusy} className="btn-primary py-2 px-5 text-sm disabled:opacity-60">
              {pwBusy ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Manage Users — admin / superadmin only */}
      {isManager && (
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-lg">Manage Users</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{users.length} account{users.length === 1 ? '' : 's'}</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            {isSuper && 'You can add or remove admins and employees.'}
            {isAdmin && 'You can add or remove employees.'}
          </p>

          {/* Add user form */}
          {canManage && (
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
              />
              {creatableRoles.length > 1 ? (
                <select
                  value={selectedRole}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
                >
                  {creatableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              ) : (
                <div className="flex items-center px-3 py-2 text-sm text-[var(--color-text-muted)] border border-dashed border-[var(--color-card-border)] rounded-lg">
                  Role: {ROLE_LABEL[selectedRole]}
                </div>
              )}
              {selectedRole === 'employee' ? (
                <input
                  type="text"
                  placeholder="Employee ID (optional)"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
                />
              ) : <div className="hidden lg:block" />}
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
                <button type="submit" disabled={submitting} className="btn-primary py-2 px-4 text-sm disabled:opacity-60">
                  {submitting ? 'Adding…' : 'Add User'}
                </button>
                <span className="text-xs text-[var(--color-text-muted)]">
                  New accounts sign in with the default password <code className="text-[var(--color-purple)]">{defaultPassword}</code> — share it and ask them to change it.
                </span>
              </div>
              {formError && <p className="sm:col-span-2 lg:col-span-4 text-xs text-[var(--color-red)]">{formError}</p>}
            </form>
          )}

          {/* User list */}
          {listError && <p className="text-xs text-[var(--color-red)] mb-3">{listError}</p>}
          {loadingUsers ? (
            <div className="text-sm text-[var(--color-text-muted)]">Loading users…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 px-3 font-medium">Role</th>
                    <th className="py-2 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-[var(--color-card-border)]">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar image={null} initials={u.avatar} className="w-9 h-9 text-xs font-semibold text-white shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--color-text-main)] truncate">{u.name}</div>
                            <div className="text-xs text-[var(--color-text-muted)] truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 text-xs rounded bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)]">{ROLE_LABEL[u.role] || u.role}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canRemove(u) ? (
                          <button
                            onClick={() => handleRemove(u)}
                            className="btn-outline py-1 px-3 text-xs text-[var(--color-red)] border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.05)]"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">{String(user.id) === String(u.id) ? 'You' : '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Roles & permissions reference — admin / superadmin only */}
      {isManager && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Roles &amp; Permissions</h3>
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
      )}
    </div>
  );
}
