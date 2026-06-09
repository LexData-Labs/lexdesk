import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { resetUserPassword } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// LexDesk system admin only — reset an org admin's password to a temp password.
export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'lexsysadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const orgId = String(body?.orgId || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  if (!orgId || !email) {
    return NextResponse.json({ error: 'orgId and email are required' }, { status: 400 });
  }

  try {
    const result = await resetUserPassword(email, orgId);
    return NextResponse.json(result);
  } catch (err) {
    // 404 from upstream → the email isn't an admin of that org.
    if (err.status === 404) {
      return NextResponse.json({ error: 'That email is not an admin of the selected organization.' }, { status: 404 });
    }
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
