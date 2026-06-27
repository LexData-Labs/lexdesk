'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAttendData } from '@/lib/useAttendData';
import { fmtTime, isLateCheckIn } from '@/lib/attend';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'CHECK_IN', label: 'Check in' },
  { key: 'CHECK_OUT', label: 'Check out' },
  { key: 'late', label: 'Late' },
];
const PAGE_SIZE = 25;

export default function AttendancePage() {
  const { events, loading, error, refresh } = useAttendData(['attendance']);
  const [tab, setTab] = useState('events');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () =>
      [...(events || [])]
        .filter((e) => e.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [events],
  );

  // Recent activity = the latest handful of events, regardless of filters.
  const recent = useMemo(() => sorted.slice(0, 12), [sorted]);

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
    const rows = filtered.map((e) => [
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
    const csv = [head, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-events.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        subtitle={tab === 'events' ? `${filtered.length} events` : 'Latest check-in / check-out activity'}
        actions={<button onClick={refresh} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="card flex flex-wrap items-center gap-2">
        {[
          { key: 'events', label: 'Events' },
          { key: 'recent', label: 'Recent activity' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${
              tab === t.key
                ? 'bg-[rgba(150,150,150,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]'
                : 'btn-outline'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'events' ? (
        <>
          <div className="card flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by employee…"
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
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-[var(--color-card-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Recent activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                  <th className="py-3 px-5 font-medium">Employee</th>
                  <th className="py-3 px-5 font-medium">When</th>
                  <th className="py-3 px-5 font-medium">Type</th>
                  <th className="py-3 px-5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && !recent.length && (
                  <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
                )}
                {!loading && recent.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">No recent activity.</td></tr>
                )}
                {recent.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                    <td className="py-3 px-5 text-[var(--color-text-main)]">{e.user?.name || e.user?.email || '—'}</td>
                    <td className="py-3 px-5 whitespace-nowrap">{fmtTime(new Date(e.timestamp).getTime())}</td>
                    <td className="py-3 px-5">{e.type === 'CHECK_IN' ? 'Check in' : e.type === 'CHECK_OUT' ? 'Check out' : e.type}</td>
                    <td className="py-3 px-5">
                      {isLateCheckIn(e) ? <span className="text-[var(--color-yellow)]">Late</span> : <span className="text-[var(--color-green)]">On time</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
