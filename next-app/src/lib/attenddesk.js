// AttendDesk external-API client. SERVER-ONLY — never import this into a
// 'use client' component or the API key leaks into the browser bundle.
// Call it from route handlers (see app/api/attenddesk/route.js) or server components.
const BASE = process.env.ATTENDDESK_API_BASE || 'https://attenddesk.vercel.app/api/external/v1';

function key() {
  const k = process.env.ATTENDDESK_API_KEY;
  if (!k) throw Object.assign(new Error('ATTENDDESK_API_KEY is not set in .env.local'), { status: 500 });
  return k;
}

// Tiny in-memory TTL cache for GETs that are identical across all users
// (employees roster, holidays, office, policy). Dedupes bursts (e.g. the 9am
// peak) so 10 admins + many employees don't each re-pull the same org data.
// Caveat: per warm serverless instance only — not shared across instances; a
// shared cache (Redis/Upstash) is the next step if you outgrow this. ANY
// mutating call (POST/PATCH/DELETE) flushes the whole cache so admin actions
// reflect immediately.
const _cache = new Map(); // urlString -> { expires, data }
function cacheGet(urlStr) {
  const e = _cache.get(urlStr);
  if (e && e.expires > Date.now()) return e.data;
  if (e) _cache.delete(urlStr);
  return undefined;
}

/**
 * Call an AttendDesk external endpoint.
 * @param {string} path  e.g. "/attendance" (relative to ATTENDDESK_API_BASE)
 * @param {{ method?: string, query?: Record<string, unknown>, body?: unknown, ttl?: number }} [opts]
 *   ttl (ms) caches the GET response in-memory; mutations always flush the cache.
 * @returns parsed JSON; throws Error (with .status and .body) on non-2xx.
 */
export async function adk(path, { method = 'GET', query, body, ttl = 0 } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, String(v));
  const urlStr = url.toString();

  if (method === 'GET' && ttl > 0) {
    const hit = cacheGet(urlStr);
    if (hit !== undefined) return hit;
  }

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key()}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || `attenddesk_${res.status}`), { status: res.status, body: data });

  if (method === 'GET') {
    if (ttl > 0) _cache.set(urlStr, { expires: Date.now() + ttl, data });
  } else {
    _cache.clear(); // a write happened — drop all cached reads
  }
  return data;
}

// Convenience wrappers — your key must hold the scope shown in each comment.
export const getMe = () => adk('/me');
export const getPolicy = () => adk('/policy', { ttl: 300000 }); // policy:read (5 min)
export const updatePolicy = (body) => adk('/policy', { method: 'POST', body }); // policy:write
export const getOffice = () => adk('/office', { ttl: 300000 }); // office:read (5 min)
export const updateOffice = (body) => adk('/office', { method: 'POST', body }); // office:write
export const getEmployees = () => adk('/employees', { ttl: 30000 }); // employees:read (30s)
export const getEmployee = (uid) => adk(`/employees/${encodeURIComponent(uid)}`); // employees:read (single)
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

// Asset requests (dual approval: team lead + admin). read='assets:read',
// write='assets:write', approve='assets:approve'.
export const getAssetRequests = (query = {}) => adk('/asset-requests', { query });
export const createAssetRequest = (body) => adk('/asset-requests', { method: 'POST', body });
export const decideAssetRequest = (id, side, decision, note) =>
  adk(`/asset-requests/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { side, decision, note } });

// Custom org holidays (pink on the calendar). Each is an inclusive [fromDay,toDay]
// day range (YYYY-MM-DD) + name. read = 'holidays:read', write = 'holidays:write'.
export const getHolidays = () => adk('/holidays', { ttl: 60000 }); // 60s
export const createHoliday = (body) => adk('/holidays', { method: 'POST', body });
export const deleteHoliday = (id) =>
  adk(`/holidays/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Teams. read = 'teams:read', write = 'teams:write'.
export const getTeams = () => adk('/teams');
export const createTeam = (body) => adk('/teams', { method: 'POST', body });
export const updateTeam = (id, body) =>
  adk(`/teams/${encodeURIComponent(id)}`, { method: 'PATCH', body });
export const deleteTeam = (id) =>
  adk(`/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Provision a real employee account (returns a temporary password). 'employees:write'.
export const createEmployee = (body) => adk('/employees', { method: 'POST', body });
// Assign/clear an employee's team. 'employees:write'.
export const setEmployeeTeam = (uid, teamId) =>
  adk(`/employees/${encodeURIComponent(uid)}`, { method: 'PATCH', body: { teamId } });
// Delete an employee account (Firebase Auth login + user doc). 'employees:write'.
export const deleteEmployee = (uid) =>
  adk(`/employees/${encodeURIComponent(uid)}`, { method: 'DELETE' });

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

// Trigger Firebase's password-reset email (delivered by Firebase). 'auth:verify'.
export const forgotPassword = (email) =>
  adk('/auth/forgot-password', { method: 'POST', body: { email } });
