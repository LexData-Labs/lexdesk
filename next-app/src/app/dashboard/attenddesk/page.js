'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

// Every resource the /api/attenddesk route exposes. `query` is appended verbatim.
const RESOURCES = [
  { key: 'me', label: 'Connection' },
  { key: 'employees', label: 'Employees' },
  { key: 'attendance', label: 'Attendance events', query: 'limit=100' },
  { key: 'leaveRequests', label: 'Leave requests' },
  { key: 'policy', label: 'Policy' },
  { key: 'office', label: 'Office' },
];

const isPrimitive = (v) => v === null || v === undefined || typeof v !== 'object';

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

// Generic auto-table for an array of objects (columns = union of all keys).
function DataTable({ rows }) {
  if (!rows.length) return <p className="text-sm text-[var(--color-text-muted)]">No records.</p>;
  const cols = Array.from(
    rows.reduce((set, r) => { Object.keys(r || {}).forEach((k) => set.add(k)); return set; }, new Set()),
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
            {cols.map((c) => <th key={c} className="py-2 px-3 font-medium whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02] align-top">
              {cols.map((c) => (
                <td key={c} className="py-2 px-3 text-[var(--color-text-main)] whitespace-nowrap">
                  {isPrimitive(r?.[c])
                    ? fmt(r?.[c])
                    : <code className="text-xs text-[var(--color-text-muted)]">{JSON.stringify(r[c])}</code>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Generic key/value view; arrays of objects become nested tables.
function ObjectView({ obj }) {
  return (
    <div className="flex flex-col">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[180px_1fr] gap-3 text-sm border-b border-[var(--color-card-border)] py-1.5 last:border-0">
          <div className="text-[var(--color-text-muted)] break-words">{k}</div>
          <div className="text-[var(--color-text-main)] break-words min-w-0">
            {Array.isArray(v)
              ? (v.every(isPrimitive) ? (v.join(', ') || '—') : <DataTable rows={v} />)
              : isPrimitive(v) ? fmt(v) : <ObjectView obj={v} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function Resource({ data }) {
  if (data == null) return <p className="text-sm text-[var(--color-text-muted)]">No data.</p>;
  if (Array.isArray(data)) return <DataTable rows={data} />;
  return <ObjectView obj={data} />;
}

function countOf(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') {
    const arr = Object.values(data).find(Array.isArray);
    if (arr) return arr.length;
  }
  return null;
}

export default function AttendDeskPage() {
  const [state, setState] = useState({}); // { [key]: { loading?, data?, error? } }

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    setState(Object.fromEntries(RESOURCES.map((r) => [r.key, { loading: true }])));
    await Promise.all(
      RESOURCES.map(async (r) => {
        try {
          const qs = `resource=${r.key}${r.query ? '&' + r.query : ''}`;
          const res = await fetch(`/api/attenddesk?${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          setState((s) => ({ ...s, [r.key]: { data: json } }));
        } catch (err) {
          setState((s) => ({ ...s, [r.key]: { error: err.message } }));
        }
      }),
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AttendDesk Data"
        subtitle="Live from attenddesk.vercel.app — everything your API key can read"
        actions={<button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {RESOURCES.map((r) => {
        const st = state[r.key] || {};
        const count = st.data != null ? countOf(st.data) : null;
        return (
          <section key={r.key} className="card">
            <h2 className="text-lg font-semibold text-[var(--color-text-main)] mb-3">
              {r.label}
              {typeof count === 'number' && (
                <span className="text-sm text-[var(--color-text-muted)] font-normal"> · {count}</span>
              )}
            </h2>
            {st.loading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
            {st.error && <p className="text-sm text-[var(--color-red)]">{st.error}</p>}
            {st.data != null && <Resource data={st.data} />}
          </section>
        );
      })}
    </div>
  );
}
