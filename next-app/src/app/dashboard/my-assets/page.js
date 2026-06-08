'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

const STATUS_BADGE = {
  pending: 'bg-[rgba(234,179,8,0.15)] text-[var(--color-yellow)]',
  approved: 'bg-[rgba(34,197,94,0.15)] text-[var(--color-green)]',
  rejected: 'bg-[rgba(239,68,68,0.15)] text-[var(--color-red)]',
  cancelled: 'bg-[rgba(148,163,184,0.15)] text-[var(--color-text-muted)]',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[status] || STATUS_BADGE.cancelled}`}>
      {status || '—'}
    </span>
  );
}

function fmtDay(d) {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtRange(from, to) {
  if (!from) return '—';
  return from === to ? fmtDay(from) : `${fmtDay(from)} → ${fmtDay(to)}`;
}

const inputCls =
  'bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]';

export default function MyAssetsPage() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assetName: '', assetType: '', description: '', fromDay: '', toDay: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/me/asset', { headers: authHeader(), cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRequests(json.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowForm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForm]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.assetName.trim() || !form.fromDay || !form.toDay) {
      setFormError('Asset name, From and To are required.');
      return;
    }
    if (form.fromDay > form.toDay) {
      setFormError('“From” date must be on or before “To” date.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/me/asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          assetName: form.assetName.trim(),
          assetType: form.assetType.trim(),
          description: form.description.trim(),
          fromDay: form.fromDay,
          toDay: form.toDay,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setShowForm(false);
      setForm({ assetName: '', assetType: '', description: '', fromDay: '', toDay: '' });
      setFeedback('Asset request submitted.');
      setTimeout(() => setFeedback(''), 4000);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const list = requests || [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Assets"
        subtitle="Apply for an asset — approved by your team lead and an admin"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowForm(true); setFormError(''); }} className="btn-primary py-2 px-4 text-sm">+ Apply for asset</button>
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {feedback && <div className="card text-[var(--color-green)] text-sm">{feedback}</div>}
      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Apply for asset</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-lg leading-none" aria-label="Close">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Asset name</label>
                <input type="text" maxLength={120} value={form.assetName} onChange={set('assetName')} placeholder="e.g. MacBook Pro 14" className={inputCls} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Type</label>
                <input type="text" maxLength={60} value={form.assetType} onChange={set('assetType')} placeholder="e.g. Laptop" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">From</label>
                <input type="date" value={form.fromDay} onChange={set('fromDay')} className={inputCls} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
                <input type="date" value={form.toDay} onChange={set('toDay')} className={inputCls} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Description (optional)</label>
              <textarea rows={3} maxLength={2000} value={form.description} onChange={set('description')} className={`${inputCls} resize-y`} placeholder="Why you need it / any specifics" />
            </div>
            {formError && <p className="text-sm text-[var(--color-red)]">{formError}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline py-2 px-4 text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit request'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider border-b border-[var(--color-card-border)] bg-white/[0.02]">
                <th className="py-3 px-5 font-medium">Asset</th>
                <th className="py-3 px-5 font-medium">Type</th>
                <th className="py-3 px-5 font-medium">Dates</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5 font-medium">Approvals</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.03] align-top">
                  <td className="py-3.5 px-5 text-[var(--color-text-main)] font-medium">
                    {r.assetName || '—'}
                    {r.description && <div className="text-xs text-[var(--color-text-muted)] max-w-[240px]">{r.description}</div>}
                  </td>
                  <td className="py-3.5 px-5 text-[var(--color-text-muted)]">{r.assetType || '—'}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-main)] whitespace-nowrap">{fmtRange(r.fromDay, r.toDay)}</td>
                  <td className="py-3.5 px-5"><StatusPill status={r.status} /></td>
                  <td className="py-3.5 px-5 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    Lead: <span className="capitalize text-[var(--color-text-main)]">{r.requiresLead ? r.leadStatus : 'n/a'}</span>
                    {' · '}Admin: <span className="capitalize text-[var(--color-text-main)]">{r.adminStatus}</span>
                  </td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-[var(--color-text-muted)]">No asset requests yet.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={5} className="py-12 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
