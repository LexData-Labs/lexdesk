import { Paths } from '../paths';
import { createRequestService, ISO_DAY_RE } from './requestKit';

// Attendance reconciliation — employee proposes a corrected in/out for a day
// with a reason; a manager approves/rejects. v1 is RECORD-ONLY: an approval is
// stored + shown but does NOT mutate the live attendanceEvents pipeline.

const svc = createRequestService({
  collection: (orgId) => Paths.reconRequests(orgId),
  doc: (orgId, id) => Paths.reconRequest(orgId, id),
  pick: (d) => ({
    day: d.day ?? '',
    proposedInIso: d.proposedInIso ?? null,
    proposedOutIso: d.proposedOutIso ?? null,
    reason: d.reason ?? '',
  }),
  build: (b) => {
    if (!ISO_DAY_RE.test(b.day ?? '')) throw Object.assign(new Error('invalid_day'), { status: 400 });
    const reason = String(b.reason ?? '').trim();
    if (!reason) throw Object.assign(new Error('reason_required'), { status: 400 });
    if (!b.proposedInIso && !b.proposedOutIso) {
      throw Object.assign(new Error('proposed_time_required'), { status: 400 });
    }
    return {
      day: b.day,
      proposedInIso: b.proposedInIso ? String(b.proposedInIso) : null,
      proposedOutIso: b.proposedOutIso ? String(b.proposedOutIso) : null,
      reason,
    };
  },
});

export const getReconRequests = (query, orgId) => svc.list(query, orgId);
export const listMyRecon = (orgId, uid) => svc.listMine(orgId, uid);
export const submitRecon = (body, orgId) => svc.submit(body, orgId);
export const cancelMyRecon = (orgId, uid, id) => svc.cancelMine(orgId, uid, id);
export const decideRecon = (id, decision, note, orgId, deciderUid) => svc.decide(id, decision, note, orgId, deciderUid);
export const getRecon = (orgId, id) => svc.getOne(orgId, id);
