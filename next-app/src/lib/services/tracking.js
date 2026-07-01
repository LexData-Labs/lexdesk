import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// IT Team tracking — assignment records: which item/accessory has which IP and
// who/what it's assigned to. Inventory counts live in the Accessories section.

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

export async function getTracking(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.trackingItems(orgId)).orderBy('createdAt', 'desc').get();
  const items = snap.docs.map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      name: data.name ?? '',
      ipAddress: data.ipAddress ?? null,
      assignedTo: data.assignedTo ?? null,
      notes: data.notes ?? null,
      createdAt: toIso(data.createdAt),
    };
  });
  return { items };
}

// body: { name, ipAddress?, assignedTo?, notes? }
export async function createTracking(body, orgId) {
  const name = String(body?.name || '').trim();
  if (!name) throw Object.assign(new Error('Item / accessory is required'), { status: 400 });
  const { db } = firebaseAdmin();
  const ref = await db.collection(Paths.trackingItems(orgId)).add({
    name,
    ipAddress: String(body?.ipAddress || '').trim() || null,
    assignedTo: String(body?.assignedTo || '').trim() || null,
    notes: String(body?.notes || '').trim() || null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'lexdesk',
  });
  return { id: ref.id };
}

export async function deleteTracking(id, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.trackingItem(orgId, id));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  await ref.delete();
  return { ok: true };
}
