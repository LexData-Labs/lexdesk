'use client';

const COLORS = {
  purple: { bg: 'rgba(150,150,150,0.15)', fg: 'var(--color-purple)' },
  green:  { bg: 'rgba(34,197,94,0.15)',  fg: 'var(--color-green)' },
  yellow: { bg: 'rgba(234,179,8,0.15)',  fg: 'var(--color-yellow)' },
  red:    { bg: 'rgba(239,68,68,0.15)',  fg: 'var(--color-red)' },
  blue:   { bg: 'rgba(120,120,120,0.15)', fg: 'var(--color-blue)' },
  violet: { bg: 'rgba(167,139,250,0.15)', fg: '#A78BFA' },
};

export default function KpiCard({ label, value, color = 'purple', icon }) {
  const c = COLORS[color] || COLORS.purple;
  return (
    <div className="card flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: c.bg, color: c.fg }}
      >
        {icon || (
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <h3 className="text-2xl font-bold text-[var(--color-text-main)]">{value}</h3>
      </div>
    </div>
  );
}
