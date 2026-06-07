import { NextResponse } from 'next/server';
import {
  getUserFromRequest,
  getAllUsers,
  createUser,
  canCreateRole,
  DEFAULT_NEW_USER_PASSWORD,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// List all accounts — admin/superadmin only (employees must not see other users).
export async function GET(request) {
  const actor = getUserFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (actor.role !== 'admin' && actor.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ users: getAllUsers(), defaultPassword: DEFAULT_NEW_USER_PASSWORD });
}

// Create an account. Super admin may create admins/employees; admin may create
// employees only; employees may not create anyone.
export async function POST(request) {
  const actor = getUserFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email, role, employeeId } = body || {};
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email and role are required' }, { status: 400 });
  }
  if (!canCreateRole(actor.role, role)) {
    return NextResponse.json({ error: 'You are not allowed to create that role' }, { status: 403 });
  }

  try {
    const user = await createUser({
      name,
      email,
      role,
      employeeId: role === 'employee' ? employeeId || null : null,
      password: DEFAULT_NEW_USER_PASSWORD,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
