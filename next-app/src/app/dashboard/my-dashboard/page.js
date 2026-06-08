'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import MonthNav from '@/components/MonthNav';
import MonthCalendar from '@/components/MonthCalendar';
import KpiCard from '@/components/KpiCard';
import Avatar from '@/components/Avatar';
import { employeeCalendarMonth, bdDateKey, approvedLeaveDays } from '@/lib/attend';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function timeFmt(ms) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms));
  } catch {
    return '—';
  }
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-card-border)] py-1 last:border-0">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[var(--color-text-main)] truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

export default function MyDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [leave, setLeave] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [office, setOffice] = useState(null);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, aRes, lRes, hRes, oRes, asRes] = await Promise.all([
        fetch('/api/me/profile', { headers, cache: 'no-store' }),
        fetch('/api/me/attendance?limit=1000', { headers, cache: 'no-store' }),
        fetch('/api/me/leave', { headers, cache: 'no-store' }),
        fetch('/api/holidays', { headers, cache: 'no-store' }),
        fetch('/api/me/office', { headers, cache: 'no-store' }),
        fetch('/api/me/asset', { headers, cache: 'no-store' }),
      ]);
      const aJson = await aRes.json();
      if (!aRes.ok) throw new Error(aJson.error || `HTTP ${aRes.status}`);
      setEvents(aJson.events || []);
      const pJson = await pRes.json(); if (pRes.ok) setProfile(pJson.profile || null);
      const lJson = await lRes.json(); if (lRes.ok) setLeave(lJson.requests || []);
      const hJson = await hRes.json(); if (hRes.ok) setHolidays(hJson.holidays || []);
      const oJson = await oRes.json(); if (oRes.ok) setOffice(oJson || null);
      const asJson = await asRes.json(); if (asRes.ok) setAssets(asJson.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cal = useMemo(
    () => employeeCalendarMonth(events, leave, holidays, ym.y, ym.m),
    [events, leave, holidays, ym],
  );

  const today = useMemo(() => {
    const tk = bdDateKey(new Date());
    let inTs = null, outTs = null;
    for (const e of events || []) {
      if (!e.timestamp || bdDateKey(e.timestamp) !== tk) continue;
      const ts = new Date(e.timestamp).getTime();
      if (e.type === 'CHECK_IN') { if (inTs === null || ts < inTs) inTs = ts; }
      else if (e.type === 'CHECK_OUT') { if (outTs === null || ts > outTs) outTs = ts; }
    }
    return { inTs, outTs };
  }, [events]);

  const leaveStats = useMemo(() => {
    const yr = String(ym.y);
    const list = leave || [];
    // Taken = approved-leave days in the year, excluding Fridays & holidays.
    const takenDays = approvedLeaveDays(list, holidays, ym.y);
    const pending = list.filter((r) => r.status === 'pending').length;
    const rejected = list.filter((r) => r.status === 'rejected' && String(r.fromDay || '').slice(0, 4) === yr).length;
    return { takenDays, pending, rejected };
  }, [leave, holidays, ym]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My Dashboard"
        subtitle="Your attendance & leave at a glance"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Avatar image={profile?.photoUrl} initials={initials(profile?.name)} alt={profile?.name || ''} className="w-16 h-16 text-lg shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)] truncate">{profile?.name || '—'}</h2>
              <p className="text-xs text-[var(--color-text-muted)] capitalize">{(profile?.role || '').toLowerCase() || '—'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Employee ID" value={profile?.employeeId || '—'} />
            <Row label="Department" value={profile?.teamName || '—'} />
            <Row label="Branch" value={office?.name || '—'} />
            <Row label="Joining date" value={fmtDate(profile?.joiningDate)} />
            <Row label="Email" value={profile?.email || '—'} />
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-main)]">At a Glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard label="Leave Spent" value={loading ? '…' : leaveStats.takenDays} color="purple" />
            <KpiCard label="Visit Taken" value={0} color="blue" />
            <KpiCard label="Missed Attendance" value={loading ? '…' : cal.counts.missed} color="red" />
            <KpiCard label="Pending Approval" value={loading ? '…' : leaveStats.pending} color="yellow" />
            <KpiCard label="Asset Assigned" value={loading ? '…' : (assets || []).filter((a) => a.status === 'approved').length} color="green" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">In Time (today)</p>
            <p className="text-2xl font-bold text-[var(--color-green)] mt-1">{today.inTs ? timeFmt(today.inTs) : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-muted)]">Out Time (today)</p>
            <p className="text-2xl font-bold text-[var(--color-red)] mt-1">{today.outTs ? timeFmt(today.outTs) : '—'}</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-3">Leave Overview · {ym.y}</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-[var(--color-text-muted)]">Taken</p><p className="text-xl font-bold text-[var(--color-green)] mt-1">{loading ? '…' : leaveStats.takenDays}</p></div>
            <div><p className="text-xs text-[var(--color-text-muted)]">Pending</p><p className="text-xl font-bold text-[var(--color-yellow)] mt-1">{loading ? '…' : leaveStats.pending}</p></div>
            <div><p className="text-xs text-[var(--color-text-muted)]">Rejected</p><p className="text-xl font-bold text-[var(--color-red)] mt-1">{loading ? '…' : leaveStats.rejected}</p></div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-2">Attendance Overview</h2>
        <MonthCalendar cal={cal} loading={loading} compact />
      </div>
    </div>
  );
}
