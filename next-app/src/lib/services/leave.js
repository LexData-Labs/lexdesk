import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// Leave requests — ported from AttendDesk's leaveRequests.ts (single-org, no
// feature gate). Wrapper shapes match the old HTTP responses.

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function inclusiveDayCount(fromDay, toDay) {
  if (!ISO_DAY_RE.test(fromDay) || !ISO_DAY_RE.test(toDay)) throw Object.assign(new Error('invalid_range'), { status: 400 });
  if (fromDay > toDay) throw Object.assign(new Error('invalid_range'), { status: 400 });
  const start = new Date(`${fromDay}T00:00:00Z`).getTime();
  const end = new Date(`${toDay}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

function toIso(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  return null;
}

function rowFromDoc(doc) {
  const d = doc.data() ?? {};
  const legacyReason = typeof d.reason === 'string' ? d.reason : '';
  return {
    id: doc.id,
    uid: d.uid ?? '',
    userEmail: d.userEmail ?? '',
    userName: d.userName ?? '',
    fromDay: d.fromDay ?? '',
    toDay: d.toDay ?? '',
    totalDays: typeof d.totalDays === 'number' ? d.totalDays : 0,
    subject: d.subject ?? (legacyReason ? 'Leave request' : ''),
    details: d.details ?? legacyReason,
    status: d.status ?? 'pending',
    createdAt: toIso(d.createdAt),
    decidedAt: toIso(d.decidedAt),
    decidedBy: d.decidedBy ?? null,
    decisionNote: d.decisionNote ?? null,
  };
}

export async function getLeaveRequests(query = {}, orgId) {
  const { db } = firebaseAdmin();
  let q = db.collection(Paths.leaveRequests(orgId));
  if (query.status) q = q.where('status', '==', query.status);
  const snap = await q.get();
  const requests = snap.docs.map(rowFromDoc).sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    if (a.fromDay !== b.fromDay) return a.fromDay < b.fromDay ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
  return { requests };
}

// body: { userId, fromDay, toDay, subject, details? }
export async function submitLeave(body, orgId) {
  const totalDays = inclusiveDayCount(body.fromDay, body.toDay);
  const { db } = firebaseAdmin();
  const userSnap = await db.doc(Paths.user(orgId, body.userId)).get();
  if (!userSnap.exists) throw Object.assign(new Error('user_not_found'), { status: 404 });
  const u = userSnap.data();
  const ref = await db.collection(Paths.leaveRequests(orgId)).add({
    uid: body.userId,
    userEmail: u.email ?? '',
    userName: u.name || u.email || '',
    fromDay: body.fromDay,
    toDay: body.toDay,
    totalDays,
    subject: body.subject,
    details: body.details ?? '',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    decidedAt: null,
    decidedBy: null,
    decisionNote: null,
  });
  return { id: ref.id };
}

// Mobile: a user's OWN leave requests (equality-only query, client sort).
export async function listMyLeaveRequests(orgId, uid) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.leaveRequests(orgId)).where('uid', '==', uid).get();
  const requests = snap.docs.map(rowFromDoc).sort((a, b) => {
    if (a.fromDay !== b.fromDay) return a.fromDay < b.fromDay ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
  return { requests };
}

// Mobile: cancel one of the caller's OWN pending requests.
export async function cancelMyLeaveRequest(orgId, uid, id) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.leaveRequest(orgId, id));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
    const data = snap.data() ?? {};
    if (String(data.uid) !== String(uid)) throw Object.assign(new Error('forbidden'), { status: 403 });
    if (data.status !== 'pending') throw Object.assign(new Error('not_pending'), { status: 409 });
    tx.update(ref, {
      status: 'cancelled',
      decidedAt: FieldValue.serverTimestamp(),
      decidedBy: uid,
      decisionNote: null,
    });
  });
  const fresh = await ref.get();
  return { request: rowFromDoc(fresh) };
}

export async function decideLeave(id, decision, note, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.leaveRequest(orgId, id));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
    if ((snap.data() ?? {}).status !== 'pending') throw Object.assign(new Error('not_pending'), { status: 409 });
    tx.update(ref, {
      status: decision,
      decidedAt: FieldValue.serverTimestamp(),
      decidedBy: 'lexdesk',
      decisionNote: note ?? null,
    });
  });
  const fresh = await ref.get();
  return { ok: true, request: rowFromDoc(fresh) };
}
