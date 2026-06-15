import { Paths } from '../paths';
import { createRequestService, ISO_DAY_RE } from './requestKit';

// Remote-attendance requests — employee asks to be marked present remotely for
// a day (with reason + optional location); a manager approves/rejects. v1 is
// RECORD-ONLY: approval is stored + shown, it does not create an attendance event.

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
export const decideRemote = (id, decision, note, orgId, deciderUid) => svc.decide(id, decision, note, orgId, deciderUid);
export const getRemote = (orgId, id) => svc.getOne(orgId, id);
