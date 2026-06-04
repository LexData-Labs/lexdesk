'use client';

import { useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import { useAttendData } from '@/lib/useAttendData';
import { todaySummary, onLeaveTodayCount, fmtTime, onlyEmployees, isLateCheckIn } from '@/lib/attend';

export default function DashboardPage() {
  const { employees, events, leave, loading, error, refresh } = useAttendData([
    'employees',
    'attendance',
    'leaveRequests',
  ]);

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
        actions={<button onClick={refresh} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={loading ? '…' : k.value} color={k.color} />
        ))}
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
