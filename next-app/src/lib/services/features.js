// Single-org LexDesk has no cross-org SUPER_ADMIN to gate features, so every
// capability is on. Kept as a function returning the same shape AttendDesk's
// attendance service reads (verify.* / service.*) so processCheckIn is
// unchanged. desktop_kiosk/external paths are unused here (web-only) but the
// flags stay truthful.
export async function getFeatures() {
  return {
    verify: { wifi: true, gps: true, qr: true, face: true },
    service: {
      kiosk: true,
      photos: true,
      faceEnrollment: true,
      history: true,
      leaveRequests: true,
      apiAccess: true,
    },
    // Background-location mode for the mobile app. 'manual' = no background
    // pings (default). The policy endpoint surfaces this and the location-ping
    // route gates + rate-limits on it.
    location: {
      mode: process.env.LEXDESK_LOCATION_MODE || 'manual',
      periodicIntervalMinutes: Number(process.env.LEXDESK_LOCATION_PERIODIC_MIN) || 15,
      continuousIntervalSeconds: Number(process.env.LEXDESK_LOCATION_CONTINUOUS_SEC) || 60,
    },
  };
}

// Standard 403 for a disabled feature (mobile routes mirror AttendDesk).
export function featureDisabledResponse(group, feature) {
  return Response.json({ error: 'feature_disabled', feature: `${group}.${feature}` }, { status: 403 });
}
