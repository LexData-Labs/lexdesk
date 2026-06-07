'use client';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Controlled month navigator. value = { y, m } (m is 0-11); calls onChange({ y, m }).
export default function MonthNav({ value, onChange }) {
  const step = (delta) => {
    const d = new Date(value.y, value.m + delta, 1);
    onChange({ y: d.getFullYear(), m: d.getMonth() });
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => step(-1)} className="btn-outline py-2 px-3 text-sm" aria-label="Previous month">←</button>
      <span className="text-sm font-semibold text-[var(--color-text-main)] min-w-[140px] text-center">
        {MONTHS[value.m]} {value.y}
      </span>
      <button type="button" onClick={() => step(1)} className="btn-outline py-2 px-3 text-sm" aria-label="Next month">→</button>
    </div>
  );
}
