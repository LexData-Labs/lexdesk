'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import EmployeeAvatar from '@/components/EmployeeAvatar';
import { useAttendData } from '@/lib/useAttendData';
import { eventsForUser, perEmployeeStats, fmtTime, isLateCheckIn } from '@/lib/attend';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const employeeId = decodeURIComponent(id);
  const { employees, events, loading, error, refresh } = useAttendData(['employees', 'attendance']);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setAvatar(localStorage.getItem('avatar-' + employeeId));
  }, [employeeId]);

  const employee = useMemo(
    () => (employees || []).find((e) => String(e.id) === employeeId) || null,
    [employees, employeeId],
  );
  const stats = useMemo(
    () => perEmployeeStats(events)[employeeId] || { checkIns: 0, late: 0, lastCheckIn: null },
    [events, employeeId],
  );
  const myEvents = useMemo(
    () =>
      eventsForUser(events, employeeId)
        .filter((e) => e.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [events, employeeId],
  );

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB'); return; }
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
        subtitle="Employee profile · AttendDesk"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/dashboard/employees" className="btn-outline py-1.5 px-3 text-sm">Back</Link>
            <button onClick={refresh} className="btn-outline py-1.5 px-3 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}
      {loading && !employee && <div className="card text-[var(--color-text-muted)] text-sm">Loading…</div>}
      {!loading && !employee && <div className="card text-[var(--color-text-muted)] text-sm">Employee not found.</div>}

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
              <h2 className="text-xl font-semibold text-[var(--color-text-main)]">{employee.name}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">{employee.email}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 capitalize">
                {(employee.role || '').toLowerCase()}{employee.faceEnrolledAt ? ' · face enrolled' : ''}
              </p>
              <div className="flex gap-3 mt-3">
                <label className="btn-outline py-1.5 px-3 text-xs cursor-pointer">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                {avatar && <button onClick={removeAvatar} className="btn-outline py-1.5 px-3 text-xs text-[var(--color-red)] border-[rgba(239,68,68,0.3)]">Remove</button>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Check-ins</p><p className="text-2xl font-bold text-[var(--color-green)] mt-1">{stats.checkIns}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Late</p><p className="text-2xl font-bold text-[var(--color-yellow)] mt-1">{stats.late}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Last seen</p><p className="text-sm font-semibold text-[var(--color-text-main)] mt-2">{stats.lastCheckIn ? fmtTime(stats.lastCheckIn) : '—'}</p></div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-[var(--color-card-border)]">
              <h3 className="font-semibold text-lg">Check-in / out history</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                    <th className="py-3 px-5 font-medium">When</th>
                    <th className="py-3 px-5 font-medium">Type</th>
                    <th className="py-3 px-5 font-medium">Status</th>
                    <th className="py-3 px-5 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {myEvents.slice(0, 100).map((e) => (
                    <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                      <td className="py-3 px-5 whitespace-nowrap">{fmtTime(new Date(e.timestamp).getTime())}</td>
                      <td className="py-3 px-5">{e.type === 'CHECK_IN' ? 'Check in' : e.type === 'CHECK_OUT' ? 'Check out' : e.type}</td>
                      <td className="py-3 px-5">{isLateCheckIn(e) ? <span className="text-[var(--color-yellow)]">Late</span> : <span className="text-[var(--color-green)]">On time</span>}</td>
                      <td className="py-3 px-5 text-xs text-[var(--color-text-muted)]">{e.clientMode || 'mobile'}</td>
                    </tr>
                  ))}
                  {myEvents.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">No events yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
