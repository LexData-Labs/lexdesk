'use client';

import { useEffect, useState } from 'react';

// AttendDesk failure reasons → friendly text. Unknown reasons fall through raw
// so new upstream checks still surface something meaningful.
const REASON_TEXT = {
  ssid_and_bssid_not_in_allowlist: 'Not on an approved office Wi-Fi network — use the mobile app',
  mock_location: 'Mock location detected',
  missing_location: 'No location was provided',
  low_accuracy: 'GPS accuracy too low — desktop browsers often only get ~500 m; try a phone browser',
  outside_geofence: "You're outside the office area",
  missing_qr_token: 'QR scan required — use the mobile app',
  invalid_qr_token: 'QR code invalid or expired — use the mobile app',
  qr_token_already_used: 'QR code already used — use the mobile app',
  face_not_enrolled: 'Face not enrolled — enroll from the mobile app',
  missing_face_embedding: 'Face verification required — use the mobile app',
  liveness_failed: 'Face liveness check failed — use the mobile app',
  similarity_below_threshold: "Face didn't match — use the mobile app",
};

const CHECK_LABEL = { wifi: 'Wi-Fi', geo: 'Location', qr: 'QR code', face: 'Face' };

const GEO_ERROR = {
  1: 'Location permission denied — allow location for this site in your browser settings, then retry.',
  2: "Location unavailable — your device couldn't get a GPS fix.",
  3: 'Timed out getting your location — try again near a window, or from a phone.',
};

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function timeFmt(ms) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms));
  } catch {
    return '—';
  }
}

export default function CheckInCard({ onSuccess, todayIn, todayOut }) {
  const [phase, setPhase] = useState('idle'); // idle | locating | submitting
  const [info, setInfo] = useState(null); // { policy, office } — pre-warnings only, non-fatal if missing
  const [result, setResult] = useState(null); // last check-in response + { type, dist }
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/me/policy', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok) setInfo(json);
      } catch {
        // ignore — the card still works, just without pre-warnings
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const mobileOnly = [
    info?.policy?.requireWifi && 'Wi-Fi',
    info?.policy?.requireQr && 'QR',
    info?.policy?.requireFace && 'Face',
  ].filter(Boolean);

  async function submit(type) {
    setError('');
    setResult(null);
    if (!('geolocation' in navigator) || window.isSecureContext === false) {
      setError('Location needs a secure connection — open this page over https:// (or localhost).');
      return;
    }
    setPhase('locating');
    let coords;
    try {
      coords = (await getPosition()).coords;
    } catch (e) {
      setError(GEO_ERROR[e?.code] || 'Could not get your location.');
      setPhase('idle');
      return;
    }
    setPhase('submitting');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, lat: coords.latitude, lng: coords.longitude, accuracyMeters: coords.accuracy }),
      });
      if (res.status === 401) {
        setError('Session expired — please sign in again.');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      const dist =
        info?.office?.lat != null && info?.office?.lng != null
          ? distanceMeters(coords.latitude, coords.longitude, info.office.lat, info.office.lng)
          : null;
      setResult({ ...json, type, dist });
      if (json.ok) onSuccess?.();
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setPhase('idle');
    }
  }

  const busy = phase !== 'idle';

  return (
    <div className="card flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-[var(--color-text-main)]">Verify &amp; Check In</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Location-verified from your browser
          {info?.policy?.gpsAccuracyMaxMeters ? ` · GPS accuracy ≤ ${info.policy.gpsAccuracyMaxMeters} m` : ''}
        </p>
        {(todayIn || todayOut) && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Today: in {todayIn ? timeFmt(todayIn) : '—'} · out {todayOut ? timeFmt(todayOut) : '—'}
          </p>
        )}
      </div>

      {mobileOnly.length > 0 && (
        <div className="text-xs rounded-lg border border-[rgba(234,179,8,0.35)] bg-[rgba(234,179,8,0.08)] text-[var(--color-yellow)] px-3 py-2">
          Your organization requires {mobileOnly.join(', ')} verification, which only works in the
          mobile app — browser check-in will fail until done there.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => submit('CHECK_IN')}
          disabled={busy}
          className="btn-primary py-2 px-4 text-sm flex-1 disabled:opacity-60"
        >
          {phase === 'locating' ? 'Getting location…' : phase === 'submitting' ? 'Submitting…' : 'Check In'}
        </button>
        <button
          onClick={() => submit('CHECK_OUT')}
          disabled={busy}
          className="btn-outline py-2 px-4 text-sm flex-1 disabled:opacity-60"
        >
          Check Out
        </button>
      </div>

      {error && <p className="text-sm text-[var(--color-red)]">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2 text-sm">
          <p className={`font-semibold ${result.ok ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
            {result.ok
              ? result.type === 'CHECK_IN' ? 'Checked in ✓' : 'Checked out ✓'
              : result.type === 'CHECK_IN' ? 'Check-in failed' : 'Check-out failed'}
            {result.dist != null && (
              <span className="font-normal text-[var(--color-text-muted)]">
                {' '}· ~{result.dist} m from {info?.office?.name || 'office'}
              </span>
            )}
          </p>
          {result.isLate && (
            <p className="text-xs text-[var(--color-yellow)]">Marked late — office starts at {result.scheduledStart}</p>
          )}
          {result.isEarly && (
            <p className="text-xs text-[var(--color-yellow)]">Early checkout — office ends at {result.scheduledEnd}</p>
          )}
          <div className="flex flex-col gap-1">
            {(result.results || []).map((r) => (
              <div key={r.name} className="flex items-start gap-2">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    r.passed ? 'bg-[var(--color-green)]' : r.required ? 'bg-[var(--color-red)]' : 'bg-[var(--color-text-muted)]'
                  }`}
                />
                <span className="text-xs text-[var(--color-text-main)]">
                  {CHECK_LABEL[r.name] || r.name}
                  {!r.passed && r.reason ? (
                    <span className="text-[var(--color-text-muted)]"> — {REASON_TEXT[r.reason] || r.reason}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
