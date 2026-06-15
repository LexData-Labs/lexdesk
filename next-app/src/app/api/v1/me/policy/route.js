import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { getPolicy } from '@/lib/services/policy';
import { getOffice } from '@/lib/services/office';
import { getFeatures } from '@/lib/services/features';

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
    const [p, o, features] = await Promise.all([
      getPolicy(user.orgId),
      getOffice(user.orgId),
      getFeatures(user.orgId),
    ]);
    return NextResponse.json({
      policy: p.policy,
      office: o.office,
      features,
      faceEmbeddingDim: p.faceEmbeddingDim,
      faceEmbeddingModel: p.faceEmbeddingModel,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
