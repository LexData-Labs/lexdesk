'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import MonthNav from '@/components/MonthNav';
import MonthCalendar from '@/components/MonthCalendar';
import {
  perEmployeeStats,
  employeeCalendarMonth,
  eventsForUser,
  isLateCheckIn,
  fmtTime,
  inBdMonth,
} from '@/lib/attend';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'CHECK_IN', label: 'Check in' },
  { key: 'CHECK_OUT', label: 'Check out' },
  { key: 'late', label: 'Late' },
];
const PAGE_SIZE = 25;

// Team lead's view of their members' attendance: month summary table, a
// per-member calendar, and a team-scoped event log. Leadership is enforced
// server-side by /api/team/attendance — this page just renders what it gets.
export default function TeamAttendancePage() {
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  // Start true so the "not a leader" card never flashes before the first load.
  const [isLeader, setIsLeader] = useState(true);
  const [leave, setLeave] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Manual attendance entry (lead / admin).
  const [showAdd, setShowAdd] = useState(false);
  const [addUid, setAddUid] = useState('');
  const [addType, setAddType] = useState('CHECK_IN');
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('09:00');
  const [addNote, setAddNote] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState('');
  // Add team member (a lead creates an EMPLOYEE auto-joined to their team).
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', employeeId: '', teamId: '' });
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberErr, setMemberErr] = useState('');
  const [memberCreated, setMemberCreated] = useState(null); // { email, temporaryPassword }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      // ±1 day fetch buffer so the Asia/Dhaka offset never clips edge days;
      // the exact month is re-filtered client-side (same as useAttendData).
      const from = new Date(Date.UTC(ym.y, ym.m, 1));
      from.setUTCDate(from.getUTCDate() - 1);
      const to = new Date(Date.UTC(ym.y, ym.m + 1, 1));
      to.setUTCDate(to.getUTCDate() + 1);
      const res = await fetch(
        `/api/team/attendance?limit=1000&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setEvents(json.events || []);
      setMembers(json.members || []);
      setTeams(json.teams || []);
      setIsLeader(json.isLeader !== false);
      setPage(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ym]);

  useEffect(() => { load(); }, [load]);

  // Calendar overlays: approved leave for the lead's members + org holidays.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/team/leave?status=approved', { headers, cache: 'no-store' }).then((r) => (r.ok ? r.json() : { requests: [] })),
      fetch('/api/holidays', { headers, cache: 'no-store' }).then((r) => (r.ok ? r.json() : { holidays: [] })),
    ])
      .then(([l, h]) => { setLeave(l.requests || []); setHolidays(h.holidays || []); })
      .catch(() => {});
  }, []);

  const monthEvents = useMemo(
    () => (events || []).filter((e) => e.timestamp && inBdMonth(e.timestamp, ym.y, ym.m)),
    [events, ym],
  );
  const stats = useMemo(() => perEmployeeStats(monthEvents), [monthEvents]);
  const rows = useMemo(
    () =>
      [...members]
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map((m) => ({ ...m, ...(stats[m.id] || { presentDays: 0, lateDays: 0, onTimeDays: 0, lastCheckIn: 0 }) })),
    [members, stats],
  );

  // Effective selection is DERIVED: falls back to the first member when
  // nothing is selected yet or the roster changed under a stale selection.
  const effectiveUid = useMemo(
    () => (members.some((m) => m.id === selectedUid) ? selectedUid : members[0]?.id || ''),
    [members, selectedUid],
  );

  const selected = useMemo(() => members.find((m) => m.id === effectiveUid) || null, [members, effectiveUid]);
  const selectedCal = useMemo(() => {
    if (!effectiveUid) return null;
    const memberLeave = (leave || []).filter((r) => String(r.uid) === String(effectiveUid));
    return employeeCalendarMonth(eventsForUser(monthEvents, effectiveUid), memberLeave, holidays, ym.y, ym.m);
  }, [effectiveUid, monthEvents, leave, holidays, ym]);

  // Event log — mirrors the admin attendance page, scoped to this team+month.
  const sorted = useMemo(
    () => [...monthEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [monthEvents],
  );
  const filtered = useMemo(() => {
    let list = sorted;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) => (e.user?.name || '').toLowerCase().includes(q) || (e.user?.email || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'late') list = list.filter(isLateCheckIn);
    else if (filter) list = list.filter((e) => e.type === filter);
    return list;
  }, [sorted, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const head = ['Employee', 'Email', 'When', 'Type', 'Status', 'AllChecksPassed', 'Source'];
    const csvRows = filtered.map((e) => [
      e.user?.name || '',
      e.user?.email || '',
      e.timestamp ? new Date(e.timestamp).toISOString() : '',
      e.type,
      isLateCheckIn(e) ? 'late' : e.isEarly ? 'early' : 'on-time',
      e.allChecksPassed === false ? 'no' : 'yes',
      e.clientMode || 'mobile',
    ]);
    const escape = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [head, ...csvRows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-attendance-${ym.y}-${String(ym.m + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAdd = () => {
    setAddErr('');
    setAddUid(effectiveUid || members[0]?.id || '');
    setAddType('CHECK_IN');
    const d = new Date();
    setAddDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setAddTime('09:00');
    setAddNote('');
    setShowAdd(true);
  };

  const submitManual = async (e) => {
    e.preventDefault();
    setAddErr('');
    if (!addUid) { setAddErr('Pick a team member.'); return; }
    if (!addDate || !addTime) { setAddErr('Date and time are required.'); return; }
    setAddBusy(true);
    try {
      const token = localStorage.getItem('token');
      // Interpret the entered time as office time (Asia/Dhaka = UTC+6, no DST).
      const at = `${addDate}T${addTime}:00+06:00`;
      const res = await fetch('/api/team/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: addUid, type: addType, at, note: addNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setShowAdd(false);
      await load();
    } catch (e2) {
      setAddErr(e2.message);
    } finally {
      setAddBusy(false);
    }
  };

  const openAddMember = () => {
    setMemberErr('');
    setMemberCreated(null);
    setMemberForm({ name: '', email: '', employeeId: '', teamId: teams[0]?.id || '' });
    setShowAddMember(true);
  };

  const submitAddMember = async (e) => {
    e.preventDefault();
    setMemberErr('');
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      setMemberErr('Name and email are required.');
      return;
    }
    setMemberBusy(true);
    try {
      const token = localStorage.getItem('token');
      // teamId is optional when leading one team (the server auto-assigns it);
      // sent explicitly only when the lead picks among several teams.
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: memberForm.name.trim(),
          email: memberForm.email.trim(),
          employeeId: memberForm.employeeId.trim() || null,
          teamId: memberForm.teamId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const emp = json.employee || {};
      setMemberCreated({ email: emp.email || memberForm.email.trim(), temporaryPassword: emp.temporaryPassword || '' });
      await load();
    } catch (e2) {
      setMemberErr(e2.message);
    } finally {
      setMemberBusy(false);
    }
  };

  const closeAddMember = () => {
    setShowAddMember(false);
    setMemberCreated(null);
    setMemberErr('');
  };

  const addInputCls =
    'bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Attendance"
        subtitle={isLeader ? `${members.length} team member${members.length === 1 ? '' : 's'}` : 'Your team at a glance'}
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            {isLeader && (
              <button onClick={openAddMember} className="btn-primary py-2 px-4 text-sm">+ Add member</button>
            )}
            {isLeader && members.length > 0 && (
              <button onClick={openAdd} className="btn-outline py-2 px-4 text-sm">+ Add attendance</button>
            )}
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <form onSubmit={submitManual} onClick={(e) => e.stopPropagation()} className="card glossy w-full max-w-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Add attendance</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-lg leading-none" aria-label="Close">✕</button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] -mt-2">Manual entries count as verified attendance and are tagged as manually added.</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Team member</label>
              <select value={addUid} onChange={(e) => setAddUid(e.target.value)} className={addInputCls}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Type</label>
                <select value={addType} onChange={(e) => setAddType(e.target.value)} className={addInputCls}>
                  <option value="CHECK_IN">Check in</option>
                  <option value="CHECK_OUT">Check out</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Date</label>
                <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className={addInputCls} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Time</label>
                <input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className={addInputCls} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Note (optional)</label>
              <input type="text" maxLength={200} value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="e.g. Forgot to check in" className={addInputCls} />
            </div>
            {addErr && <p className="text-sm text-[var(--color-red)]">{addErr}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-outline py-2 px-4 text-sm">Cancel</button>
              <button type="submit" disabled={addBusy} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">{addBusy ? 'Adding…' : 'Add attendance'}</button>
            </div>
          </form>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeAddMember}>
          <div className="card glossy w-full max-w-lg flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Add team member</h2>
              <button onClick={closeAddMember} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-lg leading-none" aria-label="Close">✕</button>
            </div>

            {memberCreated ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--color-green)]">Employee created and added to your team. Share these sign-in details — they must change the password on first login.</p>
                <div className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg p-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-[var(--color-text-muted)]">Email</span><span className="text-[var(--color-text-main)]">{memberCreated.email}</span></div>
                  <div className="flex justify-between gap-3 mt-1"><span className="text-[var(--color-text-muted)]">Temp password</span><span className="text-[var(--color-text-main)] font-mono">{memberCreated.temporaryPassword || '—'}</span></div>
                </div>
                <div className="flex justify-end">
                  <button onClick={closeAddMember} className="btn-primary py-2 px-5 text-sm">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitAddMember} className="flex flex-col gap-4">
                <p className="text-xs text-[var(--color-text-muted)] -mt-1">New members join {teams.length > 1 ? 'the team you pick below' : 'your team'} and get a temporary password to share.</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Full name</label>
                  <input type="text" maxLength={120} value={memberForm.name} onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))} className={addInputCls} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Email</label>
                  <input type="email" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} className={addInputCls} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Employee ID</label>
                  <input type="text" maxLength={50} value={memberForm.employeeId} onChange={(e) => setMemberForm((f) => ({ ...f, employeeId: e.target.value }))} placeholder="e.g. 700036 (optional)" className={addInputCls} />
                </div>
                {teams.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--color-text-muted)]">Team</label>
                    <select value={memberForm.teamId} onChange={(e) => setMemberForm((f) => ({ ...f, teamId: e.target.value }))} className={addInputCls}>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                {memberErr && <p className="text-sm text-[var(--color-red)]">{memberErr}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={closeAddMember} className="btn-outline py-2 px-4 text-sm">Cancel</button>
                  <button type="submit" disabled={memberBusy} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">{memberBusy ? 'Creating…' : 'Create employee'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {!loading && !isLeader ? (
        <div className="card text-sm text-[var(--color-text-muted)]">
          You don&apos;t lead a team yet. When an admin makes you a team leader, your team&apos;s attendance appears here.
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                    <th className="py-3 px-4 font-medium">Member</th>
                    <th className="py-3 px-4 font-medium">Team</th>
                    <th className="py-3 px-4 font-medium">Present</th>
                    <th className="py-3 px-4 font-medium">Late</th>
                    <th className="py-3 px-4 font-medium">On time</th>
                    <th className="py-3 px-4 font-medium">Last check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !rows.length && (
                    <tr><td colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">No members in your team yet.</td></tr>
                  )}
                  {rows.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedUid(m.id)}
                      className={`border-t border-[var(--color-card-border)] cursor-pointer hover:bg-white/[0.02] ${
                        m.id === effectiveUid ? 'bg-[rgba(150,150,150,0.08)]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <div className="text-[var(--color-text-main)]">{m.name || '—'}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{m.email}</div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">{m.teamName || '—'}</td>
                      <td className="py-2.5 px-4 text-[var(--color-green)]">{m.presentDays}</td>
                      <td className="py-2.5 px-4 text-[var(--color-yellow)]">{m.lateDays}</td>
                      <td className="py-2.5 px-4 text-[var(--color-text-main)]">{m.onTimeDays}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-xs text-[var(--color-text-muted)]">
                        {m.lastCheckIn ? fmtTime(m.lastCheckIn) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedCal && (
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-2">
                {selected?.name || 'Member'} · attendance calendar
              </h2>
              <MonthCalendar cal={selectedCal} loading={loading} />
            </div>
          )}

          <div className="card flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by member…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 min-w-[200px] bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
            />
            <div className="flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key); setPage(1); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    filter === f.key
                      ? 'bg-[rgba(150,150,150,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]'
                      : 'bg-[var(--color-card-bg)] text-[var(--color-text-muted)] border border-[var(--color-card-border)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={exportCsv} disabled={!filtered.length} className="btn-outline py-2 px-3 text-xs disabled:opacity-50">
              Export CSV
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                    <th className="py-3 px-4 font-medium">Employee</th>
                    <th className="py-3 px-4 font-medium">When</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !pageRows.length && (
                    <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
                  )}
                  {!loading && pageRows.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No events match the current filters.</td></tr>
                  )}
                  {pageRows.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4">
                        <div className="text-[var(--color-text-main)]">{e.user?.name || '—'}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{e.user?.email}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{fmtTime(new Date(e.timestamp).getTime())}</td>
                      <td className="py-2.5 px-4">{e.type === 'CHECK_IN' ? 'Check in' : e.type === 'CHECK_OUT' ? 'Check out' : e.type}</td>
                      <td className="py-2.5 px-4">
                        {isLateCheckIn(e) ? <span className="text-[var(--color-yellow)]">Late</span> : e.isEarly ? <span className="text-[var(--color-blue)]">Early</span> : <span className="text-[var(--color-green)]">On time</span>}
                        {e.allChecksPassed === false && <span className="text-[var(--color-red)] ml-2">checks failed</span>}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[var(--color-text-muted)]">{e.clientMode || 'mobile'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-[var(--color-card-border)] text-xs text-[var(--color-text-muted)]">
              <span>Page {page} of {totalPages} · {filtered.length} events</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline py-1 px-3 disabled:opacity-30">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-outline py-1 px-3 disabled:opacity-30">Next</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
