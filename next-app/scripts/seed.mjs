// One-time bootstrap for a FRESH Firebase project: creates the org, the first
// ADMIN (in Firebase Auth + Firestore), and a default attendance policy so you
// can log in and start adding employees from the dashboard.
//
// Prereqs: .env.local has the new project's FIREBASE_SERVICE_ACCOUNT and
// LEXDESK_ORG_ID. Then run (PowerShell):
//   $env:SEED_COMPANY="LexData Labs"; $env:SEED_ADMIN_NAME="Your Name";
//   $env:SEED_ADMIN_EMAIL="admin@lexdatalabs.com"; $env:SEED_ADMIN_PASSWORD="Strong#Pass1";
//   node scripts/seed.mjs
// Idempotent: re-running updates the admin's password/profile rather than erroring.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function envFromFile() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const fileEnv = envFromFile();
const get = (k) => process.env[k] || fileEnv[k];

const ORG_ID = get('LEXDESK_ORG_ID');
const company = process.env.SEED_COMPANY;
const adminName = process.env.SEED_ADMIN_NAME;
const adminEmail = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

const missing = [];
if (!ORG_ID) missing.push('LEXDESK_ORG_ID (in .env.local)');
if (!company) missing.push('SEED_COMPANY');
if (!adminName) missing.push('SEED_ADMIN_NAME');
if (!adminEmail) missing.push('SEED_ADMIN_EMAIL');
if (!adminPassword || adminPassword.length < 6) missing.push('SEED_ADMIN_PASSWORD (>=6 chars)');
if (missing.length) {
  console.error('Missing required values:\n  - ' + missing.join('\n  - '));
  process.exit(1);
}

const saRaw = get('FIREBASE_SERVICE_ACCOUNT');
if (!saRaw) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not set in .env.local');
  process.exit(1);
}
const saJson = saRaw.trim().startsWith('{') ? saRaw : Buffer.from(saRaw, 'base64').toString('utf8');
const sa = JSON.parse(saJson);

initializeApp({
  credential: cert({
    projectId: sa.project_id ?? sa.projectId,
    clientEmail: sa.client_email ?? sa.clientEmail,
    privateKey: (sa.private_key ?? sa.privateKey).replace(/\\n/g, '\n'),
  }),
  projectId: sa.project_id ?? sa.projectId,
});
const db = getFirestore();
const auth = getAuth();

const userPath = (uid) => `organizations/${ORG_ID}/users/${uid}`;

// 1) Org document
await db.doc(`organizations/${ORG_ID}`).set(
  { name: company, createdAt: FieldValue.serverTimestamp(), source: 'lexdesk' },
  { merge: true },
);

// 2) First admin in Firebase Auth (create or update)
let uid;
try {
  const existing = await auth.getUserByEmail(adminEmail);
  uid = existing.uid;
  await auth.updateUser(uid, { password: adminPassword, displayName: adminName, emailVerified: true });
  console.log(`Admin already existed — updated password/profile (uid ${uid}).`);
} catch {
  const rec = await auth.createUser({ email: adminEmail, password: adminPassword, displayName: adminName, emailVerified: true });
  uid = rec.uid;
  console.log(`Created admin in Firebase Auth (uid ${uid}).`);
}
await auth.setCustomUserClaims(uid, { role: 'ADMIN', orgId: ORG_ID, email: adminEmail });

// 3) Admin profile doc + userIndex
await db.doc(userPath(uid)).set(
  {
    email: adminEmail,
    name: adminName,
    role: 'ADMIN',
    teamId: null,
    teamName: null,
    employeeId: null,
    mustChangePassword: false,
    faceEmbeddingB64: null,
    faceEmbeddingModel: null,
    faceEnrolledAt: null,
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);
await db.doc(`userIndex/${uid}`).set({ orgId: ORG_ID, role: 'ADMIN', email: adminEmail }, { merge: true });

// 4) Default policy (geo-only + lenient) so check-in works once an office is set.
//    Admin tunes this + adds the office/location in the dashboard → AttendDesk settings.
const policyRef = db.doc(`organizations/${ORG_ID}/policy/default`);
if (!(await policyRef.get()).exists) {
  await policyRef.set({
    requireWifi: false,
    requireGeo: true,
    requireQr: false,
    requireFace: false,
    faceThreshold: 0.6,
    gpsAccuracyMaxMeters: 100,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log('Seeded default attendance policy (geo-only).');
}

console.log('\n✅ Seed complete.');
console.log(`   Org:   ${company}  (LEXDESK_ORG_ID=${ORG_ID})`);
console.log(`   Admin: ${adminEmail}  (role ADMIN)`);
console.log('   Next: log in with that email/password, then add the Office location + employees in the dashboard.');
process.exit(0);
