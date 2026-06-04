'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function MyAttendancePage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/attendance?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setEvents(json.events || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = events || [];
  const checkIns = list.filter((e) => e.type === 'CHECK_IN');
  const lateCount = checkIns.filter((e) => e.isLate).length;
  const days = new Set(
    list.map((e) => (e.timestamp ? new Date(e.timestamp).toDateString() : null)).filter(Boolean),
  ).size;

  const cards = [
    { label: 'Days recorded', value: days, color: 'text-[var(--color-text-main)]' },
    { label: 'Check-ins', value: checkIns.length, color: 'text-[var(--color-green)]' },
    { label: 'Late arrivals', value: lateCount, color: 'text-[var(--color-yellow)]' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Attendance"
        subtitle="Your check-in / check-out history from AttendDesk"
        actions={<button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

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
                <th className="py-3 px-4 font-medium">When</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Scheduled</th>
                <th className="py-3 px-4 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-[var(--color-text-main)] whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {e.type === 'CHECK_IN' ? 'Check in' : e.type === 'CHECK_OUT' ? 'Check out' : e.type}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {e.isLate ? (
                      <span className="text-[var(--color-yellow)]">Late</span>
                    ) : e.isEarly ? (
                      <span className="text-[var(--color-blue)]">Early</span>
                    ) : (
                      <span className="text-[var(--color-green)]">On time</span>
                    )}
                    {e.allChecksPassed === false && (
                      <span className="text-[var(--color-red)] ml-2">checks failed</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)] text-xs whitespace-nowrap">
                    {e.scheduledStart && e.scheduledEnd ? `${e.scheduledStart}–${e.scheduledEnd}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)] text-xs">{e.clientMode || 'mobile'}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No attendance records yet.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
