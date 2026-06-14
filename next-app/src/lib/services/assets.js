import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// Asset requests with dual approval (admin + lead) — ported from AttendDesk.

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

function rowFromDoc(doc) {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    uid: d.uid ?? '',
    userEmail: d.userEmail ?? '',
    userName: d.userName ?? '',
    assetName: d.assetName ?? '',
    assetType: d.assetType ?? '',
    description: d.description ?? '',
    fromDay: d.fromDay ?? '',
    toDay: d.toDay ?? '',
    totalDays: typeof d.totalDays === 'number' ? d.totalDays : 0,
    requiresLead: !!d.requiresLead,
    status: d.status ?? 'pending',
    adminStatus: d.adminStatus ?? 'pending',
    leadStatus: d.leadStatus ?? 'pending',
    adminDecidedBy: d.adminDecidedBy ?? null,
    adminDecidedAt: toIso(d.adminDecidedAt),
    adminNote: d.adminNote ?? null,
    leadDecidedBy: d.leadDecidedBy ?? null,
    leadDecidedAt: toIso(d.leadDecidedAt),
    leadNote: d.leadNote ?? null,
    createdAt: toIso(d.createdAt),
  };
}

export async function getAssetRequests(query = {}, orgId) {
  const { db } = firebaseAdmin();
  let q = db.collection(Paths.assetRequests(orgId));
  if (query.userId) q = q.where('uid', '==', query.userId);
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

// body: { userId, assetName, assetType?, description?, fromDay, toDay, requiresLead? }
export async function createAssetRequest(body, orgId) {
  if (body.fromDay > body.toDay) throw Object.assign(new Error('invalid_range'), { status: 400 });
  const { db } = firebaseAdmin();
  const userSnap = await db.doc(Paths.user(orgId, body.userId)).get();
  if (!userSnap.exists) throw Object.assign(new Error('user_not_found'), { status: 404 });
  const u = userSnap.data();
  const start = new Date(`${body.fromDay}T00:00:00Z`).getTime();
  const end = new Date(`${body.toDay}T00:00:00Z`).getTime();
  const totalDays = Math.round((end - start) / 86_400_000) + 1;
  const leadStatus = body.requiresLead ? 'pending' : 'approved';
  const ref = await db.collection(Paths.assetRequests(orgId)).add({
    uid: body.userId,
    userEmail: u.email ?? '',
    userName: u.name || u.email || '',
    assetName: body.assetName,
    assetType: body.assetType ?? '',
    description: body.description ?? '',
    fromDay: body.fromDay,
    toDay: body.toDay,
    totalDays,
    requiresLead: !!body.requiresLead,
    status: 'pending',
    adminStatus: 'pending',
    leadStatus,
    adminDecidedBy: null,
    adminDecidedAt: null,
    adminNote: null,
    leadDecidedBy: null,
    leadDecidedAt: null,
    leadNote: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

// side: 'admin' | 'lead'. Overall status = approved only when both sides approve;
// rejected if either rejects.
export async function decideAssetRequest(id, side, decision, note, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.assetRequest(orgId, id));
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { error: 'not_found', status: 404 };
    const d = snap.data() ?? {};
    if (d.status !== 'pending') return { error: 'not_pending', status: 409 };
    const adminStatus = side === 'admin' ? decision : (d.adminStatus ?? 'pending');
    const leadStatus = side === 'lead' ? decision : (d.leadStatus ?? 'pending');
    const status =
      adminStatus === 'rejected' || leadStatus === 'rejected'
        ? 'rejected'
        : adminStatus === 'approved' && leadStatus === 'approved'
          ? 'approved'
          : 'pending';
    const sideFields =
      side === 'admin'
        ? { adminStatus, adminDecidedBy: 'lexdesk', adminDecidedAt: FieldValue.serverTimestamp(), adminNote: note ?? null }
        : { leadStatus, leadDecidedBy: 'lexdesk', leadDecidedAt: FieldValue.serverTimestamp(), leadNote: note ?? null };
    tx.set(ref, { ...sideFields, status }, { merge: true });
    return { ok: true };
  });
  if (result.error) throw Object.assign(new Error(result.error), { status: result.status });
  return { ok: true };
}
