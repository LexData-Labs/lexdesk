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
  // IT Team — accessories inventory (counts) and tracking (IP/assignment).
  accessoryItems: (orgId) => `organizations/${orgId}/accessoryItems`,
  accessoryItem: (orgId, id) => `organizations/${orgId}/accessoryItems/${id}`,
  trackingItems: (orgId) => `organizations/${orgId}/trackingItems`,
  trackingItem: (orgId, id) => `organizations/${orgId}/trackingItems/${id}`,
  assetRequests: (orgId) => `organizations/${orgId}/assetRequests`,
  assetRequest: (orgId, id) => `organizations/${orgId}/assetRequests/${id}`,
  // Coming-soon modules (request→approval + announcements + break events).
  reconRequests: (orgId) => `organizations/${orgId}/reconRequests`,
  reconRequest: (orgId, id) => `organizations/${orgId}/reconRequests/${id}`,
  remoteRequests: (orgId) => `organizations/${orgId}/remoteRequests`,
  remoteRequest: (orgId, id) => `organizations/${orgId}/remoteRequests/${id}`,
  notices: (orgId) => `organizations/${orgId}/notices`,
  notice: (orgId, id) => `organizations/${orgId}/notices/${id}`,
  breakEvents: (orgId) => `organizations/${orgId}/breakEvents`,
  breakEvent: (orgId, id) => `organizations/${orgId}/breakEvents/${id}`,
  locationPings: (orgId) => `organizations/${orgId}/locationPings`,
  // Desktop/mobile device binding (one device → one uid; anti buddy-punching).
  device: (orgId, deviceId) => `organizations/${orgId}/devices/${deviceId}`,
  userIndex: (uid) => `userIndex/${uid}`,
};

export function db() {
  return firebaseAdmin().db;
}
