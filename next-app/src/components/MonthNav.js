'use client';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Controlled month navigator. value = { y, m } (m is 0-11); calls onChange({ y, m }).
export default function MonthNav({ value, onChange }) {
  const step = (delta) => {
    const d = new Date(value.y, value.m + delta, 1);
    onChange({ y: d.getFullYear(), m: d.getMonth() });
  };
  return (
    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
      <button type="button" onClick={() => step(-1)} className="btn-outline py-1.5 px-2.5 text-xs sm:text-sm" aria-label="Previous month">←</button>
      <span className="text-xs sm:text-sm font-semibold text-[var(--color-text-main)] min-w-[110px] sm:min-w-[140px] text-center">
        {MONTHS[value.m]} {value.y}
      </span>
      <button type="button" onClick={() => step(1)} className="btn-outline py-1.5 px-2.5 text-xs sm:text-sm" aria-label="Next month">→</button>
    </div>
  );
}
