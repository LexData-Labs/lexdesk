'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import LeaveApprovalsPanel from '@/components/approvals/LeaveApprovalsPanel';
import AssetApprovalsPanel from '@/components/approvals/AssetApprovalsPanel';
import RemoteApprovalsPanel from '@/components/approvals/RemoteApprovalsPanel';
import ReconApprovalsPanel from '@/components/approvals/ReconApprovalsPanel';

// Each approval type lives in its own tab under the single "Approvals" section.
const TABS = [
  { key: 'leave', label: 'Leave Approval', Panel: LeaveApprovalsPanel },
  { key: 'asset', label: 'Assets Approval', Panel: AssetApprovalsPanel },
  { key: 'remote', label: 'Remote Approval', Panel: RemoteApprovalsPanel },
  { key: 'recon', label: 'Reconciliation Approval', Panel: ReconApprovalsPanel },
];

// Read the initial tab from ?tab= so old per-type routes can deep-link here.
function initialTab() {
  if (typeof window === 'undefined') return 'leave';
  const t = new URLSearchParams(window.location.search).get('tab');
  return TABS.some((x) => x.key === t) ? t : 'leave';
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState(initialTab);
  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const Panel = active.Panel;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Approvals" subtitle="Review and decide all employee requests in one place" />

      <div className="card flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              tab === t.key
                ? 'bg-[rgba(150,150,150,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]'
                : 'btn-outline'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel />
    </div>
  );
}
