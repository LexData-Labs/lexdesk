'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';

const ROLES = [
  { role: 'superadmin', label: 'Super Admin',  permissions: ['Dashboard', 'Employees', 'Attendance', 'Calendar', 'Analytics', 'Profile', 'Settings'] },
  { role: 'admin',      label: 'Admin',        permissions: ['Dashboard', 'Employees', 'Attendance', 'Calendar', 'Analytics', 'Profile'] },
  { role: 'employee',   label: 'Employee',     permissions: ['Employees', 'Attendance', 'Calendar', 'Profile'] },
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
    fetchUsers();
  }, [router, fetchUsers]);

  if (!user) return null;

  const isSuper = user.role === 'superadmin';
  const isAdmin = user.role === 'admin';
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

  const selectedRole = form.role || creatableRoles[0] || '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Roles, permissions, and configuration" />

      {/* Manage Users — everyone can view; actions depend on role */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg">Manage Users</h3>
          <span className="text-xs text-[var(--color-text-muted)]">{users.length} account{users.length === 1 ? '' : 's'}</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          {isSuper && 'You can add or remove admins and employees.'}
          {isAdmin && 'You can add or remove employees.'}
          {!canManage && 'You have view-only access to the team list.'}
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

      {/* Roles & permissions reference — visible to everyone */}
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

      {/* Demo accounts — superadmin only */}
      {isSuper && (
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
      )}
    </div>
  );
}
