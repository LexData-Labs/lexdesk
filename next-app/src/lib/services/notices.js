import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// Notice board — admins author announcements; everyone reads. No approval.

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

function rowFromDoc(doc) {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    title: d.title ?? '',
    body: d.body ?? '',
    pinned: !!d.pinned,
    createdAt: toIso(d.createdAt),
    createdBy: d.createdBy ?? null,
  };
}

// Pinned first, then newest. Sorted client-side to avoid a composite index.
export async function listNotices(orgId, limit = 50) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.notices(orgId)).get();
  const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const notices = snap.docs
    .map(rowFromDoc)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    })
    .slice(0, n);
  return { notices };
}

// body: { title, body?, pinned? }
export async function createNotice(body, orgId, authorUid) {
  const title = String(body?.title ?? '').trim();
  if (!title) throw Object.assign(new Error('title_required'), { status: 400 });
  const { db } = firebaseAdmin();
  const ref = await db.collection(Paths.notices(orgId)).add({
    title,
    body: String(body?.body ?? '').trim(),
    pinned: !!body?.pinned,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: authorUid ?? 'lexdesk',
  });
  return { id: ref.id };
}

export async function deleteNotice(id, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.notice(orgId, id));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  await ref.delete();
  return { ok: true };
}
