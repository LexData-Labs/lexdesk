'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import MonthNav from '@/components/MonthNav';
import { isLateCheckIn, canonicalStats, inBdMonth, leaveOverlapsMonth } from '@/lib/attend';

function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function MyAttendancePage() {
  const [events, setEvents] = useState(null);
  const [leave, setLeave] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [attRes, lvRes] = await Promise.all([
        fetch('/api/me/attendance?limit=1000', { headers, cache: 'no-store' }),
        fetch('/api/me/leave', { headers, cache: 'no-store' }),
      ]);
      const attJson = await attRes.json();
      if (!attRes.ok) throw new Error(attJson.error || `HTTP ${attRes.status}`);
      setEvents(attJson.events || []);
      const lvJson = await lvRes.json();
      if (lvRes.ok) setLeave(lvJson.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthEvents = useMemo(
    () =>
      (events || [])
        .filter((e) => inBdMonth(e.timestamp, ym.y, ym.m))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [events, ym],
  );
  const cstats = canonicalStats(monthEvents);
  const leavesThisMonth = useMemo(
    () => (leave || []).filter((r) => leaveOverlapsMonth(r, ym.y, ym.m)).length,
    [leave, ym],
  );

  const cards = [
    { label: 'Days present', value: cstats.presentDays, color: 'text-[var(--color-text-main)]' },
    { label: 'On-time', value: cstats.onTimeDays, color: 'text-[var(--color-green)]' },
    { label: 'Late days', value: cstats.lateDays, color: 'text-[var(--color-yellow)]' },
    { label: 'Leaves', value: leavesThisMonth, color: 'text-[var(--color-blue)]' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Attendance"
        subtitle="Your check-in / check-out history from AttendDesk"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              {monthEvents.map((e) => (
                <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-[var(--color-text-main)] whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {e.type === 'CHECK_IN' ? 'Check in' : e.type === 'CHECK_OUT' ? 'Check out' : e.type}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {isLateCheckIn(e) ? (
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
              {!loading && monthEvents.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No records for this month.</td></tr>
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
