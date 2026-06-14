import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { changePassword } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// Change the signed-in user's own password. The email comes from the verified
// session token (never the client), so a user can only change their own.
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
  const { currentPassword, newPassword } = body || {};
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const data = await changePassword(user.email, currentPassword, newPassword, user.orgId);
    return NextResponse.json(data);
  } catch (err) {
    // Map the upstream's invalid-current-password (401) to a clear message.
    const status = err.status || 502;
    const error = err.status === 401 ? 'Current password is incorrect' : err.message;
    return NextResponse.json({ error, upstream: err.body ?? null }, { status });
  }
}
