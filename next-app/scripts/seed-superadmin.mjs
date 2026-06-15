// Create ONE system admin (role SUPER_ADMIN) in the existing org — a higher
// account than the org ADMIN, able to reset the org admin's password.
// Prereqs: .env.local has FIREBASE_SERVICE_ACCOUNT + LEXDESK_ORG_ID. Run:
//   $env:SEED_SA_NAME="..."; $env:SEED_SA_EMAIL="sysadmin@lexdatalabs.com";
//   $env:SEED_SA_PASSWORD="Strong#Pass1"; node scripts/seed-superadmin.mjs
// Idempotent: re-running updates the password/profile.

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
const name = process.env.SEED_SA_NAME;
const email = (process.env.SEED_SA_EMAIL || '').toLowerCase();
const password = process.env.SEED_SA_PASSWORD;

const missing = [];
if (!ORG_ID) missing.push('LEXDESK_ORG_ID (in .env.local)');
if (!name) missing.push('SEED_SA_NAME');
if (!email) missing.push('SEED_SA_EMAIL');
if (!password || password.length < 6) missing.push('SEED_SA_PASSWORD (>=6 chars)');
if (missing.length) {
  console.error('Missing required values:\n  - ' + missing.join('\n  - '));
  process.exit(1);
}

const saRaw = get('FIREBASE_SERVICE_ACCOUNT');
if (!saRaw) { console.error('FIREBASE_SERVICE_ACCOUNT not set'); process.exit(1); }
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

let uid;
try {
  const existing = await auth.getUserByEmail(email);
  uid = existing.uid;
  await auth.updateUser(uid, { password, displayName: name, emailVerified: true });
  console.log(`System admin already existed — updated (uid ${uid}).`);
} catch {
  const rec = await auth.createUser({ email, password, displayName: name, emailVerified: true });
  uid = rec.uid;
  console.log(`Created system admin in Firebase Auth (uid ${uid}).`);
}
await auth.setCustomUserClaims(uid, { role: 'SUPER_ADMIN', orgId: ORG_ID, email });

await db.doc(`organizations/${ORG_ID}/users/${uid}`).set(
  {
    email,
    name,
    role: 'SUPER_ADMIN',
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
await db.doc(`userIndex/${uid}`).set({ orgId: ORG_ID, role: 'SUPER_ADMIN', email }, { merge: true });

console.log(`\n✅ System admin ready: ${email} (role SUPER_ADMIN, org ${ORG_ID}).`);
console.log('   Log in with it, open the org admin\'s profile (Employees → admin), and Reset password.');
process.exit(0);
