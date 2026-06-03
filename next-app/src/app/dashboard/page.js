'use client';

import { useMemo } from 'react';
import { useSheets } from '@/lib/SheetsContext';
import { computeOverallStats, getDateColumns, getEmployeeNameColumn, getEmployeeIdColumn } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import SheetPicker from '@/components/SheetPicker';

export default function DashboardPage() {
  const { activeSheet, activeSheetData, loading, error } = useSheets();

  const stats = useMemo(() => {
    if (!activeSheetData) return null;
    return computeOverallStats(activeSheetData.rows, activeSheetData.headers);
  }, [activeSheetData]);

  const matrix = useMemo(() => {
    if (!activeSheetData) return null;
    const { headers, rows } = activeSheetData;
    const dateCols = getDateColumns(headers).slice(-10);
    const idCol = getEmployeeIdColumn(headers);
    const nameCol = getEmployeeNameColumn(headers);
    const preview = rows.filter(r => String(r[nameCol] ?? '').trim()).slice(0, 10);
    return { dateCols, idCol, nameCol, rows: preview };
  }, [activeSheetData]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        subtitle={activeSheet ? `Viewing ${activeSheet}` : 'No sheet selected'}
        actions={<SheetPicker />}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {loading && !stats && <div className="card text-[var(--color-text-muted)] text-sm">Loading sheet data…</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="Total Employees" value={stats?.total ?? '—'} color="purple" />
        <KpiCard label="Present Days"    value={stats?.present ?? '—'} color="green"  />
        <KpiCard label="Late Days"       value={stats?.late ?? '—'} color="yellow" />
        <KpiCard label="Absent Days"     value={stats?.absent ?? '—'} color="red"    />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Attendance Matrix (last 10 days)</h3>
          {stats && <span className="text-xs text-[var(--color-text-muted)]">Overall attendance: {stats.rate}%</span>}
        </div>
        {!matrix || matrix.rows.length === 0 ? (
          <div className="text-[var(--color-text-muted)] text-sm py-8 text-center opacity-60">
            No data to display.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] text-xs">
                  <th className="py-2 pr-4 font-medium">ID</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  {matrix.dateCols.map(c => <th key={c} className="py-2 px-2 font-medium text-center">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((r, i) => (
                  <tr key={i} className="border-t border-[var(--color-card-border)]">
                    <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{r[matrix.idCol]}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-main)]">{r[matrix.nameCol]}</td>
                    {matrix.dateCols.map(c => (
                      <td key={c} className="py-2 px-2 text-center"><StatusBadge value={r[c]} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
