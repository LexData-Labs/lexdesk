'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import MonthNav from '@/components/MonthNav';
import { useAttendData } from '@/lib/useAttendData';
import { todaySummary, onLeaveTodayCount, fmtTime, onlyEmployees, isLateCheckIn, leaveOverlapsMonth, perEmployeeStats, bdDateKey } from '@/lib/attend';

// Horizontal bar used by the attendance-insight cards (moved here from the
// former standalone Analytics page).
function HBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function DashboardPage() {
  // Today's KPIs/recent feed only need the current month's events (today is in
  // it); the MonthNav below drives the leave panel, not attendance.
  const thisMonth = useMemo(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; }, []);
  const { employees, events, leave, loading, error, refresh } = useAttendData(
    ['employees', 'attendance', 'leaveRequests'],
    { month: thisMonth },
  );

  const today = useMemo(() => todaySummary(events), [events]);
  const onLeave = useMemo(() => onLeaveTodayCount(leave), [leave]);
  const recent = useMemo(
    () =>
      [...(events || [])]
        .filter((e) => e.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 12),
    [events],
  );

  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const monthLeave = useMemo(() => (leave || []).filter((r) => leaveOverlapsMonth(r, ym.y, ym.m)), [leave, ym]);
  const leaveTotals = {
    total: monthLeave.length,
    approved: monthLeave.filter((r) => r.status === 'approved').length,
    pending: monthLeave.filter((r) => r.status === 'pending').length,
  };
  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // Attendance insights for the selected month (folded in from Analytics).
  const monthEvents = useMemo(
    () =>
      (events || []).filter((e) => {
        if (!e.timestamp) return false;
        const d = new Date(e.timestamp);
        return d.getFullYear() === ym.y && d.getMonth() === ym.m;
      }),
    [events, ym],
  );
  const stats = useMemo(() => perEmployeeStats(monthEvents), [monthEvents]);
  const nameById = useMemo(() => Object.fromEntries((employees || []).map((e) => [e.id, e.name || e.email])), [employees]);
  const statRows = useMemo(() => Object.entries(stats).map(([uid, s]) => ({ id: uid, name: nameById[uid] || uid, ...s })), [stats, nameById]);
  const topLate = useMemo(() => [...statRows].filter((r) => r.lateDays > 0).sort((a, b) => b.lateDays - a.lateDays).slice(0, 5), [statRows]);
  const topActive = useMemo(() => [...statRows].sort((a, b) => b.presentDays - a.presentDays).slice(0, 5), [statRows]);
  const byDay = useMemo(() => {
    const map = {};
    for (const e of monthEvents) {
      if (e.type !== 'CHECK_IN' || e.allChecksPassed === false || !e.timestamp) continue;
      const k = bdDateKey(e.timestamp);
      (map[k] ||= new Set()).add(e.user?.id);
    }
    return Object.entries(map).map(([day, set]) => ({ day, count: set.size })).sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [monthEvents]);
  const maxLate = Math.max(1, ...topLate.map((e) => e.lateDays));
  const maxActive = Math.max(1, ...topActive.map((e) => e.presentDays));
  const maxDay = Math.max(1, ...byDay.map((d) => d.count));

  const kpis = [
    { label: 'Employees', value: onlyEmployees(employees).length, color: 'purple' },
    { label: 'Checked in today', value: today.checkedIn, color: 'green' },
    { label: 'Late today', value: today.late, color: 'yellow' },
    { label: 'On leave today', value: onLeave, color: 'blue' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Live overview from AttendDesk"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            <button onClick={refresh} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={loading ? '…' : k.value} color={k.color} />
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Leave requests</h2>
          <span className="text-xs text-[var(--color-text-muted)]">{monthLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center"><p className="text-xs text-[var(--color-text-muted)]">Total</p><p className="text-2xl font-bold text-[var(--color-text-main)] mt-1">{loading ? '…' : leaveTotals.total}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--color-text-muted)]">Approved</p><p className="text-2xl font-bold text-[var(--color-green)] mt-1">{loading ? '…' : leaveTotals.approved}</p></div>
          <div className="text-center"><p className="text-xs text-[var(--color-text-muted)]">Pending</p><p className="text-2xl font-bold text-[var(--color-yellow)] mt-1">{loading ? '…' : leaveTotals.pending}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Top 5 — Most Late</h3>
          <div className="flex flex-col gap-3">
            {topLate.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No late check-ins this month</div>}
            {topLate.map((e) => (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-yellow)] font-semibold">{e.lateDays}</span></div>
                <HBar value={e.lateDays} max={maxLate} color="var(--color-yellow)" />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Top 5 — Most Active</h3>
          <div className="flex flex-col gap-3">
            {topActive.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No check-ins this month</div>}
            {topActive.map((e) => (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-green)] font-semibold">{e.presentDays}</span></div>
                <HBar value={e.presentDays} max={maxActive} color="var(--color-green)" />
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Check-ins by day · {monthLabel}</h3>
          <div className="flex flex-col gap-2">
            {byDay.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No check-ins this month</div>}
            {byDay.map((d) => (
              <div key={d.day} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--color-text-muted)] w-24 shrink-0">{d.day}</span>
                <div className="flex-1"><HBar value={d.count} max={maxDay} color="var(--color-blue)" /></div>
                <span className="text-[var(--color-text-main)] w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-[var(--color-card-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Recent activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                <th className="py-3 px-5 font-medium">Employee</th>
                <th className="py-3 px-5 font-medium">When</th>
                <th className="py-3 px-5 font-medium">Type</th>
                <th className="py-3 px-5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                  <td className="py-3 px-5 text-[var(--color-text-main)]">{e.user?.name || e.user?.email || '—'}</td>
                  <td className="py-3 px-5 whitespace-nowrap">{fmtTime(e.timestamp ? new Date(e.timestamp).getTime() : 0)}</td>
                  <td className="py-3 px-5">{e.type === 'CHECK_IN' ? 'Check in' : e.type === 'CHECK_OUT' ? 'Check out' : e.type}</td>
                  <td className="py-3 px-5">
                    {isLateCheckIn(e) ? <span className="text-[var(--color-yellow)]">Late</span> : <span className="text-[var(--color-green)]">On time</span>}
                  </td>
                </tr>
              ))}
              {!loading && recent.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">No recent activity.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
