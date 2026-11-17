// Issue a temporary password for one employee, against the Firebase project in
// .env.local. Run from next-app/:
//   node scripts/set-temp-password.mjs someone@lexdatalabs.com
//
// Why this exists: the deployed app's own Reset password writes through
// FIREBASE_SERVICE_ACCOUNT while sign-in verifies through
// NEXT_PUBLIC_FIREBASE_API_KEY. When those are configured for different
// Firebase projects the reset lands where logins are not checked, so the
// dashboard hands out passwords that never work. This script uses one
// project for both and PROVES the result by signing in before printing it.
//
// Refuses admin-level targets, mirroring the reset-password route's ladder.
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws;

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('usage: node scripts/set-temp-password.mjs <email>'); process.exit(2); }

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
for (const l of raw.split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m) env[m[1]] = m[2].replace(/^["'`]|["'`]$/g, ''); }

const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')
  ? env.FIREBASE_SERVICE_ACCOUNT.trim()
  : Buffer.from(env.FIREBASE_SERVICE_ACCOUNT.trim(), 'base64').toString('utf8'));
initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\n/g, '\n') }) });
const auth = getAuth();
const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED || env.DATABASE_URL });
const ORG = env.LEXDESK_ORG_ID;

const { rows } = await pool.query(
  'SELECT firebase_uid, name, role FROM users WHERE org_id=$1 AND lower(trim(email))=$2', [ORG, email]);
if (rows.length !== 1) { console.error(`expected exactly 1 profile for ${email}, found ${rows.length}`); process.exit(1); }
const { firebase_uid: uid, name, role } = rows[0];
if (!['EMPLOYEE', 'IT_TEAM', 'DEV'].includes(String(role).toUpperCase())) {
  console.error(`refusing: ${email} is ${role}; admin-level accounts are not resettable here`); process.exit(1);
}

try { await auth.getUser(uid); }
catch (e) {
  if (e.code === 'auth/user-not-found') console.error(`no sign-in account at uid ${uid} — repair it first`);
  else console.error(e.code || e.message);
  process.exit(1);
}

const pw = crypto.randomBytes(8).toString('base64url');
await auth.updateUser(uid, { password: pw });
await auth.revokeRefreshTokens(uid);

// Prove it through the real sign-in path before printing anything.
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
const j = await r.json();
if (!j.localId) {
  console.error(`password was set but sign-in still rejects it: ${j.error?.message}`);
  console.error('FIREBASE_SERVICE_ACCOUNT and NEXT_PUBLIC_FIREBASE_API_KEY likely name different projects.');
  process.exit(1);
}

await pool.query('UPDATE users SET must_change_password=true WHERE firebase_uid=$1 AND org_id=$2', [uid, ORG]);
console.log(`\nproject   : ${sa.project_id}`);
console.log(`employee  : ${name} <${email}>  (${role})`);
console.log(`verified  : sign-in succeeded with this password`);
console.log(`\n  TEMPORARY PASSWORD:  ${pw}\n`);
console.log('They must change it on first sign-in. Share it over a private channel, not a group chat.');
await pool.end();
process.exit(0);
