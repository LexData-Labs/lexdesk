import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';
import { isValidIpEntry } from '../ip';

// Org office (single doc). Ported from AttendDesk; BSSIDs normalized lowercase.

export async function getOffice(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.offices(orgId)).limit(1).get();
  const doc = snap.docs[0];
  return { office: doc ? { id: doc.id, ...doc.data() } : null };
}

// body: { name, lat, lng, radiusMeters, allowedSsids, allowedBssids, allowedIps?, startTime?, endTime? }
export async function updateOffice(body, orgId) {
  const { db } = firebaseAdmin();
  const data = {
    ...body,
    allowedBssids: (body.allowedBssids || []).map((b) => String(b).toLowerCase()),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Office PUBLIC IPs / CIDRs for the web check-in 'ip' check. Guarded so a body
  // that omits the field doesn't wipe the stored list on a merge write. Reject
  // malformed entries at write time (a bad CIDR must never widen the gate).
  if (body.allowedIps !== undefined) {
    const entries = (body.allowedIps || []).map((s) => String(s).trim()).filter(Boolean);
    const bad = entries.filter((e) => !isValidIpEntry(e));
    if (bad.length) throw Object.assign(new Error(`invalid_office_ip: ${bad.join(', ')}`), { status: 400 });
    data.allowedIps = entries;
  }
  const existing = await db.collection(Paths.offices(orgId)).limit(1).get();
  const ref = existing.docs[0] ? existing.docs[0].ref : db.collection(Paths.offices(orgId)).doc();
  await ref.set(
    { ...data, createdAt: existing.docs[0] ? existing.docs[0].data().createdAt : FieldValue.serverTimestamp() },
    { merge: true },
  );
  const snap = await ref.get();
  return { office: { id: ref.id, ...snap.data() } };
}
