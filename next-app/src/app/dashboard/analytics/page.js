'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAttendData } from '@/lib/useAttendData';
import { perEmployeeStats, dayKey, onlyEmployees } from '@/lib/attend';

const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function HBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { employees, events, loading, error, refresh } = useAttendData(['employees', 'attendance']);
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Scope every metric to the selected month.
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
  const nameById = useMemo(
    () => Object.fromEntries((employees || []).map((e) => [e.id, e.name || e.email])),
    [employees],
  );
  const rows = useMemo(
    () => Object.entries(stats).map(([uid, s]) => ({ id: uid, name: nameById[uid] || uid, ...s })),
    [stats, nameById],
  );

  const totals = useMemo(() => {
    const checkIns = rows.reduce((a, r) => a + r.checkIns, 0);
    const late = rows.reduce((a, r) => a + r.late, 0);
    const onTimePct = checkIns > 0 ? Math.round(((checkIns - late) / checkIns) * 100) : 0;
    return { checkIns, late, onTimePct };
  }, [rows]);

  const topLate = useMemo(
    () => [...rows].filter((r) => r.late > 0).sort((a, b) => b.late - a.late).slice(0, 5),
    [rows],
  );
  const topActive = useMemo(() => [...rows].sort((a, b) => b.checkIns - a.checkIns).slice(0, 5), [rows]);

  const byDay = useMemo(() => {
    const map = {};
    for (const e of monthEvents) {
      if (e.type !== 'CHECK_IN' || !e.timestamp) continue;
      const k = dayKey(e.timestamp);
      (map[k] ||= new Set()).add(e.user?.id);
    }
    return Object.entries(map)
      .map(([day, set]) => ({ day, count: set.size }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [monthEvents]);

  const maxLate = Math.max(1, ...topLate.map((e) => e.late));
  const maxActive = Math.max(1, ...topActive.map((e) => e.checkIns));
  const maxDay = Math.max(1, ...byDay.map((d) => d.count));

  const prevMonth = () => setYm((p) => { const d = new Date(p.y, p.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nextMonth = () => setYm((p) => { const d = new Date(p.y, p.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const monthLabel = `${MONTH_FULL[ym.m]} ${ym.y}`;

  const kpis = [
    { label: 'Employees', value: onlyEmployees(employees).length, color: 'text-[var(--color-text-main)]' },
    { label: 'Check-ins', value: totals.checkIns, color: 'text-[var(--color-green)]' },
    { label: 'Late', value: totals.late, color: 'text-[var(--color-yellow)]' },
    { label: 'On-time %', value: `${totals.onTimePct}%`, color: 'text-[var(--color-text-main)]' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        subtitle={`AttendDesk check-in data · ${monthLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-outline py-2 px-3 text-sm">←</button>
            <span className="text-sm font-semibold text-[var(--color-text-main)] min-w-[150px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="btn-outline py-2 px-3 text-sm">→</button>
            <button onClick={refresh} className="btn-outline py-2 px-4 text-sm ml-2">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {loading && !rows.length && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card text-center">
            <p className="text-xs text-[var(--color-text-muted)]">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Top 5 — Most Late</h3>
          <div className="flex flex-col gap-3">
            {topLate.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No late check-ins this month</div>}
            {topLate.map((e) => (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-yellow)] font-semibold">{e.late}</span></div>
                <HBar value={e.late} max={maxLate} color="var(--color-yellow)" />
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
                <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-green)] font-semibold">{e.checkIns}</span></div>
                <HBar value={e.checkIns} max={maxActive} color="var(--color-green)" />
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
    </div>
  );
}
