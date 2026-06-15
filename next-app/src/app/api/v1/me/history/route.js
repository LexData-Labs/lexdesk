import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { listMyHistory } from '@/lib/services/attendance';

export const dynamic = 'force-dynamic';

// GET /api/v1/me/history?limit=30 — the user's recent attendance events.
export async function GET(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  try {
    const limit = new URL(request.url).searchParams.get('limit') ?? 30;
    const result = await listMyHistory(user.orgId, user.uid, limit);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
