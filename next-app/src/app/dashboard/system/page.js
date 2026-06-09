'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';

export default function SystemConsolePage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Reset flow state
  const [target, setTarget] = useState(null); // { orgId, orgName, email }
  const [busy, setBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const [result, setResult] = useState(null); // { email, temporaryPassword }
  const [copied, setCopied] = useState(false);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/system/organizations', { headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        return j;
      })
      .then((j) => setOrgs(j.organizations || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Flatten to one row per (org, admin) for the table + search.
  const rows = useMemo(() => {
    const out = [];
    for (const o of orgs) {
      const admins = o.admins && o.admins.length ? o.admins : [{ uid: null, email: null }];
      for (const a of admins) out.push({ orgId: o.orgId, orgName: o.name || o.domain || o.orgId, domain: o.domain, createdAt: o.createdAt, email: a.email });
    }
    const q = search.trim().toLowerCase();
    if (!q) return out;
    return out.filter((r) => (r.orgName || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q) || (r.domain || '').toLowerCase().includes(q));
  }, [orgs, search]);

  const openReset = (row) => {
    setTarget({ orgId: row.orgId, orgName: row.orgName, email: row.email });
    setResetError('');
    setResult(null);
    setCopied(false);
  };

  const confirmReset = async () => {
    if (!target?.email) return;
    setBusy(true);
    setResetError('');
    try {
      const res = await fetch('/api/system/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ orgId: target.orgId, email: target.email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setResult({ email: j.email || target.email, temporaryPassword: j.temporaryPassword });
    } catch (e) {
      setResetError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyPw = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  const close = () => setTarget(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="System Console"
        subtitle="Reset organization admin passwords"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search org or admin…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-auto bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
            />
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider border-b border-[var(--color-card-border)]">
                <th className="py-3 px-5 font-medium">Organization</th>
                <th className="py-3 px-5 font-medium">Domain</th>
                <th className="py-3 px-5 font-medium">Admin</th>
                <th className="py-3 px-5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.orgId}-${r.email || i}`} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.03]">
                  <td className="py-3.5 px-5 text-[var(--color-text-main)] font-medium">{r.orgName}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-muted)]">{r.domain || '—'}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-main)]">{r.email || <span className="text-[var(--color-text-muted)]">no admin</span>}</td>
                  <td className="py-3.5 px-5 text-right">
                    {r.email ? (
                      <button
                        onClick={() => openReset(r)}
                        className="btn-outline py-1.5 px-3 text-xs text-[var(--color-purple)] border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.05)]"
                      >
                        Reset password
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">{search ? 'No matches.' : 'No organizations yet.'}</td></tr>
              )}
              {loading && (
                <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset modal */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={close}>
          <div className="card w-full max-w-sm sm:max-w-md flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {result ? (
              <>
                <h3 className="font-semibold text-lg text-[var(--color-text-main)]">Password reset</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Share this temporary password with <span className="text-[var(--color-text-main)]">{result.email}</span>. They should change it after signing in (My Profile → Change Password).
                </p>
                <div className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-3 flex items-center justify-between gap-3">
                  <code className="font-mono text-sm text-[var(--color-text-main)] break-all">{result.temporaryPassword}</code>
                  <button onClick={copyPw} className="btn-outline py-1 px-2.5 text-xs shrink-0">{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={close} className="btn-primary py-2 px-5 text-sm">Done</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg text-[var(--color-text-main)]">Reset admin password?</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  This generates a new temporary password for <span className="text-[var(--color-text-main)]">{target.email}</span> (admin of <span className="text-[var(--color-text-main)]">{target.orgName}</span>) and signs them out of all sessions.
                </p>
                {resetError && <div className="text-sm text-[var(--color-red)]">{resetError}</div>}
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={close} disabled={busy} className="btn-outline py-2 px-4 text-sm">Cancel</button>
                  <button onClick={confirmReset} disabled={busy} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">
                    {busy ? 'Resetting…' : 'Reset password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
