import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { checkIn } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// GPS-verified check-in/out from the browser. The uid comes from the VERIFIED
// token and the upstream payload is rebuilt from a whitelist, so a client can
// never check in as someone else or smuggle trust-elevating fields (clientMode,
// qrToken, faceEmbeddingB64). clientMode is omitted on purpose: AttendDesk
// defaults it to 'mobile', which runs the full server-side policy validation.
// isMockLocation is also omitted — a browser can't detect mocking, and sending
// false would assert something we never verified.

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id || !user.orgId) {
    return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body?.type;
  if (type !== 'CHECK_IN' && type !== 'CHECK_OUT') {
    return NextResponse.json({ error: 'type must be CHECK_IN or CHECK_OUT' }, { status: 400 });
  }

  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracyMeters = Number(body?.accuracyMeters);
  if (
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180 ||
    !Number.isFinite(accuracyMeters) || accuracyMeters < 0
  ) {
    return NextResponse.json({ error: 'lat, lng and accuracyMeters are required' }, { status: 400 });
  }

  try {
    const result = await checkIn(
      { userId: String(user.id), type, lat, lng, accuracyMeters },
      user.orgId,
    );
    // AttendDesk returns 2xx even when checks fail (ok:false, per-check
    // results) — pass it through as data so the UI can render each check.
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
