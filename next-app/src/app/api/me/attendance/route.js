import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAttendance } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// An employee's OWN attendance from AttendDesk. The uid is taken from the
// VERIFIED session token — never from the client — so one user can't read
// another employee's events by passing a different id.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const sp = new URL(request.url).searchParams;
  try {
    const data = await getAttendance({ userId: String(user.id), limit: sp.get('limit') ?? 200 }, user.orgId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
