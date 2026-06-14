// Single-org + QR config. ORG_ID pins every Firestore path to the one existing
// organization in the shared Firebase project (set LEXDESK_ORG_ID from the
// live data — see scripts/probe-org.mjs). QR secret/window must match
// AttendDesk so rotating QR tokens validate across clients.

export const ORG_ID = process.env.LEXDESK_ORG_ID || 'default';

export const serverConfig = {
  qr: {
    get secret() {
      const s = process.env.QR_TOKEN_SECRET;
      if (!s) throw new Error('QR_TOKEN_SECRET is not set');
      return s;
    },
    windowSeconds: Number(process.env.QR_TOKEN_WINDOW_SECONDS) || 30,
  },
};
