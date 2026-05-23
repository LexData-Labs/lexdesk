import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSheetData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await params;
  if (!name) return NextResponse.json({ error: 'Sheet name required' }, { status: 400 });

  try {
    const data = await getSheetData(decodeURIComponent(name));
    return NextResponse.json({ sheetName: name, ...data });
  } catch (err) {
    const msg = err?.errors?.[0]?.message || err.message || 'Failed to fetch sheet';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
