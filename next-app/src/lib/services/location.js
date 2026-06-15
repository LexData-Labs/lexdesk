import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';
import { getFeatures } from './features';

// Background-location ping from the Android client (audit-only). Ported from
// AttendDesk: source must match the org's location mode, capturedAt within
// ±5 min, per-uid rate limit derived from the configured cadence. Throws a
// tagged error ({status, body, headers}) on rejection so the route can return it.

const MAX_SKEW_MS = 5 * 60 * 1000;
const VALID_SOURCES = ['periodic', 'continuous', 'geofence_enter', 'geofence_exit'];

function reject(status, body, headers) {
  throw Object.assign(new Error(body.error || 'rejected'), { status, body, headers });
}

export async function recordLocationPing(orgId, uid, email, body) {
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracy = Number(body?.accuracy);
  const source = body?.source;
  const capturedAt = body?.capturedAt;
  if (
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180 ||
    !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000 ||
    !VALID_SOURCES.includes(source) ||
    typeof capturedAt !== 'string'
  ) {
    reject(400, { error: 'invalid_body' });
  }

  const features = await getFeatures(orgId);
  if (features.location.mode === 'manual') {
    reject(403, { error: 'feature_disabled', feature: 'location.mode' });
  }
  const sourceOk =
    (source === 'periodic' && features.location.mode === 'periodic') ||
    (source === 'continuous' && features.location.mode === 'continuous') ||
    ((source === 'geofence_enter' || source === 'geofence_exit') && features.location.mode === 'geofence');
  if (!sourceOk) reject(400, { error: 'source_mode_mismatch' });

  const capturedMs = Date.parse(capturedAt);
  if (!Number.isFinite(capturedMs) || Math.abs(Date.now() - capturedMs) > MAX_SKEW_MS) {
    reject(400, { error: 'captured_at_skew' });
  }

  const minIntervalMs =
    source === 'periodic'
      ? Math.max(1000, (features.location.periodicIntervalMinutes * 60000) / 2)
      : source === 'continuous'
        ? Math.max(1000, (features.location.continuousIntervalSeconds * 1000) / 2)
        : 10000;

  const { db } = firebaseAdmin();
  const userRef = db.doc(Paths.user(orgId, uid));
  const userSnap = await userRef.get();
  const lastPingAt = userSnap.exists ? userSnap.data()?.lastLocationPingAt : undefined;
  if (lastPingAt?.toMillis && Date.now() - lastPingAt.toMillis() < minIntervalMs) {
    const retryAfter = Math.ceil(minIntervalMs / 1000);
    reject(429, { error: 'rate_limited', retryAfterSeconds: retryAfter }, { 'Retry-After': String(retryAfter) });
  }

  await Promise.all([
    db.collection(Paths.locationPings(orgId)).add({
      uid,
      email,
      lat,
      lng,
      accuracy,
      capturedAt: new Date(capturedAt),
      serverReceivedAt: FieldValue.serverTimestamp(),
      source,
      isMockLocation: !!body.isMockLocation,
    }),
    userRef.set({ lastLocationPingAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => undefined),
  ]);
  return { ok: true };
}
