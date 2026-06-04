'use client';

import { useMemo, useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAttendData } from '@/lib/useAttendData';
import { employeeMonthGrid, onlyEmployees } from '@/lib/attend';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const { employees, events, loading, error, refresh } = useAttendData(['employees', 'attendance']);
  const [selected, setSelected] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth()); // 0-11

  const staff = useMemo(() => onlyEmployees(employees), [employees]);

  useEffect(() => {
    if (!selected && staff.length) setSelected(staff[0].id);
  }, [staff, selected]);

  const employee = useMemo(() => staff.find((e) => e.id === selected) || null, [staff, selected]);
  const grid = useMemo(
    () => (selected ? employeeMonthGrid(events, selected, year, month) : null),
    [events, selected, year, month],
  );

  const prevMonth = () => { const d = new Date(year, month - 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); };
  const nextMonth = () => { const d = new Date(year, month + 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); };

  const monthLabel = `${MONTH_FULL[month]} ${year}`;
  const todayStr = new Date().toDateString();

  const cells = [];
  if (grid) {
    for (let i = 0; i < grid.firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= grid.daysInMonth; d++) cells.push(d);
  }

  const counts = useMemo(() => {
    if (!grid) return { present: 0, late: 0 };
    let present = 0, late = 0;
    Object.values(grid.days).forEach((v) => { if (v.status === 'late') late++; else present++; });
    return { present, late };
  }, [grid]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        subtitle={employee ? `${employee.name} · ${monthLabel}` : 'Select an employee'}
        actions={<button onClick={refresh} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="card flex flex-wrap items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 min-w-[220px] bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)]"
        >
          <option value="">Select employee…</option>
          {staff.map((e) => <option key={e.id} value={e.id}>{e.name || e.email}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-outline py-2 px-3 text-sm">←</button>
          <span className="text-sm font-semibold text-[var(--color-text-main)] min-w-[150px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="btn-outline py-2 px-3 text-sm">→</button>
        </div>
      </div>

      {loading && !staff.length && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}

      {employee && grid && (
        <div className="card flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-[var(--color-green)] font-semibold">{counts.present} on-time</span>
            <span className="text-[var(--color-yellow)] font-semibold">{counts.late} late</span>
            <span className="text-[var(--color-text-muted)]">days with a check-in this month</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => <div key={d} className="text-xs text-[var(--color-text-muted)] text-center font-semibold py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const cell = grid.days[day];
              const isToday = new Date(year, month, day).toDateString() === todayStr;
              const bg = cell ? (cell.status === 'late' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)') : 'rgba(255,255,255,0.04)';
              const border = isToday
                ? '2px solid #8B5CF6'
                : cell ? (cell.status === 'late' ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(34,197,94,0.4)') : '1px solid rgba(255,255,255,0.06)';
              const color = cell ? (cell.status === 'late' ? '#EAB308' : '#22C55E') : 'var(--color-text-muted)';
              return (
                <div
                  key={i}
                  title={cell ? cell.status : ''}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5"
                  style={{ background: bg, border }}
                >
                  <span className="text-[10px]" style={{ color }}>{day}</span>
                  {cell && <span className="text-[9px] font-bold" style={{ color }}>{cell.status === 'late' ? 'L' : 'P'}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && staff.length === 0 && (
        <div className="card text-[var(--color-text-muted)] text-sm text-center py-12">No employees found.</div>
      )}
    </div>
  );
}
