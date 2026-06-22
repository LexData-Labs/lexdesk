'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';

const STATUS_BADGE = {
  pending: 'bg-[rgba(234,179,8,0.15)] text-[var(--color-yellow)]',
  approved: 'bg-[rgba(34,197,94,0.15)] text-[var(--color-green)]',
  rejected: 'bg-[rgba(239,68,68,0.15)] text-[var(--color-red)]',
  cancelled: 'bg-[rgba(148,163,184,0.15)] text-[var(--color-text-muted)]',
};
const StatusPill = ({ status }) => (
  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[status] || STATUS_BADGE.cancelled}`}>{status || '—'}</span>
);
const inputCls = 'bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]';
const fmtDay = (d) => { if (!d) return '—'; const dt = new Date(`${d}T00:00:00`); return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };

export default function MyClaimsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/claim', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows(json.requests || []);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const amt = Number(amount);
    if (!subject.trim() || !Number.isFinite(amt) || amt < 0 || !day) { setFormError('Subject, a valid amount and date are required.'); return; }
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim(), category: category.trim(), amount: amt, currency: 'BDT', day, details: details.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setShowForm(false); setSubject(''); setCategory(''); setAmount(''); setDay(''); setDetails('');
      await load();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  const cancel = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/me/claim/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await load();
  };

  const list = rows || [];
  const approved = list.filter((r) => r.status === 'approved').length;
  const pending = list.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Claims" subtitle="Submit and track expense claims" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowForm(true); setFormError(''); }} className="btn-primary py-2 px-4 text-sm">+ New claim</button>
          <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
        </div>
      } />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg flex flex-col gap-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">New claim</h2>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-[var(--color-text-muted)]">Subject</label><input value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} className={inputCls} required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-[var(--color-text-muted)]">Category</label><input value={category} maxLength={60} onChange={(e) => setCategory(e.target.value)} placeholder="Travel" className={inputCls} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-[var(--color-text-muted)]">Amount (BDT)</label><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} required /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-[var(--color-text-muted)]">Date</label><input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} required /></div>
            </div>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-[var(--color-text-muted)]">Details (optional)</label><textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className={`${inputCls} resize-y`} /></div>
            {formError && <p className="text-sm text-[var(--color-red)]">{formError}</p>}
            <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="btn-outline py-2 px-4 text-sm">Cancel</button><button type="submit" disabled={busy} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">{busy ? 'Submitting…' : 'Submit'}</button></div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total claims" value={list.length} color="purple" />
        <KpiCard label="Approved" value={approved} color="green" />
        <KpiCard label="Pending" value={pending} color="yellow" />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider border-b border-[var(--color-card-border)]">
              <th className="py-3 px-5 font-medium">Date</th><th className="py-3 px-5 font-medium">Subject</th><th className="py-3 px-5 font-medium">Category</th><th className="py-3 px-5 font-medium">Amount</th><th className="py-3 px-5 font-medium">Status</th><th className="py-3 px-5 font-medium"></th>
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-card-border)] align-top">
                  <td className="py-3.5 px-5 whitespace-nowrap text-[var(--color-text-main)]">{fmtDay(r.day)}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-main)]">{r.subject || '—'}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-muted)]">{r.category || '—'}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-main)]">{r.currency} {r.amount}</td>
                  <td className="py-3.5 px-5"><StatusPill status={r.status} /></td>
                  <td className="py-3.5 px-5">{r.status === 'pending' && <button onClick={() => cancel(r.id)} className="text-xs text-[var(--color-red)] hover:underline">Cancel</button>}</td>
                </tr>
              ))}
              {rows && list.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">No claims yet.</td></tr>}
              {!rows && <tr><td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
