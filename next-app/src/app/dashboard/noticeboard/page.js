'use client';

import { useState } from 'react';
import NoticesPanel from '@/components/noticeboard/NoticesPanel';
import HolidaysPanel from '@/components/noticeboard/HolidaysPanel';

// Notice Board and Holidays now live in one section as two tabs.
const TABS = [
  { key: 'notices', label: 'Notice Board', Panel: NoticesPanel },
  { key: 'holidays', label: 'Holidays', Panel: HolidaysPanel },
];

// Read the initial tab from ?tab= so the old per-page routes can deep-link here.
function initialTab() {
  if (typeof window === 'undefined') return 'notices';
  const t = new URLSearchParams(window.location.search).get('tab');
  return TABS.some((x) => x.key === t) ? t : 'notices';
}

export default function NoticeBoardPage() {
  const [tab, setTab] = useState(initialTab);
  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const Panel = active.Panel;

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
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

      <Panel />
    </div>
  );
}
