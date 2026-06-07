'use client';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Per-status cell styling. Leave and missed are both red but carry different
// markers (LV vs A) so they stay distinguishable at a glance.
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

// Renders a compact, color-coded month grid from an `employeeCalendarMonth`
// result ({ year, month, daysInMonth, firstWeekday, days, counts }).
export default function MonthCalendar({ cal, loading }) {
  if (!cal) return null;

  const cells = [];
  for (let i = 0; i < cal.firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= cal.daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isTodayCell = (day) =>
    today.getFullYear() === cal.year && today.getMonth() === cal.month && today.getDate() === day;

  return (
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
          const border = isTodayCell(day) ? '2px solid #8B5CF6' : `1px ${st.dashed ? 'dashed' : 'solid'} ${st.border}`;
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
  );
}
