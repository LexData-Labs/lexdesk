import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getEmployee, updateName } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// The signed-in user's own AttendDesk profile. The list endpoint returns a fresh
// signed photoUrl per employee; we filter to the caller's uid (from the token)
// so they only ever get their own record.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  try {
    let me = null;
    try {
      const data = await getEmployee(String(user.id));
      me = data.employee || null;
    } catch (e) {
      if (e.status !== 404) throw e; // 404 → treat as "no linked record"
    }
    if (!me) return NextResponse.json({ profile: null });
    return NextResponse.json({
      profile: {
        id: me.id,
        name: me.name || '',
        email: me.email || user.email || '',
        role: me.role || '',
        employeeId: me.employeeId || null,
        teamName: me.teamName || null,
        joiningDate: me.createdAt || null,
        photoUrl: me.photoUrl || null,
        faceEnrolledAt: me.faceEnrolledAt || null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}

// Update the signed-in user's own display name (email comes from the token).
export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: 'no_email_on_account' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: 'Name is too long (max 80)' }, { status: 400 });

  try {
    const data = await updateName(user.email, name);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}
