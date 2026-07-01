import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { decideRemote } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// Approve/reject a remote-attendance request. Admin-only (role from the verified
// token). Record-only: a decision is stored but does not create a check-in event.
export async function POST(request, ctx) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'dev') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { decision, note } = body || {};
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
  }

  try {
    const data = await decideRemote(id, decision, note || undefined, user.orgId, user.id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
