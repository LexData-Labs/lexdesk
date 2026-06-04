'use client';

import { useState, useEffect, useCallback } from 'react';

// Fetches org-wide AttendDesk data through the (admin-gated) /api/attenddesk
// proxy. Pass the resources a page needs, e.g. useAttendData(['employees','attendance']).
const RESOURCE_QUERY = {
  employees: 'resource=employees',
  attendance: 'resource=attendance&limit=1000',
  leaveRequests: 'resource=leaveRequests',
  policy: 'resource=policy',
  office: 'resource=office',
};

export function useAttendData(resources = ['employees', 'attendance']) {
  const key = resources.join(',');
  const [state, setState] = useState({
    employees: [],
    events: [],
    leave: [],
    loading: true,
    error: '',
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const token = localStorage.getItem('token');
      const list = key.split(',').filter(Boolean);
      const results = await Promise.all(
        list.map(async (r) => {
          const q = RESOURCE_QUERY[r] || `resource=${r}`;
          const res = await fetch(`/api/attenddesk?${q}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          return [r, json];
        }),
      );
      const next = { employees: [], events: [], leave: [], loading: false, error: '' };
      for (const [r, json] of results) {
        if (r === 'employees') next.employees = json.employees || [];
        else if (r === 'attendance') next.events = json.events || [];
        else if (r === 'leaveRequests') next.leave = json.requests || [];
      }
      setState(next);
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
