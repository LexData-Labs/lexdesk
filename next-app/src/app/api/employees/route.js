import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createEmployee } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

const isAdmin = (user) => user.role === 'admin' || user.role === 'superadmin';

// POST: admins only — provision a REAL AttendDesk employee account (with optional
// team). Returns the temporary password so the admin can share it.
export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = (body?.email || '').trim();
  const name = (body?.name || '').trim();
  const role = body?.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
  const teamId = body?.teamId || null;
  const employeeId = (body?.employeeId || '').trim() || null;
  if (!email || !name) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }

  try {
    const result = await createEmployee({ email, name, role, teamId, employeeId }, user.orgId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
