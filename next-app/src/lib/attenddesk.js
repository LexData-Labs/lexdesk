// AttendDesk external-API client. SERVER-ONLY — never import this into a
// 'use client' component or the API key leaks into the browser bundle.
// Call it from route handlers (see app/api/attenddesk/route.js) or server components.
const BASE = process.env.ATTENDDESK_API_BASE || 'https://attenddesk.vercel.app/api/external/v1';

function key() {
  const k = process.env.ATTENDDESK_API_KEY;
  if (!k) throw Object.assign(new Error('ATTENDDESK_API_KEY is not set in .env.local'), { status: 500 });
  return k;
}

/**
 * Call an AttendDesk external endpoint.
 * @param {string} path  e.g. "/attendance" (relative to ATTENDDESK_API_BASE)
 * @param {{ method?: string, query?: Record<string, unknown>, body?: unknown }} [opts]
 * @returns parsed JSON; throws Error (with .status and .body) on non-2xx.
 */
export async function adk(path, { method = 'GET', query, body } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key()}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || `attenddesk_${res.status}`), { status: res.status, body: data });
  return data;
}

// Convenience wrappers — your key must hold the scope shown in each comment.
export const getMe = () => adk('/me');
export const getPolicy = () => adk('/policy'); // policy:read
export const updatePolicy = (body) => adk('/policy', { method: 'POST', body }); // policy:write
export const getOffice = () => adk('/office'); // office:read
export const updateOffice = (body) => adk('/office', { method: 'POST', body }); // office:write
export const getEmployees = () => adk('/employees'); // employees:read
export const getAttendance = (query = {}) => adk('/attendance', { query }); // attendance:read
export const checkIn = (body) => adk('/attendance/check-in', { method: 'POST', body }); // attendance:write
export const getLeaveRequests = (query = {}) => adk('/leave-requests', { query }); // leaves:read

// Submit a leave request. Body: { userId, fromDay, toDay, subject, details? }
// (days are YYYY-MM-DD). Requires the 'leaves:write' scope.
export const submitLeave = (body) => adk('/leave-requests', { method: 'POST', body });

// Approve/reject a pending leave request (admin). decision: 'approved'|'rejected'.
// Requires the 'leaves:approve' scope.
export const decideLeave = (id, decision, note) =>
  adk(`/leave-requests/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { decision, note } });

// Custom org holidays (pink on the calendar). Each is an inclusive [fromDay,toDay]
// day range (YYYY-MM-DD) + name. read = 'holidays:read', write = 'holidays:write'.
export const getHolidays = () => adk('/holidays');
export const createHoliday = (body) => adk('/holidays', { method: 'POST', body });
export const deleteHoliday = (id) =>
  adk(`/holidays/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Change a user's password (verifies their current password first).
// Requires the 'auth:verify' scope.
export const changePassword = (email, currentPassword, newPassword) =>
  adk('/auth/change-password', { method: 'POST', body: { email, currentPassword, newPassword } });

// Update a user's display name. Requires the 'employees:write' scope.
export const updateName = (email, name) =>
  adk('/auth/update-profile', { method: 'POST', body: { email, name } });

// Upload a user's profile photo (dataUrl = base64 data URL). Writes to Firebase
// Storage on the AttendDesk side. Requires the 'employees:write' scope.
export const uploadPhoto = (email, dataUrl) =>
  adk('/auth/update-photo', { method: 'POST', body: { email, dataUrl } });

// Verify an employee's email + password against AttendDesk (partner SSO).
// Requires the API key to hold the 'auth:verify' scope. Resolves to
// { valid:false } for bad credentials (HTTP 200) and throws (with .status) for
// scope/rate-limit/upstream errors (403/429/502/503).
export const verifyCredentials = (email, password) =>
  adk('/auth/verify-credentials', { method: 'POST', body: { email, password } });
