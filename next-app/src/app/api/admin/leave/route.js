import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getLeaveRequests } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// Org-wide leave list for admins (NOT self-scoped). Role is taken from the
// verified token; employees are rejected.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'dev' && user.role !== 'it_team') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const status = sp.get('status') || undefined;
  try {
    const data = await getLeaveRequests(status ? { status } : {}, user.orgId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
