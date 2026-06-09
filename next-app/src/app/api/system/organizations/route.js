import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { listOrganizations } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// LexDesk system admin only — list every org + its admins.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'lexsysadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const data = await listOrganizations();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
