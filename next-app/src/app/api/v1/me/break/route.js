import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { recordBreak } from '@/lib/services/breaks';

export const dynamic = 'force-dynamic';

// POST /api/v1/me/break — { action: 'start' | 'end' }
export async function POST(request) {
  let user;
  try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  try { return NextResponse.json(await recordBreak(user.orgId, user.uid, body?.action), { status: 201 }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
}
