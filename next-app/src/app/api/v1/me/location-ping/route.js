import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { recordLocationPing } from '@/lib/services/location';

export const dynamic = 'force-dynamic';

// POST /api/v1/me/location-ping — background location stream (audit-only).
export async function POST(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await recordLocationPing(user.orgId, user.uid, user.email, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(e.body || { error: e.message }, { status: e.status || 500, headers: e.headers });
  }
}
