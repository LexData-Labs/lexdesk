'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSheets } from '@/lib/SheetsContext';
import { computeEmployeeStats, getDateColumns, getEmployeeIdColumn, getEmployeeNameColumn, normalizeStatus } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import MonthTabs from '@/components/MonthTabs';
import StatusBadge from '@/components/StatusBadge';
import SheetPicker from '@/components/SheetPicker';

const STATUS_FILTERS = [
  { key: '',    label: 'All' },
  { key: 'P',   label: 'Present' },
  { key: 'L',   label: 'Late' },
  { key: 'A',   label: 'Absent' },
  { key: 'WFH', label: 'WFH' },
];

const PAGE_SIZE = 25;

export default function AttendancePage() {
  const { activeSheet, activeSheetData, loading, error } = useSheets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isEmployee = currentUser?.role === 'employee';

  const employees = useMemo(() => {
    if (!activeSheetData) return [];
    const all = computeEmployeeStats(activeSheetData.rows, activeSheetData.headers);
    // If logged in as employee, only show their own row
    if (isEmployee && currentUser?.employeeId) {
      return all.filter(e => e.id === String(currentUser.employeeId));
    }
    return all;
  }, [activeSheetData, isEmployee, currentUser]);

  const filtered = useMemo(() => {
    let list = employees;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
    }
    if (statusFilter) {
      list = list.filter(e => {
        if (statusFilter === 'P') return e.present > 0;
        if (statusFilter === 'L') return e.late > 0;
        if (statusFilter === 'A') return e.absent > 0;
        if (statusFilter === 'WFH') return e.wfh > 0;
        return true;
      });
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [employees, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    if (!activeSheetData) return;
    const { headers, rows } = activeSheetData;
    const dateCols = getDateColumns(headers);
    const idCol = getEmployeeIdColumn(headers);
    const nameCol = getEmployeeNameColumn(headers);
    const head = ['ID', 'Name', ...dateCols, 'Present', 'Late', 'Absent', 'WFH', 'Rate %'];
    const csvRows = filtered.map(emp => {
      const row = rows.find(r => String(r[idCol] ?? '').trim() === emp.id);
      const cells = dateCols.map(c => row ? normalizeStatus(row[c]) || '' : '');
      return [emp.id, emp.name, ...cells, emp.present, emp.late, emp.absent, emp.wfh, emp.rate];
    });
    const escape = v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [head, ...csvRows].map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${activeSheet || 'sheet'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = key => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const dateCols = activeSheetData ? getDateColumns(activeSheetData.headers) : [];
  const idCol = activeSheetData ? getEmployeeIdColumn(activeSheetData.headers) : '';
  const rawRows = activeSheetData?.rows || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        subtitle={activeSheet ? `${activeSheet} · ${filtered.length} employees` : 'No sheet selected'}
      />

      <div className="card">
        <MonthTabs />
      </div>

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {/* Search & filters — hidden for employees since they only see their own row */}
      {!isEmployee && (
        <div className="card flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px] bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
          />
          <div className="flex gap-2">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter === f.key
                  ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]'
                  : 'bg-[var(--color-card-bg)] text-[var(--color-text-muted)] border border-[var(--color-card-border)] hover:text-[var(--color-text-main)]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} disabled={!filtered.length} className="btn-outline py-2 px-3 text-xs disabled:opacity-50">
            Export CSV
          </button>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 bg-[var(--color-bg)] backdrop-blur shadow-sm">
              <tr className="text-left text-[var(--color-text-muted)] text-xs">
                <th className="py-3 px-4 font-medium cursor-pointer" onClick={() => toggleSort('id')}>ID</th>
                <th className="py-3 px-4 font-medium cursor-pointer" onClick={() => toggleSort('name')}>Name</th>
                {dateCols.map(c => <th key={c} className="py-3 px-2 font-medium text-center">{c}</th>)}
                <th className="py-3 px-4 font-medium text-center cursor-pointer" onClick={() => toggleSort('present')}>P</th>
                <th className="py-3 px-4 font-medium text-center cursor-pointer" onClick={() => toggleSort('late')}>L</th>
                <th className="py-3 px-4 font-medium text-center cursor-pointer" onClick={() => toggleSort('absent')}>A</th>
                <th className="py-3 px-4 font-medium text-center cursor-pointer" onClick={() => toggleSort('rate')}>Rate %</th>
              </tr>
            </thead>
            <tbody>
              {loading && !pageRows.length && (
                <tr><td colSpan={7 + dateCols.length} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={7 + dateCols.length} className="py-8 text-center text-[var(--color-text-muted)]">No employees match the current filters.</td></tr>
              )}
              {pageRows.map((emp, i) => {
                const raw = rawRows.find(r => String(r[idCol] ?? '').trim() === emp.id);
                return (
                  <tr key={emp.id || i} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                    <td className="py-2 px-4 text-[var(--color-text-muted)] text-xs">{emp.id}</td>
                    <td className="py-2 px-4 text-[var(--color-text-main)]">{emp.name}</td>
                    {dateCols.map(c => (
                      <td key={c} className="py-2 px-2 text-center"><StatusBadge value={raw?.[c]} /></td>
                    ))}
                    <td className="py-2 px-4 text-center text-[var(--color-green)] font-semibold">{emp.present}</td>
                    <td className="py-2 px-4 text-center text-[var(--color-yellow)] font-semibold">{emp.late}</td>
                    <td className="py-2 px-4 text-center text-[var(--color-red)] font-semibold">{emp.absent}</td>
                    <td className="py-2 px-4 text-center text-[var(--color-text-main)] font-semibold">{emp.rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[var(--color-card-border)] text-xs text-[var(--color-text-muted)]">
          <span>Page {page} of {totalPages} · {filtered.length} rows</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline py-1 px-3 disabled:opacity-30">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-outline py-1 px-3 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
