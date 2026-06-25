import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';
import { getEmployees } from './users';

// Teams — ported from AttendDesk. Leader is an employee uid + denormalized name.

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

export async function getTeams(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.teams(orgId)).orderBy('name', 'asc').get();
  const teams = snap.docs.map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      name: data.name ?? '',
      leaderUid: data.leaderUid ?? null,
      leaderName: data.leaderName ?? null,
      createdAt: toIso(data.createdAt),
    };
  });
  return { teams };
}

// The line manager for a team = its (denormalized) leader name. Returns null
// when the user has no team or the team has no leader.
export async function getLineManager(orgId, teamId) {
  if (!teamId) return null;
  const { db } = firebaseAdmin();
  const snap = await db.doc(Paths.team(orgId, teamId)).get();
  if (!snap.exists) return null;
  return snap.data()?.leaderName || null;
}

// body: { name, leaderUid? }
export async function createTeam(body, orgId) {
  const { db } = firebaseAdmin();
  let leaderUid = body.leaderUid ?? null;
  let leaderName = null;
  if (leaderUid) {
    const u = await db.doc(Paths.user(orgId, leaderUid)).get();
    if (u.exists) leaderName = u.data()?.name ?? null;
    else leaderUid = null;
  }
  const ref = await db.collection(Paths.teams(orgId)).add({
    name: body.name,
    leaderUid,
    leaderName,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'lexdesk',
  });
  return { id: ref.id };
}

// body: { name?, leaderUid? }  (leaderUid:null clears the leader)
export async function updateTeam(id, body, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.team(orgId, id));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  const data = snap.data() ?? {};
  const name = body.name !== undefined ? body.name : (data.name ?? '');
  let leaderUid = data.leaderUid ?? null;
  let leaderName = data.leaderName ?? null;
  if (body.leaderUid !== undefined) {
    if (body.leaderUid) {
      const u = await db.doc(Paths.user(orgId, body.leaderUid)).get();
      leaderUid = body.leaderUid;
      leaderName = u.exists ? (u.data()?.name ?? null) : null;
    } else {
      leaderUid = null;
      leaderName = null;
    }
  }
  await ref.set({ name, leaderUid, leaderName }, { merge: true });
  return { ok: true };
}

export async function deleteTeam(id, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.team(orgId, id));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  await ref.delete();
  return { ok: true };
}

// Resolve the teams this uid LEADS and the member uids in them. Mirrors the
// web /api/team/* routes (getTeams + getEmployees filter). Used by mobile
// manager endpoints for scoping (a lead only acts on their team's members).
export async function listLedTeamMemberUids(orgId, uid) {
  const { teams } = await getTeams(orgId);
  const ledTeamIds = new Set(
    teams.filter((t) => String(t.leaderUid) === String(uid)).map((t) => t.id),
  );
  if (ledTeamIds.size === 0) return { isLeader: false, members: [], memberUids: new Set() };
  const { employees } = await getEmployees(orgId);
  const members = employees.filter((e) => e.teamId && ledTeamIds.has(e.teamId));
  return { isLeader: true, members, memberUids: new Set(members.map((e) => String(e.id))) };
}

// True when this caller can approve requests at all: an admin/superadmin (any
// role casing) or the leader of ≥1 team.
export async function isManager(orgId, uid, role) {
  const r = String(role ?? '').toUpperCase();
  if (r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN') return true;
  const { isLeader } = await listLedTeamMemberUids(orgId, uid);
  return isLeader;
}

// True when this caller may act on a SPECIFIC request owner (admin → anyone;
// lead → only their team members).
export async function canManageUser(orgId, uid, role, targetUid) {
  const r = String(role ?? '').toUpperCase();
  if (r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN') return true;
  const { memberUids } = await listLedTeamMemberUids(orgId, uid);
  return memberUids.has(String(targetUid));
}
