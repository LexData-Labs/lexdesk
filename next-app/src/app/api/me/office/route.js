import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOffice } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// The org's office (used as the employee's "Branch"). Any authenticated user;
// the server uses the org API key. Never throws to the client.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await getOffice();
    return NextResponse.json({ name: data?.office?.name || null });
  } catch {
    return NextResponse.json({ name: null });
  }
}
