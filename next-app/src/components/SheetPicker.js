'use client';

import { useSheets } from '@/lib/SheetsContext';
import { isMonthSheet } from '@/lib/attendance';

export default function SheetPicker() {
  const { sheetNames, activeSheet, setActiveSheet, loading, refresh } = useSheets();
  const months = sheetNames.filter(isMonthSheet);

  return (
    <div className="flex items-center gap-3">
      <select
        value={activeSheet}
        onChange={(e) => setActiveSheet(e.target.value)}
        disabled={loading || !months.length}
        className="bg-black/30 border border-[var(--color-card-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--color-purple)] disabled:opacity-50"
      >
        {months.length === 0 && <option value="">No sheets</option>}
        {months.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <button
        onClick={refresh}
        disabled={loading}
        className="btn-outline py-1.5 px-3 text-sm disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}
