import { Paths } from '../paths';
import { createRequestService, inclusiveDayCount } from './requestKit';

// Field-visit applications — date range + place + purpose; leave-shaped.

const svc = createRequestService({
  collection: (orgId) => Paths.visitRequests(orgId),
  doc: (orgId, id) => Paths.visitRequest(orgId, id),
  pick: (d) => ({
    fromDay: d.fromDay ?? '',
    toDay: d.toDay ?? '',
    totalDays: typeof d.totalDays === 'number' ? d.totalDays : 0,
    place: d.place ?? '',
    subject: d.subject ?? '',
    details: d.details ?? '',
  }),
  build: (b) => {
    const subject = String(b.subject ?? '').trim();
    const place = String(b.place ?? '').trim();
    if (!subject) throw Object.assign(new Error('subject_required'), { status: 400 });
    if (!place) throw Object.assign(new Error('place_required'), { status: 400 });
    const totalDays = inclusiveDayCount(b.fromDay, b.toDay);
    return { fromDay: b.fromDay, toDay: b.toDay, totalDays, place, subject, details: String(b.details ?? '').trim() };
  },
});

export const getVisits = (query, orgId) => svc.list(query, orgId);
export const listMyVisits = (orgId, uid) => svc.listMine(orgId, uid);
export const submitVisit = (body, orgId) => svc.submit(body, orgId);
export const cancelMyVisit = (orgId, uid, id) => svc.cancelMine(orgId, uid, id);
export const decideVisit = (id, decision, note, orgId, deciderUid) => svc.decide(id, decision, note, orgId, deciderUid);
export const getVisit = (orgId, id) => svc.getOne(orgId, id);
