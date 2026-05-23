import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAllSheetsData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getAllSheetsData();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err?.errors?.[0]?.message || err.message || 'Failed to fetch sheet data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
