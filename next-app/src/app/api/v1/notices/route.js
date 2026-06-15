import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { listNotices } from '@/lib/services/notices';

export const dynamic = 'force-dynamic';

// GET /api/v1/notices — { notices } (pinned first, then newest).
export async function GET(request) {
  let user;
  try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
  try { return NextResponse.json(await listNotices(user.orgId)); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
}
