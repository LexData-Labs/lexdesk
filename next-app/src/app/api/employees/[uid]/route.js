import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { setEmployeeTeam } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// PATCH: admins only — assign/clear an employee's team. Body: { teamId | null }.
export async function PATCH(request, ctx) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { uid } = await ctx.params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const teamId = body?.teamId || null;

  try {
    const result = await setEmployeeTeam(uid, teamId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
