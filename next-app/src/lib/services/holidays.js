import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// Custom org holidays — inclusive [fromDay, toDay] day ranges. Ported from AttendDesk.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

export async function getHolidays(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.holidays(orgId)).orderBy('fromDay', 'asc').get();
  const holidays = snap.docs.map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      fromDay: data.fromDay ?? null,
      toDay: data.toDay ?? data.fromDay ?? null,
      name: data.name ?? '',
      createdAt: toIso(data.createdAt),
    };
  });
  return { holidays };
}

// body: { fromDay, toDay?, name }
export async function createHoliday(body, orgId) {
  if (!ISO_DAY.test(body.fromDay || '')) throw Object.assign(new Error('invalid_range'), { status: 400 });
  const toDay = body.toDay ?? body.fromDay;
  if (!ISO_DAY.test(toDay)) throw Object.assign(new Error('invalid_range'), { status: 400 });
  if (body.fromDay > toDay) throw Object.assign(new Error('invalid_range'), { status: 400 });
  const { db } = firebaseAdmin();
  const ref = await db.collection(Paths.holidays(orgId)).add({
    fromDay: body.fromDay,
    toDay,
    name: body.name,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'lexdesk',
  });
  return { id: ref.id };
}

export async function deleteHoliday(id, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.holiday(orgId, id));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  await ref.delete();
  return { ok: true };
}
