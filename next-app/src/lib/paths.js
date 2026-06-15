import { firebaseAdmin } from './firebase';

// Firestore path map — identical layout to AttendDesk (organizations/{orgId}/…)
// so we read/write the same live docs. Single-org: callers pass ORG_ID from
// config. Only the collections LexDesk actually uses are kept.

export const Paths = {
  org: (orgId) => `organizations/${orgId}`,
  users: (orgId) => `organizations/${orgId}/users`,
  user: (orgId, uid) => `organizations/${orgId}/users/${uid}`,
  offices: (orgId) => `organizations/${orgId}/offices`,
  office: (orgId, officeId) => `organizations/${orgId}/offices/${officeId}`,
  policy: (orgId) => `organizations/${orgId}/policy/default`,
  events: (orgId) => `organizations/${orgId}/attendanceEvents`,
  event: (orgId, eventId) => `organizations/${orgId}/attendanceEvents/${eventId}`,
  qrTokenUses: (orgId) => `organizations/${orgId}/qrTokenUses`,
  qrTokenUse: (orgId, useKey) => `organizations/${orgId}/qrTokenUses/${useKey}`,
  auditLogs: (orgId) => `organizations/${orgId}/auditLogs`,
  leaveRequests: (orgId) => `organizations/${orgId}/leaveRequests`,
  leaveRequest: (orgId, requestId) => `organizations/${orgId}/leaveRequests/${requestId}`,
  holidays: (orgId) => `organizations/${orgId}/holidays`,
  holiday: (orgId, id) => `organizations/${orgId}/holidays/${id}`,
  teams: (orgId) => `organizations/${orgId}/teams`,
  team: (orgId, id) => `organizations/${orgId}/teams/${id}`,
  assetRequests: (orgId) => `organizations/${orgId}/assetRequests`,
  assetRequest: (orgId, id) => `organizations/${orgId}/assetRequests/${id}`,
  locationPings: (orgId) => `organizations/${orgId}/locationPings`,
  // Desktop/mobile device binding (one device → one uid; anti buddy-punching).
  device: (orgId, deviceId) => `organizations/${orgId}/devices/${deviceId}`,
  userIndex: (uid) => `userIndex/${uid}`,
};

export function db() {
  return firebaseAdmin().db;
}
