'use client';

import { useSheets } from '@/lib/SheetsContext';
import { isMonthSheet } from '@/lib/attendance';

export default function MonthTabs() {
  const { sheetNames, activeSheet, setActiveSheet, loading, refresh } = useSheets();
  const months = sheetNames.filter(isMonthSheet);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>Select Month</span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-outline py-1 px-3 text-xs disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {months.map(name => {
          const isActive = activeSheet === name;
          return (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              disabled={loading}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 border
                ${isActive
                  ? 'bg-[rgba(139,92,246,0.2)] text-[var(--color-purple)] border-[var(--color-purple)] shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                  : 'bg-black/20 text-[var(--color-text-muted)] border-[var(--color-card-border)] hover:text-white hover:bg-white/5'
                }
              `}
            >
              {name}
            </button>
          );
        })}
        {months.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)] py-2">No month sheets found</span>
        )}
      </div>
    </div>
  );
}
