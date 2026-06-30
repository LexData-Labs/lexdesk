import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// IT Team accessories inventory — what the company has and how many. Pure
// count tracking; IP/assignment lives in the separate Tracking section.

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

export async function getAccessories(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.accessoryItems(orgId)).orderBy('createdAt', 'desc').get();
  const items = snap.docs.map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      name: data.name ?? '',
      quantity: typeof data.quantity === 'number' ? data.quantity : 0,
      notes: data.notes ?? null,
      createdAt: toIso(data.createdAt),
    };
  });
  return { items };
}

// body: { name, quantity?, notes? }
export async function createAccessory(body, orgId) {
  const name = String(body?.name || '').trim();
  if (!name) throw Object.assign(new Error('Accessory name is required'), { status: 400 });
  const qty = Number.parseInt(body?.quantity, 10);
  const quantity = Number.isFinite(qty) && qty >= 0 ? qty : 1;
  const { db } = firebaseAdmin();
  const ref = await db.collection(Paths.accessoryItems(orgId)).add({
    name,
    quantity,
    notes: String(body?.notes || '').trim() || null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'lexdesk',
  });
  return { id: ref.id };
}

export async function deleteAccessory(id, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.accessoryItem(orgId, id));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  await ref.delete();
  return { ok: true };
}
