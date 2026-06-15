import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { getEmployees } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

// GET /api/v1/directory — company directory for any signed-in employee.
export async function GET(request) {
  let user;
  try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
  try {
    const { employees } = await getEmployees(user.orgId);
    const people = employees.map((e) => ({
      uid: e.id,
      name: e.name,
      email: e.email,
      role: e.role,
      teamName: e.teamName,
      photoUrl: e.photoUrl,
    }));
    return NextResponse.json({ people });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
}
