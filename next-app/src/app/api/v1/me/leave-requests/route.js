import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { listMyLeaveRequests, submitLeave } from '@/lib/services/leave';

export const dynamic = 'force-dynamic';

// GET /api/v1/me/leave-requests — the caller's own requests.
export async function GET(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  try {
    const result = await listMyLeaveRequests(user.orgId, user.uid);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

// POST /api/v1/me/leave-requests — submit one for the caller.
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
  const { fromDay, toDay, subject } = body || {};
  if (!fromDay || !toDay || !subject) {
    return NextResponse.json({ error: 'fromDay, toDay and subject are required' }, { status: 400 });
  }

  try {
    const result = await submitLeave(
      { userId: user.uid, fromDay, toDay, subject, details: body.details || '' },
      user.orgId,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
