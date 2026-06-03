'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSheets } from '@/lib/SheetsContext';
import {
  buildEmployeeCalendar,
  computeEmployeeStats,
  getEmployeeIdColumn,
  parseSheetMonth,
  isMonthSheet,
} from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_COLORS = {
  P:   { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',   text: '#22C55E', label: 'Present' },
  L:   { bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.4)',   text: '#EAB308', label: 'Late' },
  A:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',   text: '#EF4444', label: 'Absent' },
  WFH: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)',  text: '#3B82F6', label: 'WFH' },
};

function CalendarGrid({ employee, calendar, monthLabel }) {
  const [expanded, setExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const stats = [
    { key: 'P',   count: employee.present, color: '#22C55E', label: 'Present' },
    { key: 'L',   count: employee.late,    color: '#EAB308', label: 'Late' },
    { key: 'A',   count: employee.absent,  color: '#EF4444', label: 'Absent' },
    { key: 'WFH', count: employee.wfh,     color: '#3B82F6', label: 'WFH' },
  ];

  return (
    <div className="card flex flex-col gap-4">
      {/* Employee Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}
          >
            {employee.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-main)]">{employee.name}</div>
            <div className="text-xs text-[var(--color-text-muted)]">ID: {employee.id} · {monthLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {stats.map(s => (
            <div key={s.key} className="text-center hidden sm:block">
              <div className="font-bold text-sm" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{s.label}</div>
            </div>
          ))}
          <div className="text-center">
            <div className="font-bold text-sm text-[var(--color-text-main)]">{employee.rate}%</div>
            <div className="text-xs text-[var(--color-text-muted)]">Rate</div>
          </div>
          <span className="text-[var(--color-text-muted)] text-xs ml-2">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {expanded && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs mb-2 items-center">
            <span className="text-[var(--color-text-muted)] mr-2 font-medium">Filters:</span>
            {Object.entries(STATUS_COLORS).map(([k, v]) => (
              <button 
                key={k} 
                onClick={() => setActiveFilter(activeFilter === k ? null : k)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all ${
                  activeFilter === k 
                    ? 'ring-1 shadow-sm opacity-100 bg-white/5' 
                    : activeFilter 
                      ? 'opacity-40 hover:opacity-80' 
                      : 'hover:bg-white/5'
                }`}
                style={activeFilter === k ? { outlineColor: v.text } : {}}
              >
                <span className="w-3 h-3 rounded-sm shadow-sm" style={{ background: v.bg, border: `1px solid ${v.border}` }} />
                <span className="font-medium" style={{ color: v.text }}>{v.label}</span>
              </button>
            ))}
            <button 
              onClick={() => setActiveFilter(activeFilter === 'weekend' ? null : 'weekend')}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all ${
                activeFilter === 'weekend' 
                  ? 'ring-1 ring-[var(--color-text-muted)] shadow-sm opacity-100 bg-white/10' 
                  : activeFilter 
                    ? 'opacity-40 hover:opacity-80' 
                    : 'hover:bg-white/5'
              }`}
            >
              <span className="w-3 h-3 rounded-sm bg-white/10 border border-white/20 shadow-sm" />
              <span className="text-[var(--color-text-muted)] font-medium">Weekend/Holiday</span>
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-xs text-[var(--color-text-muted)] text-center font-semibold py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendar.cells.map((cell, i) => {
              if (!cell) return <div key={i} />;
              const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
              const sc = STATUS_COLORS[cell.status];
              const isToday = cell.date.toDateString() === new Date().toDateString();
              
              let isMuted = false;
              if (activeFilter) {
                if (activeFilter === 'weekend') {
                  isMuted = !isWeekend;
                } else {
                  isMuted = cell.status !== activeFilter;
                }
              }

              return (
                <div
                  key={i}
                  title={sc ? sc.label : cell.status || (isWeekend ? 'Weekend' : '')}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-all ${isMuted ? 'opacity-10 grayscale filter' : 'hover:scale-105 shadow-sm'}`}
                  style={{
                    background: sc ? sc.bg : isWeekend ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                    border: isToday && !isMuted
                      ? '2px solid #8B5CF6'
                      : sc ? `1px solid ${sc.border}` : '1px solid rgba(255,255,255,0.06)',
                    opacity: isMuted ? 0.15 : (isWeekend && !sc ? 0.5 : 1),
                  }}
                >
                  <span className="text-[10px]" style={{ color: sc ? sc.text : 'var(--color-text-muted)' }}>
                    {cell.day}
                  </span>
                  {sc && (
                    <span className="text-[9px] font-bold" style={{ color: sc.text }}>
                      {cell.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarPageInner() {
  const { sheetNames, activeSheet, setActiveSheet, activeSheetData, loading, error, refresh } = useSheets();
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isEmployee = currentUser?.role === 'employee';

  const months = useMemo(() => sheetNames.filter(isMonthSheet), [sheetNames]);
  const monthInfo = activeSheet ? parseSheetMonth(activeSheet) : null;
  const monthLabel = monthInfo ? `${MONTH_FULL[monthInfo.monthIndex]} ${monthInfo.year}` : activeSheet;

  const employees = useMemo(() => {
    if (!activeSheetData) return [];
    const all = computeEmployeeStats(activeSheetData.rows, activeSheetData.headers);
    // If logged in as employee, only show their own record
    if (isEmployee && currentUser?.employeeId) {
      return all.filter(e => e.id === String(currentUser.employeeId));
    }
    return all;
  }, [activeSheetData, isEmployee, currentUser]);

  const idCol = activeSheetData ? getEmployeeIdColumn(activeSheetData.headers) : '';

  const filtered = useMemo(() => {
    if (isEmployee) return employees; // no search needed for employee
    const s = search.trim().toLowerCase();
    if (!s) return employees;
    return employees.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
  }, [employees, search, isEmployee]);

  const calendars = useMemo(() => {
    if (!activeSheetData) return {};
    const out = {};
    filtered.forEach(emp => {
      const row = activeSheetData.rows.find(r => String(r[idCol] ?? '').trim() === emp.id);
      out[emp.id] = buildEmployeeCalendar(row, activeSheetData.headers, activeSheet);
    });
    return out;
  }, [activeSheetData, filtered, idCol, activeSheet]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        subtitle={monthLabel ? `${monthLabel} · ${filtered.length} employees` : 'Select a month'}
      />

      {/* Month Tabs */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Select Month</span>
          <button onClick={refresh} disabled={loading} className="btn-outline py-1 px-3 text-xs disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {months.map(name => {
            const isActive = activeSheet === name;
            return (
              <button
                key={name}
                onClick={() => setActiveSheet(name)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border
                  ${isActive
                    ? 'bg-[rgba(139,92,246,0.2)] text-[var(--color-purple)] border-[var(--color-purple)] shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                    : 'bg-black/20 text-[var(--color-text-muted)] border-[var(--color-card-border)] hover:text-[var(--color-text-main)] hover:bg-white/5'
                  }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search — hidden for employees since they only see their own data */}
      {!isEmployee && (
        <div className="card">
          <input
            type="text"
            placeholder="Search employee by name or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
          />
        </div>
      )}

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {loading && !activeSheetData && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}

      {/* Employee Calendars */}
      {!loading && filtered.length === 0 && activeSheetData && (
        <div className="card text-[var(--color-text-muted)] text-sm text-center py-12">No employees found.</div>
      )}

      {filtered.map(emp => (
        <CalendarGrid
          key={emp.id}
          employee={emp}
          calendar={calendars[emp.id]}
          monthLabel={monthLabel}
        />
      ))}
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
