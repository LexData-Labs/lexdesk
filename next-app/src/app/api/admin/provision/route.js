import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createEmployee, getEmployees } from '@/lib/backend';
import { firebaseAdmin, FieldValue } from '@/lib/firebase';
import { Paths } from '@/lib/paths';
import { ORG_ID } from '@/lib/config';

export const dynamic = 'force-dynamic';

// System-admin provisioning: set the organization (company name) and create the
// org's first ADMIN with a temporary password. Superadmin-only (the env system
// admin or a seeded SUPER_ADMIN). Single-org: acts on the pinned ORG_ID.
const isSuper = (user) => user.role === 'superadmin';

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuper(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { db } = firebaseAdmin();
    const orgSnap = await db.doc(Paths.org(ORG_ID)).get();
    const { employees } = await getEmployees(ORG_ID);
    const admins = (employees || []).filter((e) => String(e.role || '').toUpperCase() === 'ADMIN');
    return NextResponse.json({
      org: { id: ORG_ID, name: orgSnap.exists ? orgSnap.data().name || '' : '' },
      admins,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuper(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const companyName = String(body?.companyName || '').trim();
  const adminName = String(body?.adminName || '').trim();
  const adminEmail = String(body?.adminEmail || '').trim();
  if (!companyName || !adminName || !adminEmail) {
    return NextResponse.json({ error: 'Company name, admin name and admin email are required' }, { status: 400 });
  }

  try {
    // 1) Set/refresh the organization's company name.
    const { db } = firebaseAdmin();
    await db.doc(Paths.org(ORG_ID)).set(
      { name: companyName, source: 'lexdesk', updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    // 2) Create the org admin (temp password returned to hand over).
    const result = await createEmployee({ email: adminEmail, name: adminName, role: 'ADMIN' }, ORG_ID);
    return NextResponse.json(
      { ok: true, org: companyName, admin: result.employee },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}
