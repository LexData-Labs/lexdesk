import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Server-only Firebase Admin SDK. Talks to the SAME Firebase project the
// AttendDesk app uses, so LexDesk reads/writes the existing live data directly
// (no HTTP proxy). FIREBASE_SERVICE_ACCOUNT is base64 or raw service-account JSON.

function decodeServiceAccount(raw) {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf-8');
  const parsed = JSON.parse(json);
  const projectId = parsed.project_id ?? parsed.projectId;
  const clientEmail = parsed.client_email ?? parsed.clientEmail;
  const privateKey = (parsed.private_key ?? parsed.privateKey ?? '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT missing project_id, client_email, or private_key');
  }
  return { projectId, clientEmail, privateKey };
}

let cached;

export function firebaseAdmin() {
  if (cached) return cached;
  const existing = getApps()[0];
  const app =
    existing ??
    (() => {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
      const sa = decodeServiceAccount(raw);
      return initializeApp({
        credential: cert({ projectId: sa.projectId, clientEmail: sa.clientEmail, privateKey: sa.privateKey }),
        projectId: sa.projectId,
      });
    })();
  const db = getFirestore(app);
  // Treat `undefined` fields as "skip" rather than erroring — anti-cheat
  // checks that pass record no `reason`, which would otherwise be undefined.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() may only be called once before first use; ignore if already set.
  }
  cached = { app, auth: getAuth(app), db };
  return cached;
}

export { FieldValue };
