import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { getPolicy } from '@/lib/services/policy';
import { getOffice } from '@/lib/services/office';
import { getFeatures } from '@/lib/services/features';
import { getHolidays } from '@/lib/services/holidays';

export const dynamic = 'force-dynamic';

// GET /api/v1/me/policy — org policy + office + features + face model metadata.
export async function GET(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  try {
    // Holidays ride along with the policy the app already fetches, so auto
    // check-in can tell an office closure from an ordinary morning without a
    // second request from a background receiver.
    const [p, o, features, h] = await Promise.all([
      getPolicy(user.orgId),
      getOffice(user.orgId),
      getFeatures(user.orgId),
      getHolidays(user.orgId).catch(() => ({ holidays: [] })),
    ]);
    return NextResponse.json({
      policy: p.policy,
      office: o.office,
      features,
      holidays: h.holidays,
      faceEmbeddingDim: p.faceEmbeddingDim,
      faceEmbeddingModel: p.faceEmbeddingModel,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
