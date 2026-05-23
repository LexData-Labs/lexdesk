'use client';

import { normalizeStatus } from '@/lib/attendance';

const COLORS = {
  P:   { bg: 'rgba(34,197,94,0.15)',  fg: '#22C55E', label: 'P' },
  L:   { bg: 'rgba(234,179,8,0.15)',  fg: '#EAB308', label: 'L' },
  A:   { bg: 'rgba(239,68,68,0.15)',  fg: '#EF4444', label: 'A' },
  WFH: { bg: 'rgba(59,130,246,0.15)', fg: '#3B82F6', label: 'WFH' },
};

export default function StatusBadge({ value }) {
  const status = normalizeStatus(value);
  const config = COLORS[status];
  if (!config) {
    return <span className="text-[var(--color-text-muted)] text-xs">{value || '—'}</span>;
  }
  return (
    <span
      className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded text-xs font-semibold"
      style={{ background: config.bg, color: config.fg }}
    >
      {config.label}
    </span>
  );
}
