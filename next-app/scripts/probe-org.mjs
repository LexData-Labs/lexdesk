// One-off: read the existing org id(s) + admins from the shared Firestore so we
// can pin LEXDESK_ORG_ID. Run: node scripts/probe-org.mjs
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const sa = /^FIREBASE_SERVICE_ACCOUNT=(.+)$/m.exec(env)[1].trim();
const json = sa.startsWith('{') ? sa : Buffer.from(sa, 'base64').toString('utf8');
const parsed = JSON.parse(json);

initializeApp({
  credential: cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  }),
});
const db = getFirestore();

const orgs = await db.collection('organizations').get();
console.log(`\norganizations (${orgs.size}):`);
for (const o of orgs.docs) {
  const d = o.data();
  const users = await db.collection(`organizations/${o.id}/users`).get();
  const admins = users.docs
    .filter((u) => String(u.data().role || '').toUpperCase().includes('ADMIN'))
    .map((u) => `${u.data().email} [${u.data().role}]`);
  console.log(`  id=${o.id}  name=${d.name || '—'}  domain=${d.domain || '—'}  users=${users.size}  admins=${admins.join(', ') || 'none'}`);
}
process.exit(0);
