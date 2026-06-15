import { Paths } from '../paths';
import { createRequestService, ISO_DAY_RE } from './requestKit';

// Expense claims — request→approval, same lifecycle as leave.

const svc = createRequestService({
  collection: (orgId) => Paths.claims(orgId),
  doc: (orgId, id) => Paths.claim(orgId, id),
  pick: (d) => ({
    subject: d.subject ?? '',
    category: d.category ?? '',
    amount: typeof d.amount === 'number' ? d.amount : 0,
    currency: d.currency ?? 'BDT',
    day: d.day ?? '',
    details: d.details ?? '',
  }),
  build: (b) => {
    const subject = String(b.subject ?? '').trim();
    if (!subject) throw Object.assign(new Error('subject_required'), { status: 400 });
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount < 0) throw Object.assign(new Error('invalid_amount'), { status: 400 });
    if (!ISO_DAY_RE.test(b.day ?? '')) throw Object.assign(new Error('invalid_day'), { status: 400 });
    return {
      subject,
      category: String(b.category ?? '').trim(),
      amount,
      currency: String(b.currency ?? 'BDT'),
      day: b.day,
      details: String(b.details ?? '').trim(),
    };
  },
});

export const getClaims = (query, orgId) => svc.list(query, orgId);
export const listMyClaims = (orgId, uid) => svc.listMine(orgId, uid);
export const submitClaim = (body, orgId) => svc.submit(body, orgId);
export const cancelMyClaim = (orgId, uid, id) => svc.cancelMine(orgId, uid, id);
export const decideClaim = (id, decision, note, orgId, deciderUid) => svc.decide(id, decision, note, orgId, deciderUid);
export const getClaim = (orgId, id) => svc.getOne(orgId, id);
