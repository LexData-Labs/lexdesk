import { NextResponse } from 'next/server';
import { signToken, publicUser } from '@/lib/auth';
import { verifyCredentials } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// AttendDesk roles -> next-app roles. SUPER_ADMIN can't actually reach here
// (the verify-credentials endpoint rejects super admins) but is mapped defensively.
const ROLE_MAP = { ADMIN: 'admin', EMPLOYEE: 'employee', SUPER_ADMIN: 'superadmin' };

function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  // Credentials are verified by AttendDesk's external API (server-side, with the
  // adk_live_ key). next-app no longer checks passwords locally — it only mints
  // the session JWT once AttendDesk confirms the login.
  let result;
  try {
    result = await verifyCredentials(email, password);
  } catch (err) {
    // Non-2xx from AttendDesk: missing 'auth:verify' scope (403), rate-limited
    // (429), not-configured/upstream (502/503). Surface as a service error so
    // it's distinguishable from a plain wrong-password.
    const status =
      Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 502;
    return NextResponse.json(
      { error: 'Authentication service unavailable', detail: err?.message || 'upstream_error' },
      { status },
    );
  }

  if (!result?.valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ad = result.user || {};
  const name = ad.name || ad.email || email;
  const user = {
    id: ad.id,
    email: ad.email || email,
    name,
    role: ROLE_MAP[ad.role] || 'employee',
    avatar: initialsFromName(name),
    employeeId: null,
  };

  try {
    const token = signToken(user);
    return NextResponse.json({ token, user: publicUser(user) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
