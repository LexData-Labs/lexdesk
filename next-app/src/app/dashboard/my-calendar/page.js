'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import MonthNav from '@/components/MonthNav';
import { employeeCalendarMonth } from '@/lib/attend';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Per-status cell styling. Leave and missed are both red (per request) but carry
// different markers (LV vs A) so they're still distinguishable at a glance.
const STATUS_STYLE = {
  ontime: { bg: 'rgba(34,197,94,0.32)', border: 'rgba(34,197,94,0.65)', color: '#22C55E', mark: 'P' },
  late: { bg: 'rgba(234,179,8,0.32)', border: 'rgba(234,179,8,0.65)', color: '#EAB308', mark: 'L' },
  leave: { bg: 'rgba(239,68,68,0.32)', border: 'rgba(239,68,68,0.65)', color: '#EF4444', mark: 'LV' },
  missed: { bg: 'rgba(239,68,68,0.32)', border: 'rgba(239,68,68,0.65)', color: '#EF4444', mark: 'A' },
  holiday: { bg: 'rgba(236,72,153,0.32)', border: 'rgba(236,72,153,0.65)', color: '#EC4899', mark: 'H' },
  future: { bg: 'transparent', border: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', mark: '', dashed: true },
  today: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.4)', color: 'var(--color-text-main)', mark: '' },
};

const LEGEND = [
  { key: 'ontime', label: 'On-time', color: '#22C55E' },
  { key: 'late', label: 'Late', color: '#EAB308' },
  { key: 'leave', label: 'Leave', color: '#EF4444' },
  { key: 'missed', label: 'Missed', color: '#EF4444' },
  { key: 'holiday', label: 'Holiday', color: '#EC4899' },
];

export default function MyCalendarPage() {
  const [events, setEvents] = useState([]);
  const [leave, setLeave] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [attRes, lvRes, holRes] = await Promise.all([
        fetch('/api/me/attendance?limit=1000', { headers, cache: 'no-store' }),
        fetch('/api/me/leave', { headers, cache: 'no-store' }),
        fetch('/api/holidays', { headers, cache: 'no-store' }),
      ]);
      const attJson = await attRes.json();
      if (!attRes.ok) throw new Error(attJson.error || `HTTP ${attRes.status}`);
      setEvents(attJson.events || []);
      const lvJson = await lvRes.json();
      if (lvRes.ok) setLeave(lvJson.requests || []);
      const holJson = await holRes.json();
      if (holRes.ok) setHolidays(holJson.holidays || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cal = useMemo(
    () => employeeCalendarMonth(events, leave, holidays, ym.y, ym.m),
    [events, leave, holidays, ym],
  );

  const todayStr = new Date().toDateString();
  const cells = [];
  for (let i = 0; i < cal.firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= cal.daysInMonth; d++) cells.push(d);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        subtitle="Your month at a glance — attendance, leave & holidays"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-[4px]" style={{ background: l.color }} />
              <span className="text-[var(--color-text-muted)]">{l.label}</span>
              <span className="font-semibold" style={{ color: l.color }}>{cal.counts[l.key] ?? 0}</span>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-xs text-[var(--color-text-muted)] text-center font-semibold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const cell = cal.days[day];
            const st = STATUS_STYLE[cell.status] || STATUS_STYLE.future;
            const isToday = new Date(ym.y, ym.m, day).toDateString() === todayStr;
            const border = isToday ? '2px solid #8B5CF6' : `1px ${st.dashed ? 'dashed' : 'solid'} ${st.border}`;
            const tip = cell.name || cell.subject || cell.status;
            return (
              <div
                key={i}
                title={tip}
                className="min-h-[64px] rounded-lg flex flex-col items-center justify-center gap-0.5 p-1"
                style={{ background: st.bg, border }}
              >
                <span className="text-xs font-semibold text-[var(--color-text-main)]">{day}</span>
                {st.mark && <span className="text-[9px] font-bold leading-none" style={{ color: st.color }}>{st.mark}</span>}
              </div>
            );
          })}
        </div>

        {loading && <div className="text-[var(--color-text-muted)] text-sm">Loading…</div>}
      </div>
    </div>
  );
}
