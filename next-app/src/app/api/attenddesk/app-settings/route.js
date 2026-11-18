import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAppDownloadUrl, setAppDownloadUrl } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const isAdmin = (user) => user.role === 'admin' || user.role === 'superadmin' || user.role === 'dev';

// GET: current value (admins; the public read lives at /api/app-download).
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    return NextResponse.json(await getAppDownloadUrl(user.orgId));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 502 });
  }
}

// POST: { appDownloadUrl } — '' clears it and restores the env fallback.
export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  try {
    return NextResponse.json(await setAppDownloadUrl(user.orgId, body?.appDownloadUrl));
  } catch (err) {
    return NextResponse.json({ error: err.message, code: err.code ?? null }, { status: err.status || 502 });
  }
}
