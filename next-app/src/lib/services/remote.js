import { firebaseAdmin } from '../firebase';
import { Paths } from '../paths';
import { createRequestService, ISO_DAY_RE } from './requestKit';
import { addManualAttendance } from './attendance';

// Remote-attendance requests — employee asks to be marked present remotely for
// a day (with reason + optional location); a manager approves/rejects. On
// APPROVAL we mark the day present by writing a manual CHECK_IN at the office
// start time (so it's on-time) and a CHECK_OUT at the office end time.

async function officeTimes(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.offices(orgId)).limit(1).get();
  const o = snap.empty ? {} : (snap.docs[0].data() ?? {});
  return { startTime: o.startTime || '09:00', endTime: o.endTime || null };
}

const svc = createRequestService({
  collection: (orgId) => Paths.remoteRequests(orgId),
  doc: (orgId, id) => Paths.remoteRequest(orgId, id),
  pick: (d) => ({
    day: d.day ?? '',
    reason: d.reason ?? '',
    lat: typeof d.lat === 'number' ? d.lat : null,
    lng: typeof d.lng === 'number' ? d.lng : null,
    place: d.place ?? '',
  }),
  build: (b) => {
    if (!ISO_DAY_RE.test(b.day ?? '')) throw Object.assign(new Error('invalid_day'), { status: 400 });
    const reason = String(b.reason ?? '').trim();
    if (!reason) throw Object.assign(new Error('reason_required'), { status: 400 });
    return {
      day: b.day,
      reason,
      lat: typeof b.lat === 'number' ? b.lat : null,
      lng: typeof b.lng === 'number' ? b.lng : null,
      place: String(b.place ?? '').trim(),
    };
  },
});

export const getRemoteRequests = (query, orgId) => svc.list(query, orgId);
export const listMyRemote = (orgId, uid) => svc.listMine(orgId, uid);
export const submitRemote = (body, orgId) => svc.submit(body, orgId);
export const cancelMyRemote = (orgId, uid, id) => svc.cancelMine(orgId, uid, id);
export async function decideRemote(id, decision, note, orgId, deciderUid) {
  const result = await svc.decide(id, decision, note, orgId, deciderUid);
  if (decision === 'approved' && result?.request) {
    const r = result.request;
    const { startTime, endTime } = await officeTimes(orgId);
    await addManualAttendance(orgId, { uid: r.uid, type: 'CHECK_IN', atISO: `${r.day}T${startTime}:00+06:00`, note: `Remote approved ${id}` }, deciderUid);
    if (endTime) {
      await addManualAttendance(orgId, { uid: r.uid, type: 'CHECK_OUT', atISO: `${r.day}T${endTime}:00+06:00`, note: `Remote approved ${id}` }, deciderUid);
    }
  }
  return result;
}
export const getRemote = (orgId, id) => svc.getOne(orgId, id);
