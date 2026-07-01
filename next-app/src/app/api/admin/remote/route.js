import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getRemoteRequests } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// Org-wide remote-attendance list for admins (NOT self-scoped). Role is taken
// from the verified token; employees are rejected.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const status = sp.get('status') || undefined;
  try {
    const data = await getRemoteRequests(status ? { status } : {}, user.orgId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
