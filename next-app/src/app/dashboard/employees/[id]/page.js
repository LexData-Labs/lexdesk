'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSheets } from '@/lib/SheetsContext';
import { computeEmployeeStats, getEmployeeIdColumn, getEmployeeNameColumn, getDateColumns, normalizeStatus } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import SheetPicker from '@/components/SheetPicker';
import StatusBadge from '@/components/StatusBadge';
import EmployeeAvatar from '@/components/EmployeeAvatar';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const employeeId = decodeURIComponent(id);
  const { activeSheet, activeSheetData, loading, error } = useSheets();
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAvatar(localStorage.getItem('avatar-' + employeeId));
    }
  }, [employeeId]);

  const { employee, row, dateCols } = useMemo(() => {
    if (!activeSheetData) return { employee: null, row: null, dateCols: [] };
    const { headers, rows } = activeSheetData;
    const idCol = getEmployeeIdColumn(headers);
    const matched = rows.find(r => String(r[idCol] ?? '').trim() === employeeId);
    const stats = computeEmployeeStats(rows, headers).find(e => e.id === employeeId);
    return { employee: stats, row: matched, dateCols: getDateColumns(headers) };
  }, [activeSheetData, employeeId]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      localStorage.setItem('avatar-' + employeeId, data);
      setAvatar(data);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    localStorage.removeItem('avatar-' + employeeId);
    setAvatar(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={employee?.name || `Employee ${employeeId}`}
        subtitle={activeSheet ? `Profile · ${activeSheet}` : 'Profile'}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/dashboard/employees" className="btn-outline py-1.5 px-3 text-sm">Back</Link>
            <Link href={`/dashboard/calendar?employee=${encodeURIComponent(employeeId)}`} className="btn-primary py-1.5 px-3 text-sm">View Calendar</Link>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {loading && !employee && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}
      {!loading && !employee && activeSheetData && (
        <div className="card text-[var(--color-text-muted)] text-sm">
          Employee not found in <strong>{activeSheet}</strong>. Try a different sheet.
        </div>
      )}

      {employee && (
        <>
          <div className="card flex items-center gap-6 flex-wrap">
            <div className="relative">
              {avatar ? (
                <div className="w-24 h-24 rounded-full bg-cover bg-center border-2 border-[var(--color-purple)]" style={{ backgroundImage: `url(${avatar})` }} />
              ) : (
                <EmployeeAvatar id={employeeId} name={employee.name} size={96} />
              )}
            </div>
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-xl font-semibold text-white">{employee.name}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Employee ID: {employee.id}</p>
              <div className="flex gap-3 mt-3">
                <label className="btn-outline py-1.5 px-3 text-xs cursor-pointer">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                {avatar && <button onClick={removeAvatar} className="btn-outline py-1.5 px-3 text-xs text-[var(--color-red)] border-[rgba(239,68,68,0.3)]">Remove</button>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Present</p><p className="text-2xl font-bold text-[var(--color-green)] mt-1">{employee.present}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Late</p><p className="text-2xl font-bold text-[var(--color-yellow)] mt-1">{employee.late}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Absent</p><p className="text-2xl font-bold text-[var(--color-red)] mt-1">{employee.absent}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">WFH</p><p className="text-2xl font-bold text-[var(--color-blue)] mt-1">{employee.wfh}</p></div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Day-by-day · {activeSheet}</h3>
              <SheetPicker />
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-2 text-xs">
              {dateCols.map(c => (
                <div key={c} className="flex flex-col items-center gap-1 p-2 rounded bg-black/20">
                  <span className="text-[var(--color-text-muted)] text-[10px]">{c}</span>
                  <StatusBadge value={row?.[c]} />
                </div>
              ))}
              {dateCols.length === 0 && <div className="col-span-full text-center text-[var(--color-text-muted)] py-4">No date columns detected.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
