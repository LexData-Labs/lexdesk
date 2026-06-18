'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import MonthNav from '@/components/MonthNav';
import { leaveOverlapsMonth } from '@/lib/attend';

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

const ICONS = {
  total: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  ),
  approved: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  ),
  pending: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
};

export default function MyLeavePage() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const [showForm, setShowForm] = useState(false);
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/leave', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRequests(json.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Close the modal on Escape.
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowForm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForm]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!fromDay || !toDay || !subject.trim()) {
      setFormError('From, To and Subject are required.');
      return;
    }
    if (fromDay > toDay) {
      setFormError('“From” date must be on or before “To” date.');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromDay, toDay, subject: subject.trim(), details: details.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setShowForm(false);
      setFromDay('');
      setToDay('');
      setSubject('');
      setDetails('');
      setFeedback('Leave request submitted.');
      setTimeout(() => setFeedback(''), 4000);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const list = useMemo(
    () => (requests || []).filter((r) => leaveOverlapsMonth(r, ym.y, ym.m)),
    [requests, ym],
  );
  const approved = list.filter((r) => r.status === 'approved').length;
  const pending = list.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Leave"
        subtitle="Your leave requests from AttendDesk"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            <button onClick={() => { setShowForm(true); setFormError(''); }} className="btn-primary py-2 px-4 text-sm">
              + Request leave
            </button>
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {feedback && <div className="card text-[var(--color-green)] text-sm">{feedback}</div>}
      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="card glossy w-full max-w-lg flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Request leave</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">From</label>
                <input type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} className={inputCls} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
                <input type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} className={inputCls} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Subject</label>
              <input type="text" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Sick leave" className={inputCls} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Details (optional)</label>
              <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className={`${inputCls} resize-y`} />
            </div>
            {formError && <p className="text-sm text-[var(--color-red)]">{formError}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline py-2 px-4 text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total requests" value={list.length} color="purple" icon={ICONS.total} />
        <KpiCard label="Approved" value={approved} color="green" icon={ICONS.approved} />
        <KpiCard label="Pending" value={pending} color="yellow" icon={ICONS.pending} />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider border-b border-[var(--color-card-border)] bg-white/[0.02]">
                <th className="py-3 px-5 font-medium">Dates</th>
                <th className="py-3 px-5 font-medium text-center">Days</th>
                <th className="py-3 px-5 font-medium">Subject</th>
                <th className="py-3 px-5 font-medium">Details</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5 font-medium">Decision note</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.03] transition-colors align-top">
                  <td className="py-3.5 px-5 text-[var(--color-text-main)] font-medium whitespace-nowrap">{fmtRange(r.fromDay, r.toDay)}</td>
                  <td className="py-3.5 px-5 text-center">
                    <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-md bg-white/[0.05] text-[var(--color-text-main)] text-xs">{r.totalDays ?? '—'}</span>
                  </td>
                  <td className="py-3.5 px-5 text-[var(--color-text-main)]">{r.subject || '—'}</td>
                  <td className="py-3.5 px-5 text-[var(--color-text-muted)] max-w-[280px] truncate" title={r.details || ''}>{r.details || '—'}</td>
                  <td className="py-3.5 px-5"><StatusPill status={r.status} /></td>
                  <td className="py-3.5 px-5 text-[var(--color-text-muted)] text-xs max-w-[220px]">{r.decisionNote || '—'}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">No leave requests for this month.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
