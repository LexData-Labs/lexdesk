'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

const inputCls =
  'bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [name, setName] = useState('');
  const [leaderUid, setLeaderUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, eRes] = await Promise.all([
        fetch('/api/teams', { headers: authHeader(), cache: 'no-store' }),
        fetch('/api/attenddesk?resource=employees', { headers: authHeader(), cache: 'no-store' }),
      ]);
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error || `HTTP ${tRes.status}`);
      setTeams(tJson.teams || []);
      const eJson = await eRes.json();
      if (eRes.ok) setEmployees(eJson.employees || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const memberCount = (teamId) => employees.filter((e) => e.teamId === teamId).length;

  const add = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Team name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name: name.trim(), leaderUid: leaderUid || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setName('');
      setLeaderUid('');
      setFeedback('Team created.');
      setTimeout(() => setFeedback(''), 3000);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeLeader = async (teamId, uid) => {
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ leaderUid: uid || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (teamId) => {
    if (!window.confirm('Delete this team? Members keep their records but lose the team label.')) return;
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE', headers: authHeader() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        subtitle="Create teams, assign a team leader, and group your employees"
        actions={<button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {feedback && <div className="card text-[var(--color-green)] text-sm">{feedback}</div>}
      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Team name</label>
          <input type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" className={inputCls} required />
        </div>
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Team leader (optional)</label>
          <select value={leaderUid} onChange={(e) => setLeaderUid(e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name || e.email}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">
          {saving ? 'Creating…' : 'Create team'}
        </button>
      </form>
      {formError && <div className="text-sm text-[var(--color-red)] -mt-3">{formError}</div>}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider border-b border-[var(--color-card-border)]">
                <th className="py-3 px-5 font-medium">Team</th>
                <th className="py-3 px-5 font-medium">Leader</th>
                <th className="py-3 px-5 font-medium text-center">Members</th>
                <th className="py-3 px-5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.03] align-middle">
                  <td className="py-3.5 px-5 text-[var(--color-text-main)] font-medium">{t.name}</td>
                  <td className="py-3.5 px-5">
                    <select
                      value={t.leaderUid || ''}
                      onChange={(e) => changeLeader(t.id, e.target.value)}
                      className={`${inputCls} py-1.5`}
                    >
                      <option value="">— none —</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.name || e.email}</option>)}
                    </select>
                  </td>
                  <td className="py-3.5 px-5 text-center text-[var(--color-text-main)]">{memberCount(t.id)}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button onClick={() => remove(t.id)} className="btn-outline py-1 px-3 text-xs text-[var(--color-red)]">Delete</button>
                  </td>
                </tr>
              ))}
              {!loading && teams.length === 0 && (
                <tr><td colSpan={4} className="py-12 text-center text-[var(--color-text-muted)]">No teams yet. Create one above.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={4} className="py-12 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
