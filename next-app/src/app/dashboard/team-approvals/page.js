'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];
const STATUS_STYLE = {
  pending: 'text-[var(--color-yellow)]',
  approved: 'text-[var(--color-green)]',
  rejected: 'text-[var(--color-red)]',
  cancelled: 'text-[var(--color-text-muted)]',
};

function fmtRange(from, to) {
  if (!from) return '—';
  return from === to ? from : `${from} → ${to}`;
}

export default function TeamApprovalsPage() {
  const [mode, setMode] = useState('leave'); // 'leave' | 'asset'
  const [requests, setRequests] = useState(null);
  const [isLeader, setIsLeader] = useState(true);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const qs = status === 'all' ? '' : `?status=${status}`;
      const res = await fetch(`/api/team/${mode}${qs}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRequests(json.requests || []);
      setIsLeader(json.isLeader !== false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, mode]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, decision) => {
    let note = '';
    if (decision === 'rejected') {
      const r = prompt('Optional note for rejection:');
      if (r === null) return;
      note = r;
    }
    setBusyId(id);
    setError('');
    setFeedback('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/team/${mode}/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setFeedback(`Request ${decision}.`);
      setTimeout(() => setFeedback(''), 3000);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const list = requests || [];
  const isAsset = mode === 'asset';
  const isRemote = mode === 'remote';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Approvals"
        subtitle="Review and decide your team's leave, asset & remote requests"
        actions={<button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>}
      />

      {feedback && <div className="card text-[var(--color-green)] text-sm">{feedback}</div>}
      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      {!loading && !isLeader ? (
        <div className="card text-[var(--color-text-muted)] text-sm text-center py-12">
          You don’t lead a team yet. When an admin makes you a team leader, your team’s requests appear here.
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {['leave', 'asset', 'remote'].map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${mode === m ? 'bg-[rgba(150,150,150,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]' : 'btn-outline'}`}>
                  {m === 'asset' ? 'Assets' : m === 'remote' ? 'Remote' : 'Leave'}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-[var(--color-card-border)]" />
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${status === s ? 'bg-[rgba(150,150,150,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]' : 'btn-outline'}`}>{s}</button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                    <th className="py-3 px-4 font-medium">Employee</th>
                    <th className="py-3 px-4 font-medium">{isAsset ? 'Asset' : isRemote ? 'Day' : 'Dates'}</th>
                    <th className="py-3 px-4 font-medium">{isAsset ? 'Dates' : isRemote ? 'Reason' : 'Subject'}</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    // Asset: lead acts only while the lead side is still pending.
                    const canAct = isAsset
                      ? (r.status === 'pending' && r.leadStatus === 'pending')
                      : (r.status === 'pending');
                    return (
                      <tr key={r.id} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02] align-top">
                        <td className="py-3 px-4">
                          <div className="text-[var(--color-text-main)] font-medium">{r.userName || '—'}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{r.userEmail}</div>
                        </td>
                        {isAsset ? (
                          <td className="py-3 px-4">
                            <div className="text-[var(--color-text-main)]">{r.assetName || '—'}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">{r.assetType || '—'}{r.description ? ` · ${r.description}` : ''}</div>
                          </td>
                        ) : isRemote ? (
                          <td className="py-3 px-4 text-[var(--color-text-main)] whitespace-nowrap">{r.day || '—'}</td>
                        ) : (
                          <td className="py-3 px-4 text-[var(--color-text-main)] whitespace-nowrap">{fmtRange(r.fromDay, r.toDay)}</td>
                        )}
                        {isAsset ? (
                          <td className="py-3 px-4 text-[var(--color-text-main)] whitespace-nowrap">{fmtRange(r.fromDay, r.toDay)}</td>
                        ) : isRemote ? (
                          <td className="py-3 px-4">
                            <div className="text-[var(--color-text-main)] max-w-[260px]">{r.reason || '—'}</div>
                            {r.place && <div className="text-xs text-[var(--color-text-muted)]">{r.place}</div>}
                          </td>
                        ) : (
                          <td className="py-3 px-4">
                            <div className="text-[var(--color-text-main)]">{r.subject || '—'}</div>
                            {r.details && <div className="text-xs text-[var(--color-text-muted)] max-w-[260px]">{r.details}</div>}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className={`font-semibold capitalize ${STATUS_STYLE[r.status] || ''}`}>{r.status}</div>
                          {isAsset && (
                            <div className="text-[11px] text-[var(--color-text-muted)]">
                              Lead: <span className="capitalize">{r.leadStatus}</span> · Admin: <span className="capitalize">{r.adminStatus}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {canAct ? (
                            <div className="flex gap-2 justify-end">
                              <button disabled={busyId === r.id} onClick={() => decide(r.id, 'approved')} className="px-3 py-1 rounded text-xs font-semibold bg-[rgba(34,197,94,0.15)] text-[var(--color-green)] border border-[var(--color-green)] disabled:opacity-50">Approve</button>
                              <button disabled={busyId === r.id} onClick={() => decide(r.id, 'rejected')} className="px-3 py-1 rounded text-xs font-semibold bg-[rgba(239,68,68,0.12)] text-[var(--color-red)] border border-[rgba(239,68,68,0.4)] disabled:opacity-50">Reject</button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && list.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No {status === 'all' ? '' : status} {mode} requests for your team.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
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
