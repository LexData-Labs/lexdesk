import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPolicy, getOffice } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// The subset of org policy + office an employee needs for a browser check-in:
// which checks are required, the GPS accuracy bar, and the office location for
// a distance hint. WiFi allowlists are deliberately excluded — useless to the
// card and mildly sensitive.

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id || !user.orgId) {
    return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });
  }

  try {
    const [pRes, oRes] = await Promise.all([getPolicy(user.orgId), getOffice(user.orgId)]);
    const p = pRes?.policy || null;
    const o = oRes?.office || null;
    return NextResponse.json({
      policy: p
        ? {
            requireWifi: !!p.requireWifi,
            requireGeo: !!p.requireGeo,
            requireQr: !!p.requireQr,
            requireFace: !!p.requireFace,
            gpsAccuracyMaxMeters: Number(p.gpsAccuracyMaxMeters) || null,
          }
        : null,
      office: o
        ? {
            name: o.name ?? null,
            lat: o.lat ?? null,
            lng: o.lng ?? null,
            radiusMeters: o.radiusMeters ?? null,
            startTime: o.startTime ?? null,
            endTime: o.endTime ?? null,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
