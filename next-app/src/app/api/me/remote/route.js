import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getRemoteRequests } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// An employee's OWN remote-work requests. uid comes from the verified token, so
// a caller can only ever read their own. Web counterpart of /api/v1/me/remote.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const sp = new URL(request.url).searchParams;
  const status = sp.get('status') || undefined;
  try {
    const data = await getRemoteRequests(status ? { status } : {}, user.orgId);
    const mine = (data.requests || []).filter((r) => String(r.uid) === String(user.id));
    return NextResponse.json({ requests: mine });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
