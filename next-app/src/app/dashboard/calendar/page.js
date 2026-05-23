'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSheets } from '@/lib/SheetsContext';
import {
  buildEmployeeCalendar,
  computeEmployeeStats,
  getEmployeeIdColumn,
  parseSheetMonth,
} from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import SheetPicker from '@/components/SheetPicker';
import StatusBadge from '@/components/StatusBadge';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function CalendarPageInner() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { activeSheet, activeSheetData, loading, error } = useSheets();
  const employeeId = search.get('employee') || '';

  const employees = useMemo(() => {
    if (!activeSheetData) return [];
    return computeEmployeeStats(activeSheetData.rows, activeSheetData.headers);
  }, [activeSheetData]);

  const selectedEmployee = employees.find(e => e.id === employeeId);

  const calendar = useMemo(() => {
    if (!activeSheetData || !selectedEmployee) return null;
    const { headers, rows } = activeSheetData;
    const idCol = getEmployeeIdColumn(headers);
    const row = rows.find(r => String(r[idCol] ?? '').trim() === selectedEmployee.id);
    return buildEmployeeCalendar(row, headers, activeSheet);
  }, [activeSheetData, selectedEmployee, activeSheet]);

  const monthInfo = activeSheet ? parseSheetMonth(activeSheet) : null;
  const monthLabel = monthInfo ? `${MONTH_NAMES[monthInfo.monthIndex]} ${monthInfo.year}` : activeSheet;

  const setEmployee = (id) => {
    const params = new URLSearchParams(search.toString());
    if (id) params.set('employee', id);
    else params.delete('employee');
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        subtitle={monthLabel ? `Viewing ${monthLabel}` : 'Select a month and employee'}
        actions={<SheetPicker />}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="card flex flex-wrap items-center gap-3">
        <select
          value={employeeId}
          onChange={e => setEmployee(e.target.value)}
          className="flex-1 min-w-[200px] bg-black/30 border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-purple)]"
        >
          <option value="">— Select employee —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name} (ID: {e.id})</option>)}
        </select>
        {selectedEmployee && (
          <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
            <span><span className="text-[var(--color-green)] font-semibold">{selectedEmployee.present}</span> Present</span>
            <span><span className="text-[var(--color-yellow)] font-semibold">{selectedEmployee.late}</span> Late</span>
            <span><span className="text-[var(--color-red)] font-semibold">{selectedEmployee.absent}</span> Absent</span>
            <span><span className="text-[var(--color-blue)] font-semibold">{selectedEmployee.wfh}</span> WFH</span>
          </div>
        )}
      </div>

      {loading && !activeSheetData && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}

      {!selectedEmployee && !loading && (
        <div className="card text-[var(--color-text-muted)] text-sm text-center py-12">
          Select an employee from the dropdown above to view their personal calendar.
        </div>
      )}

      {calendar && selectedEmployee && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">{selectedEmployee.name} · {monthLabel}</h3>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-xs text-[var(--color-text-muted)] text-center font-semibold py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.cells.map((cell, i) => {
              if (!cell) return <div key={i} className="aspect-square" />;
              const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border ${isWeekend ? 'border-[var(--color-card-border)] bg-black/20 opacity-60' : 'border-[var(--color-card-border)] bg-black/30'}`}
                >
                  <span className="text-xs text-[var(--color-text-muted)]">{cell.day}</span>
                  {cell.status && <StatusBadge value={cell.status} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}>
      <CalendarPageInner />
    </Suspense>
  );
}
