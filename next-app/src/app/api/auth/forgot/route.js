import { NextResponse } from 'next/server';
import { forgotPassword } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// Public (pre-login). Triggers a Firebase password-reset email via AttendDesk.
// Always returns { ok: true } for a well-formed email so we never reveal whether
// an account exists, and a flaky upstream never blocks the UX.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = (body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  try {
    await forgotPassword(email);
  } catch {
    // Swallow upstream errors (missing scope/config/network) for a uniform reply.
  }
  return NextResponse.json({ ok: true });
}
