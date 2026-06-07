'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import MonthNav from '@/components/MonthNav';
import MonthCalendar from '@/components/MonthCalendar';
import { employeeCalendarMonth } from '@/lib/attend';

export default function MyCalendarPage() {
  const [events, setEvents] = useState([]);
  const [leave, setLeave] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [attRes, lvRes, holRes] = await Promise.all([
        fetch('/api/me/attendance?limit=1000', { headers, cache: 'no-store' }),
        fetch('/api/me/leave', { headers, cache: 'no-store' }),
        fetch('/api/holidays', { headers, cache: 'no-store' }),
      ]);
      const attJson = await attRes.json();
      if (!attRes.ok) throw new Error(attJson.error || `HTTP ${attRes.status}`);
      setEvents(attJson.events || []);
      const lvJson = await lvRes.json();
      if (lvRes.ok) setLeave(lvJson.requests || []);
      const holJson = await holRes.json();
      if (holRes.ok) setHolidays(holJson.holidays || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cal = useMemo(
    () => employeeCalendarMonth(events, leave, holidays, ym.y, ym.m),
    [events, leave, holidays, ym],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        subtitle="Your month at a glance — attendance, leave & holidays"
        actions={
          <div className="flex items-center gap-2">
            <MonthNav value={ym} onChange={setYm} />
            <button onClick={load} className="btn-outline py-2 px-4 text-sm">Refresh</button>
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <MonthCalendar cal={cal} loading={loading} />
    </div>
  );
}
