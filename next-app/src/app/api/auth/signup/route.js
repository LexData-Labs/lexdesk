import { NextResponse } from 'next/server';
import { signToken, publicUser } from '@/lib/auth';
import { createOrganization } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Public org signup. Provisions a brand-new AttendDesk organization (+ its first
// admin) through the cross-org provisioning key, then auto-logs the admin in.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const companyName = String(body?.companyName || '').trim();
  const companyDomain = String(body?.companyDomain || '').trim().toLowerCase();
  const adminName = String(body?.adminName || '').trim();
  const designation = String(body?.designation || '').trim();
  const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!companyName || !companyDomain || !adminName || !adminEmail || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  let org;
  try {
    const res = await createOrganization({ companyName, companyDomain, adminName, adminEmail, password, designation: designation || null });
    org = res?.organization;
  } catch (err) {
    const code = err?.body?.error;
    if (err?.status === 409 || code === 'domain_taken') {
      return NextResponse.json(
        { error: 'That company domain is already registered. Try signing in instead.' },
        { status: 409 },
      );
    }
    if (code === 'email_taken') {
      return NextResponse.json(
        { error: 'An account already exists for that email. Try signing in instead.' },
        { status: 409 },
      );
    }
    const status =
      Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 502;
    return NextResponse.json(
      { error: 'Could not create organization', detail: err?.message || 'signup_error' },
      { status },
    );
  }

  if (!org?.orgId || !org?.admin?.uid) {
    return NextResponse.json({ error: 'Unexpected signup response' }, { status: 502 });
  }

  // Auto-login the new admin.
  const user = {
    id: org.admin.uid,
    email: org.admin.email || adminEmail,
    name: adminName,
    role: 'admin',
    avatar: initialsFromName(adminName),
    employeeId: null,
    orgId: org.orgId,
  };
  try {
    const token = signToken(user);
    return NextResponse.json({ token, user: publicUser(user) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
