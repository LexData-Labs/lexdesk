'use client';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Per-status cell styling. Leave is red and missed is light purple; they also
// carry different markers (LV vs A) so they stay distinguishable at a glance.
const STATUS_STYLE = {
  ontime: { bg: 'rgba(34,197,94,0.32)', border: 'rgba(34,197,94,0.65)', color: '#22C55E', mark: 'P' },
  late: { bg: 'rgba(234,179,8,0.32)', border: 'rgba(234,179,8,0.65)', color: '#EAB308', mark: 'L' },
  leave: { bg: 'rgba(239,68,68,0.32)', border: 'rgba(239,68,68,0.65)', color: '#EF4444', mark: 'LV' },
  missed: { bg: 'rgba(174,61,99,0.32)', border: 'rgba(174,61,99,0.55)', color: '#BC5A7D', mark: 'A' },
  holiday: { bg: 'rgba(85,148,248,0.30)', border: 'rgba(85,148,248,0.6)', color: '#5594F8', mark: 'H' },
  remote: { bg: 'rgba(181,151,255,0.32)', border: 'rgba(181,151,255,0.6)', color: '#B597FF', mark: 'R' },
  future: { bg: 'transparent', border: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', mark: '', dashed: true },
  today: { bg: 'rgba(150,150,150,0.08)', border: 'rgba(150,150,150,0.4)', color: 'var(--color-text-main)', mark: '' },
};

const LEGEND = [
  { key: 'ontime', label: 'On-time', color: '#22C55E' },
  { key: 'late', label: 'Late', color: '#EAB308' },
  { key: 'leave', label: 'Leave', color: '#EF4444' },
  { key: 'missed', label: 'Missed', color: '#BC5A7D' },
  { key: 'holiday', label: 'Holiday', color: '#5594F8' },
  { key: 'remote', label: 'Remote', color: '#B597FF' },
];

// Renders a color-coded month grid from an `employeeCalendarMonth` result
// ({ year, month, daysInMonth, firstWeekday, days, counts }). Pass `compact`
// for a shorter grid (e.g. embedded on the employee dashboard).
// `bare` drops the .card wrapper so the grid can render the calendar inside an
// outer card alongside a heading (keeps row heights aligned).
export default function MonthCalendar({ cal, loading, compact = false, bare = false }) {
  if (!cal) return null;

  const cells = [];
  for (let i = 0; i < cal.firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= cal.daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isTodayCell = (day) =>
    today.getFullYear() === cal.year && today.getMonth() === cal.month && today.getDate() === day;

  const gap = compact ? 'gap-1' : 'gap-1 sm:gap-1.5';
  const cellMinH = compact ? 'min-h-[26px]' : 'min-h-[44px] sm:min-h-[64px]';
  const cellPad = compact ? 'p-0' : 'p-1';
  const cellRound = compact ? 'rounded-md' : 'rounded-lg';
  const dayText = compact ? 'text-[10px]' : 'text-[9px] sm:text-xs';
  const markText = compact ? 'text-[8px]' : 'text-[7px] sm:text-[9px]';

  return (
    <div className={`${bare ? '' : 'card '}flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-x-4 gap-y-1.5 text-[11px]' : 'gap-x-3 sm:gap-x-5 gap-y-2 text-[11px] sm:text-sm'}`}>
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-[4px]" style={{ background: l.color }} />
            <span className="text-[var(--color-text-muted)]">{l.label}</span>
          </span>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${gap}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={`${compact ? 'text-[10px] py-0.5' : 'text-xs py-1'} text-[var(--color-text-muted)] text-center font-semibold`}>{d}</div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${gap}`}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const cell = cal.days[day];
          const st = STATUS_STYLE[cell.status] || STATUS_STYLE.future;
          const border = isTodayCell(day) ? '2px solid var(--color-purple)' : `1px ${st.dashed ? 'dashed' : 'solid'} ${st.border}`;
          const tip = cell.name || cell.subject || cell.status;
          return (
            <div
              key={i}
              title={tip}
              className={`${cellMinH} ${cellRound} flex flex-col items-center justify-center gap-0.5 ${cellPad}`}
              style={{ background: st.bg, border }}
            >
              <span className={`${dayText} font-semibold text-[var(--color-text-main)]`}>{day}</span>
            </div>
          );
        })}
      </div>

      {loading && <div className="text-[var(--color-text-muted)] text-sm">Loading…</div>}
    </div>
  );
}
