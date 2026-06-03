'use client';

import { useMemo } from 'react';
import { useSheets } from '@/lib/SheetsContext';
import { computeEmployeeStats, computeOverallStats, isMonthSheet } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import SheetPicker from '@/components/SheetPicker';

function HBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { activeSheet, activeSheetData, data, loading, error } = useSheets();

  const employees = useMemo(() => {
    if (!activeSheetData) return [];
    return computeEmployeeStats(activeSheetData.rows, activeSheetData.headers);
  }, [activeSheetData]);

  const overall = useMemo(() => {
    if (!activeSheetData) return null;
    return computeOverallStats(activeSheetData.rows, activeSheetData.headers);
  }, [activeSheetData]);

  const topLate = useMemo(() => [...employees].sort((a, b) => b.late - a.late).slice(0, 5), [employees]);
  const topAbsent = useMemo(() => [...employees].sort((a, b) => b.absent - a.absent).slice(0, 5), [employees]);
  const topAttendance = useMemo(() => [...employees].sort((a, b) => b.rate - a.rate).slice(0, 5), [employees]);

  const monthlySummary = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.sheets)
      .filter(isMonthSheet)
      .map(name => {
        const { headers, rows } = data.sheets[name];
        const s = computeOverallStats(rows, headers);
        return { name, ...s };
      });
  }, [data]);

  const maxLate = Math.max(1, ...topLate.map(e => e.late));
  const maxAbsent = Math.max(1, ...topAbsent.map(e => e.absent));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        subtitle={activeSheet ? `Insights from ${activeSheet}` : 'No sheet selected'}
        actions={<SheetPicker />}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {loading && !overall && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}

      {overall && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Total Employees</p><p className="text-2xl font-bold text-[var(--color-text-main)] mt-1">{overall.total}</p></div>
          <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Present Days</p><p className="text-2xl font-bold text-[var(--color-green)] mt-1">{overall.present}</p></div>
          <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Late Days</p><p className="text-2xl font-bold text-[var(--color-yellow)] mt-1">{overall.late}</p></div>
          <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Absent Days</p><p className="text-2xl font-bold text-[var(--color-red)] mt-1">{overall.absent}</p></div>
          <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Overall Rate</p><p className="text-2xl font-bold text-[var(--color-text-main)] mt-1">{overall.rate}%</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Top 5 — Most Late</h3>
          <div className="flex flex-col gap-3">
            {topLate.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No data</div>}
            {topLate.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-yellow)] font-semibold">{e.late}</span></div>
                  <HBar value={e.late} max={maxLate} color="var(--color-yellow)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Top 5 — Most Absent</h3>
          <div className="flex flex-col gap-3">
            {topAbsent.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No data</div>}
            {topAbsent.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-red)] font-semibold">{e.absent}</span></div>
                  <HBar value={e.absent} max={maxAbsent} color="var(--color-red)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Top 5 — Highest Attendance Rate</h3>
          <div className="flex flex-col gap-3">
            {topAttendance.length === 0 && <div className="text-[var(--color-text-muted)] text-sm">No data</div>}
            {topAttendance.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-main)] truncate">{e.name}</span><span className="text-[var(--color-green)] font-semibold">{e.rate}%</span></div>
                  <HBar value={e.rate} max={100} color="var(--color-green)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Monthly Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 px-3 font-medium text-center">P</th>
                  <th className="py-2 px-3 font-medium text-center">L</th>
                  <th className="py-2 px-3 font-medium text-center">A</th>
                  <th className="py-2 px-3 font-medium text-center">Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-[var(--color-text-muted)]">No month sheets found</td></tr>
                )}
                {monthlySummary.map(m => (
                  <tr key={m.name} className="border-t border-[var(--color-card-border)]">
                    <td className="py-2 pr-3 text-[var(--color-text-main)]">{m.name}</td>
                    <td className="py-2 px-3 text-center text-[var(--color-green)] font-semibold">{m.present}</td>
                    <td className="py-2 px-3 text-center text-[var(--color-yellow)] font-semibold">{m.late}</td>
                    <td className="py-2 px-3 text-center text-[var(--color-red)] font-semibold">{m.absent}</td>
                    <td className="py-2 px-3 text-center text-[var(--color-text-main)] font-semibold">{m.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
