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
  };
}
