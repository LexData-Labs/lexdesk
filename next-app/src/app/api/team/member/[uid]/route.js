import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { canManageUser, updateEmployee } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// PATCH: edit a team member's basic profile (name, employeeId). Authorized for
// an admin (anyone) or the leader of a team the target belongs to — the same
// rule the rest of /api/team/* uses (canManageUser). Body: { name?, employeeId? }.
export async function PATCH(request, ctx) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const { uid } = await ctx.params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const name = body?.name;
  const employeeId = body?.employeeId;
  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }

  try {
    const allowed = await canManageUser(user.orgId, String(user.id), user.role, String(uid));
    if (!allowed) return NextResponse.json({ error: 'Forbidden — not a member of a team you lead' }, { status: 403 });
    const result = await updateEmployee(String(uid), { name, employeeId }, user.orgId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}
