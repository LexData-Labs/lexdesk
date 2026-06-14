import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getEmployee, resetUserPassword } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const isAdmin = (user) => user.role === 'admin' || user.role === 'superadmin';

// POST: admins only — reset one of THEIR OWN org's EMPLOYEES to a temp password.
// The org is taken from the admin's session (X-Org-Id), so an admin can only act
// within their own org. Admin/superadmin targets are refused here (those are the
// system console's job).
export async function POST(request, ctx) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.orgId) return NextResponse.json({ error: 'no_org_on_session' }, { status: 400 });

  const { uid } = await ctx.params;

  let emp;
  try {
    const data = await getEmployee(uid, user.orgId);
    emp = data?.employee || null;
  } catch (err) {
    if (err.status === 404) emp = null;
    else {
      return NextResponse.json(
        { error: err.message, upstream: err.body ?? null },
        { status: err.status || 502 },
      );
    }
  }
  if (!emp) return NextResponse.json({ error: 'Employee not found in your organization.' }, { status: 404 });
  if (String(emp.role || '').toUpperCase() !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Only employee passwords can be reset here.' }, { status: 403 });
  }
  if (!emp.email) return NextResponse.json({ error: 'This employee has no email on file.' }, { status: 400 });

  try {
    const result = await resetUserPassword(emp.email, user.orgId);
    return NextResponse.json({ ...result, name: emp.name || null });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
