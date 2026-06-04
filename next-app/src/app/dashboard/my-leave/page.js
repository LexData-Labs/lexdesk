'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

const STATUS_STYLE = {
  pending: 'text-[var(--color-yellow)]',
  approved: 'text-[var(--color-green)]',
  rejected: 'text-[var(--color-red)]',
  cancelled: 'text-[var(--color-text-muted)]',
};

function fmtRange(from, to) {
  if (!from) return '—';
  return from === to ? from : `${from} → ${to}`;
}

const inputCls =
  'bg-black/30 border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]';

export default function MyLeavePage() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // request-leave form
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

  const list = requests || [];
  const approved = list.filter((r) => r.status === 'approved').length;
  const pending = list.filter((r) => r.status === 'pending').length;
  const cards = [
    { label: 'Total requests', value: list.length, color: 'text-[var(--color-text-main)]' },
    { label: 'Approved', value: approved, color: 'text-[var(--color-green)]' },
    { label: 'Pending', value: pending, color: 'text-[var(--color-yellow)]' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Leave"
        subtitle="Your leave requests from AttendDesk"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setShowForm((v) => !v); setFormError(''); }} className="btn-primary py-2 px-4 text-sm">
              {showForm ? 'Close' : '+ Request leave'}
            </button>
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {feedback && <div className="card text-[var(--color-green)] text-sm">{feedback}</div>}
      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--color-text-main)]">Request leave</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">From</label>
              <input type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} className={inputCls} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">To</label>
              <input type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} className={inputCls} required />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Subject</label>
            <input type="text" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Sick leave" className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Details (optional)</label>
            <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className={`${inputCls} resize-y`} />
          </div>
          {formError && <p className="text-sm text-[var(--color-red)]">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary py-2 px-4 text-sm disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline py-2 px-4 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-xs text-[var(--color-text-muted)]">{c.label}</div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                <th className="py-3 px-4 font-medium">Dates</th>
                <th className="py-3 px-4 font-medium text-center">Days</th>
                <th className="py-3 px-4 font-medium">Subject</th>
                <th className="py-3 px-4 font-medium">Details</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02] align-top">
                  <td className="py-3 px-4 text-[var(--color-text-main)] whitespace-nowrap">{fmtRange(r.fromDay, r.toDay)}</td>
                  <td className="py-3 px-4 text-center">{r.totalDays ?? '—'}</td>
                  <td className="py-3 px-4 text-[var(--color-text-main)]">{r.subject || '—'}</td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)] max-w-[280px]">{r.details || '—'}</td>
                  <td className={`py-3 px-4 font-semibold capitalize ${STATUS_STYLE[r.status] || ''}`}>{r.status || '—'}</td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)] text-xs max-w-[220px]">{r.decisionNote || '—'}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">No leave requests yet.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
