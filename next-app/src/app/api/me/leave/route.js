import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getLeaveRequests, submitLeave } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// An employee's OWN leave. The uid always comes from the VERIFIED token, never
// the client, so an employee can only ever read or submit their own requests.

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const sp = new URL(request.url).searchParams;
  const status = sp.get('status') || undefined;
  try {
    const data = await getLeaveRequests(status ? { status } : {}, user.orgId);
    const mine = (data.requests || []).filter((r) => String(r.uid) === String(user.id));
    return NextResponse.json({ requests: mine });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { fromDay, toDay, subject, details } = body || {};
  if (!fromDay || !toDay || !subject) {
    return NextResponse.json({ error: 'fromDay, toDay and subject are required' }, { status: 400 });
  }

  try {
    // userId is forced to the token's uid — an employee can only submit for self.
    const result = await submitLeave({
      userId: String(user.id),
      fromDay,
      toDay,
      subject,
      details: details || '',
    }, user.orgId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
