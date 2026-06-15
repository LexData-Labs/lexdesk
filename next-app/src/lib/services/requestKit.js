import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// Shared "request → single approval" engine. Claim / Visit / Reconciliation /
// Remote-attendance all follow the same lifecycle as leave.js (an employee
// submits, a manager approves/rejects, the owner may cancel while pending), so
// the boilerplate lives here once. Each module supplies its own field spec.
//
// spec = {
//   collection: (orgId) => path,
//   doc: (orgId, id) => path,
//   pick:  (data)  => ({ ...module-specific row fields }),   // for reads
//   build: (body)  => ({ ...module-specific doc fields }),   // for create (throws on invalid)
// }

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

export function createRequestService(spec) {
  function rowFromDoc(doc) {
    const d = doc.data() ?? {};
    return {
      id: doc.id,
      uid: d.uid ?? '',
      userEmail: d.userEmail ?? '',
      userName: d.userName ?? '',
      ...spec.pick(d),
      status: d.status ?? 'pending',
      createdAt: toIso(d.createdAt),
      decidedAt: toIso(d.decidedAt),
      decidedBy: d.decidedBy ?? null,
      decisionNote: d.decisionNote ?? null,
    };
  }

  const pendingFirst = (a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return a.id < b.id ? 1 : -1;
  };
  const newestFirst = (a, b) => (a.createdAt || a.id) < (b.createdAt || b.id) ? 1 : -1;

  // Org-wide list (optionally filtered by status / uid) — for managers/admins.
  async function list(query = {}, orgId) {
    const { db } = firebaseAdmin();
    let q = db.collection(spec.collection(orgId));
    if (query.userId) q = q.where('uid', '==', query.userId);
    if (query.status) q = q.where('status', '==', query.status);
    const snap = await q.get();
    return { requests: snap.docs.map(rowFromDoc).sort(pendingFirst) };
  }

  // The caller's own requests (equality-only query → no composite index).
  async function listMine(orgId, uid) {
    const { db } = firebaseAdmin();
    const snap = await db.collection(spec.collection(orgId)).where('uid', '==', uid).get();
    return { requests: snap.docs.map(rowFromDoc).sort(newestFirst) };
  }

  // body must carry userId (forced from the token by the route).
  async function submit(body, orgId) {
    const { db } = firebaseAdmin();
    const userSnap = await db.doc(Paths.user(orgId, body.userId)).get();
    if (!userSnap.exists) throw Object.assign(new Error('user_not_found'), { status: 404 });
    const u = userSnap.data();
    const fields = spec.build(body); // throws {status:400} on invalid input
    const ref = await db.collection(spec.collection(orgId)).add({
      uid: body.userId,
      userEmail: u.email ?? '',
      userName: u.name || u.email || '',
      ...fields,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
    });
    return { id: ref.id };
  }

  // Owner cancels their own pending request.
  async function cancelMine(orgId, uid, id) {
    const { db } = firebaseAdmin();
    const ref = db.doc(spec.doc(orgId, id));
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
      const data = snap.data() ?? {};
      if (String(data.uid) !== String(uid)) throw Object.assign(new Error('forbidden'), { status: 403 });
      if (data.status !== 'pending') throw Object.assign(new Error('not_pending'), { status: 409 });
      tx.update(ref, { status: 'cancelled', decidedAt: FieldValue.serverTimestamp(), decidedBy: uid, decisionNote: null });
    });
    return { request: rowFromDoc(await ref.get()) };
  }

  // Manager/admin decision. deciderUid is recorded so the app shows who acted.
  async function decide(id, decision, note, orgId, deciderUid) {
    if (decision !== 'approved' && decision !== 'rejected') {
      throw Object.assign(new Error('bad_decision'), { status: 400 });
    }
    const { db } = firebaseAdmin();
    const ref = db.doc(spec.doc(orgId, id));
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
      if ((snap.data() ?? {}).status !== 'pending') throw Object.assign(new Error('not_pending'), { status: 409 });
      tx.update(ref, {
        status: decision,
        decidedAt: FieldValue.serverTimestamp(),
        decidedBy: deciderUid || 'lexdesk',
        decisionNote: note ?? null,
      });
    });
    return { ok: true, request: rowFromDoc(await ref.get()) };
  }

  // Fetch one row (used by manager routes to verify team membership before deciding).
  async function getOne(orgId, id) {
    const { db } = firebaseAdmin();
    const snap = await db.doc(spec.doc(orgId, id)).get();
    return snap.exists ? rowFromDoc(snap) : null;
  }

  return { rowFromDoc, list, listMine, submit, cancelMine, decide, getOne };
}

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Inclusive day count for a from/to range; throws on a bad/inverted range. */
export function inclusiveDayCount(fromDay, toDay) {
  if (!ISO_DAY_RE.test(fromDay) || !ISO_DAY_RE.test(toDay)) throw Object.assign(new Error('invalid_range'), { status: 400 });
  if (fromDay > toDay) throw Object.assign(new Error('invalid_range'), { status: 400 });
  const start = new Date(`${fromDay}T00:00:00Z`).getTime();
  const end = new Date(`${toDay}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

export { ISO_DAY_RE };
