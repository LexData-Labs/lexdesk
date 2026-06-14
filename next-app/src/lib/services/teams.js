import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

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
