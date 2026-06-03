'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSheets } from '@/lib/SheetsContext';
import { computeEmployeeStats } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import SheetPicker from '@/components/SheetPicker';
import EmployeeAvatar from '@/components/EmployeeAvatar';

const PAGE_SIZES = [10, 25, 50];

export default function EmployeesPage() {
  const { activeSheet, activeSheetData, loading, error, refresh } = useSheets();
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmpId || !newEmpName || !activeSheet) return;
    setSaving(true);
    setFeedback('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sheetName: activeSheet, id: newEmpId, name: newEmpName })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add employee');
      setNewEmpId('');
      setNewEmpName('');
      setIsAdding(false);
      setFeedback('✅ Employee added successfully!');
      setTimeout(() => setFeedback(''), 3000);
      await new Promise(r => setTimeout(r, 300));
      refresh();
    } catch (err) {
      setFeedback(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.preventDefault();
    if (!activeSheet || !confirm('Are you sure you want to delete this employee?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/employees?sheetName=${encodeURIComponent(activeSheet)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete employee');
      setFeedback('✅ Employee deleted successfully!');
      setTimeout(() => setFeedback(''), 3000);
      await new Promise(r => setTimeout(r, 300));
      refresh();
    } catch (err) {
      setFeedback(`❌ ${err.message}`);
    }
  };

  const employees = useMemo(() => {
    if (!activeSheetData) return [];
    return computeEmployeeStats(activeSheetData.rows, activeSheetData.headers);
  }, [activeSheetData]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return employees;
    return employees.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
  }, [employees, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employees"
        subtitle={`${filtered.length} of ${employees.length} employees`}
        actions={<SheetPicker />}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {feedback && <div className={`card text-sm ${feedback.startsWith('✅') ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>{feedback}</div>}

      <div className="card flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
        />
        <div className="flex gap-2">
          <button onClick={() => setView('list')} className={`px-3 py-2 rounded-lg text-xs font-semibold ${view === 'list' ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]' : 'btn-outline'}`}>List</button>
          <button onClick={() => setView('grid')} className={`px-3 py-2 rounded-lg text-xs font-semibold ${view === 'grid' ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]' : 'btn-outline'}`}>Grid</button>
          <button onClick={() => setIsAdding(!isAdding)} className="btn-primary py-2 px-3 text-xs">+ Add</button>
        </div>
        <select
          value={pageSize}
          onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}
          className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)]"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="card flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">ID</label>
            <input required type="text" value={newEmpId} onChange={e => setNewEmpId(e.target.value)} className="bg-black/30 border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Name</label>
            <input required type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="bg-black/30 border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary py-2 text-sm">{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={() => setIsAdding(false)} className="btn-outline py-2 text-sm">Cancel</button>
        </form>
      )}

      {loading && !employees.length && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}

      {view === 'list' ? (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                  <th className="py-3 px-4 font-medium">Employee</th>
                  <th className="py-3 px-4 font-medium text-center">Present</th>
                  <th className="py-3 px-4 font-medium text-center">Late</th>
                  <th className="py-3 px-4 font-medium text-center">Absent</th>
                  <th className="py-3 px-4 font-medium text-center">WFH</th>
                  <th className="py-3 px-4 font-medium text-center">Rate %</th>
                  <th className="py-3 px-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(e => (
                  <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/employees/${encodeURIComponent(e.id)}`} className="flex items-center gap-3 no-underline text-[var(--color-text-main)]">
                        <EmployeeAvatar id={e.id} name={e.name} size={36} />
                        <div>
                          <div className="font-medium">{e.name}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">ID: {e.id}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--color-green)] font-semibold">{e.present}</td>
                    <td className="py-3 px-4 text-center text-[var(--color-yellow)] font-semibold">{e.late}</td>
                    <td className="py-3 px-4 text-center text-[var(--color-red)] font-semibold">{e.absent}</td>
                    <td className="py-3 px-4 text-center text-[var(--color-blue)] font-semibold">{e.wfh}</td>
                    <td className="py-3 px-4 text-center text-[var(--color-text-main)] font-semibold">{e.rate}%</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={(ev) => handleDelete(e.id, ev)} className="text-[var(--color-red)] hover:text-[var(--color-text-main)] transition-colors p-1" title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
                {!loading && pageRows.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-[var(--color-text-muted)]">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-[var(--color-card-border)] text-xs text-[var(--color-text-muted)]">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline py-1 px-3 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-outline py-1 px-3 disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {pageRows.map(e => (
            <Link key={e.id} href={`/dashboard/employees/${encodeURIComponent(e.id)}`} className="card no-underline hover:border-[var(--color-purple)] transition-all">
              <div className="flex flex-col items-center text-center gap-3">
                <EmployeeAvatar id={e.id} name={e.name} size={56} />
                <div>
                  <div className="font-semibold text-[var(--color-text-main)] truncate max-w-[150px]">{e.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">ID: {e.id}</div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">Attendance · <span className="text-[var(--color-text-main)] font-semibold">{e.rate}%</span></div>
                <button onClick={(ev) => handleDelete(e.id, ev)} className="mt-2 text-xs text-[var(--color-red)] bg-red-500/10 px-3 py-1 rounded hover:bg-red-500/30 transition-colors z-10 relative">Delete</button>
              </div>
            </Link>
          ))}
          {!loading && pageRows.length === 0 && (
            <div className="col-span-full text-center text-[var(--color-text-muted)] py-8">No employees found.</div>
          )}
        </div>
      )}
    </div>
  );
}
