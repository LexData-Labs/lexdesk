'use client';

import { useState, useEffect, useCallback } from 'react';

// Fetches org-wide AttendDesk data through the (admin-gated) /api/attenddesk
// proxy. Pass the resources a page needs, e.g. useAttendData(['employees','attendance']).
// Pass { month: { y, m } } (m 0-11) to scope the attendance fetch to one month
// instead of pulling the latest 1000 events org-wide.
const RESOURCE_QUERY = {
  employees: 'resource=employees',
  attendance: 'resource=attendance&limit=1000',
  leaveRequests: 'resource=leaveRequests',
  policy: 'resource=policy',
  office: 'resource=office',
};

// ISO range covering an office-tz month, widened ±1 day so the Asia/Dhaka
// offset never clips edge days (callers filter to the exact month client-side).
function attendanceQuery(monthKey) {
  if (!monthKey) return RESOURCE_QUERY.attendance;
  const [y, m] = monthKey.split('-').map(Number);
  const from = new Date(Date.UTC(y, m, 1));
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(Date.UTC(y, m + 1, 1));
  to.setUTCDate(to.getUTCDate() + 1);
  return `resource=attendance&limit=1000&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

// Module-level cache shared across page mounts, so navigating the dashboard reuses
// recently-fetched data instead of re-reading Firestore on every mount (Spark quota).
// Keyed by resource-list + month; the explicit Refresh button forces a fresh read.
const _cache = new Map(); // key -> { at, data: { employees, events, leave } }
const CACHE_TTL_MS = 60_000;

export function useAttendData(resources = ['employees', 'attendance'], opts = {}) {
  const month = opts.month || null;
  const monthKey = month ? `${month.y}-${month.m}` : '';
  const key = `${resources.join(',')}|${monthKey}`;

  const [state, setState] = useState({
    employees: [],
    events: [],
    leave: [],
    loading: true,
    error: '',
  });

  const load = useCallback(async (force = false) => {
    const hit = _cache.get(key);
    if (!force && hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setState({ ...hit.data, loading: false, error: '' });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const token = localStorage.getItem('token');
      const [listStr, mk] = key.split('|');
      const list = listStr.split(',').filter(Boolean);
      const results = await Promise.all(
        list.map(async (r) => {
          const q = r === 'attendance' ? attendanceQuery(mk) : (RESOURCE_QUERY[r] || `resource=${r}`);
          const res = await fetch(`/api/attenddesk?${q}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          return [r, json];
        }),
      );
      const data = { employees: [], events: [], leave: [] };
      for (const [r, json] of results) {
        if (r === 'employees') data.employees = json.employees || [];
        else if (r === 'attendance') data.events = json.events || [];
        else if (r === 'leaveRequests') data.leave = json.requests || [];
      }
      _cache.set(key, { at: Date.now(), data });
      setState({ ...data, loading: false, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  // Explicit Refresh / post-mutation always bypasses the cache.
  const refresh = useCallback(() => load(true), [load]);

  return { ...state, refresh };
}
