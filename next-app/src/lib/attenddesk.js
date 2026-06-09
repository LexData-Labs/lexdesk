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
export async function adk(path, { method = 'GET', query, body, ttl = 0, orgId } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, String(v));
  const urlStr = url.toString();
  // Cache is per-org: the same URL targeted at different orgs (via X-Org-Id)
  // must never collide, or one tenant would serve another tenant's data.
  const cacheKey = orgId ? `${orgId}|${urlStr}` : urlStr;

  if (method === 'GET' && ttl > 0) {
    const hit = cacheGet(cacheKey);
    if (hit !== undefined) return hit;
  }

  const headers = { Authorization: `Bearer ${key()}` };
  if (orgId) headers['X-Org-Id'] = orgId; // target this org (key must hold 'orgs:admin')
  if (body) headers['content-type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || `attenddesk_${res.status}`), { status: res.status, body: data });

  if (method === 'GET') {
    if (ttl > 0) _cache.set(cacheKey, { expires: Date.now() + ttl, data });
  } else {
    _cache.clear(); // a write happened — drop all cached reads
  }
  return data;
}

// Convenience wrappers — your key must hold the scope shown in each comment.
// Most take a trailing `orgId`: with the cross-org provisioning key it's
// forwarded as X-Org-Id so the call targets that specific tenant. (Routes pass
// the logged-in user's orgId, read from their session JWT.)
export const getMe = () => adk('/me');
export const getPolicy = (orgId) => adk('/policy', { ttl: 300000, orgId }); // policy:read (5 min)
export const updatePolicy = (body, orgId) => adk('/policy', { method: 'POST', body, orgId }); // policy:write
export const getOffice = (orgId) => adk('/office', { ttl: 300000, orgId }); // office:read (5 min)
export const updateOffice = (body, orgId) => adk('/office', { method: 'POST', body, orgId }); // office:write
export const getEmployees = (orgId) => adk('/employees', { ttl: 30000, orgId }); // employees:read (30s)
export const getEmployee = (uid, orgId) => adk(`/employees/${encodeURIComponent(uid)}`, { orgId }); // employees:read (single)
export const getAttendance = (query = {}, orgId) => adk('/attendance', { query, orgId }); // attendance:read
export const checkIn = (body, orgId) => adk('/attendance/check-in', { method: 'POST', body, orgId }); // attendance:write
export const getLeaveRequests = (query = {}, orgId) => adk('/leave-requests', { query, orgId }); // leaves:read

// Submit a leave request. Body: { userId, fromDay, toDay, subject, details? }
// (days are YYYY-MM-DD). Requires the 'leaves:write' scope.
export const submitLeave = (body, orgId) => adk('/leave-requests', { method: 'POST', body, orgId });

// Approve/reject a pending leave request (admin). decision: 'approved'|'rejected'.
// Requires the 'leaves:approve' scope.
export const decideLeave = (id, decision, note, orgId) =>
  adk(`/leave-requests/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { decision, note }, orgId });

// Asset requests (dual approval: team lead + admin). read='assets:read',
// write='assets:write', approve='assets:approve'.
export const getAssetRequests = (query = {}, orgId) => adk('/asset-requests', { query, orgId });
export const createAssetRequest = (body, orgId) => adk('/asset-requests', { method: 'POST', body, orgId });
export const decideAssetRequest = (id, side, decision, note, orgId) =>
  adk(`/asset-requests/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { side, decision, note }, orgId });

// Custom org holidays (pink on the calendar). Each is an inclusive [fromDay,toDay]
// day range (YYYY-MM-DD) + name. read = 'holidays:read', write = 'holidays:write'.
export const getHolidays = (orgId) => adk('/holidays', { ttl: 60000, orgId }); // 60s
export const createHoliday = (body, orgId) => adk('/holidays', { method: 'POST', body, orgId });
export const deleteHoliday = (id, orgId) =>
  adk(`/holidays/${encodeURIComponent(id)}`, { method: 'DELETE', orgId });

// Teams. read = 'teams:read', write = 'teams:write'.
export const getTeams = (orgId) => adk('/teams', { orgId });
export const createTeam = (body, orgId) => adk('/teams', { method: 'POST', body, orgId });
export const updateTeam = (id, body, orgId) =>
  adk(`/teams/${encodeURIComponent(id)}`, { method: 'PATCH', body, orgId });
export const deleteTeam = (id, orgId) =>
  adk(`/teams/${encodeURIComponent(id)}`, { method: 'DELETE', orgId });

// Provision a real employee account (returns a temporary password). 'employees:write'.
export const createEmployee = (body, orgId) => adk('/employees', { method: 'POST', body, orgId });
// Assign/clear an employee's team. 'employees:write'.
export const setEmployeeTeam = (uid, teamId, orgId) =>
  adk(`/employees/${encodeURIComponent(uid)}`, { method: 'PATCH', body: { teamId }, orgId });
// Delete an employee account (Firebase Auth login + user doc). 'employees:write'.
export const deleteEmployee = (uid, orgId) =>
  adk(`/employees/${encodeURIComponent(uid)}`, { method: 'DELETE', orgId });

// Change a user's password (verifies their current password first).
// Requires the 'auth:verify' scope.
export const changePassword = (email, currentPassword, newPassword, orgId) =>
  adk('/auth/change-password', { method: 'POST', body: { email, currentPassword, newPassword }, orgId });

// Update a user's display name. Requires the 'employees:write' scope.
export const updateName = (email, name, orgId) =>
  adk('/auth/update-profile', { method: 'POST', body: { email, name }, orgId });

// Upload a user's profile photo (dataUrl = base64 data URL). Writes to Firebase
// Storage on the AttendDesk side. Requires the 'employees:write' scope.
export const uploadPhoto = (email, dataUrl, orgId) =>
  adk('/auth/update-photo', { method: 'POST', body: { email, dataUrl }, orgId });

// Provision a brand-new organization + its first admin. Uses the provisioning
// key's 'orgs:create' scope — no X-Org-Id (the org doesn't exist yet).
// Body: { companyName, companyDomain, adminName, adminEmail, password, designation? }.
export const createOrganization = (body) => adk('/organizations', { method: 'POST', body });

// Resolve an email -> its { orgId, role }. Uses the 'orgs:admin' scope; called
// at login (before we know which org to target) and throws 404 if unknown.
export const resolveOrg = (email) => adk('/organizations/resolve', { query: { email } });

// List LexDesk-provisioned orgs + their admins (cross-org, 'orgs:admin'). For
// the system admin console. No X-Org-Id (spans all orgs); uncached so Refresh
// always reflects the current set (incl. a just-created org on any instance).
export const listOrganizations = () => adk('/organizations');

// Reset an org ADMIN's password (scoped to `orgId` via X-Org-Id), returning a
// fresh temp password. Uses 'orgs:admin'. For the LexDesk system admin console.
export const adminResetOrgAdmin = (email, orgId) =>
  adk('/auth/admin-reset-password', { method: 'POST', body: { email }, orgId });

// Verify an employee's email + password against AttendDesk (partner SSO), scoped
// to `orgId` (forwarded as X-Org-Id). Requires the 'auth:verify' scope. Resolves
// to { valid:false } for bad credentials (HTTP 200) and throws (with .status)
// for scope/rate-limit/upstream errors (403/429/502/503).
export const verifyCredentials = (email, password, orgId) =>
  adk('/auth/verify-credentials', { method: 'POST', body: { email, password }, orgId });

// Trigger Firebase's password-reset email (delivered by Firebase). 'auth:verify'.
export const forgotPassword = (email) =>
  adk('/auth/forgot-password', { method: 'POST', body: { email } });
