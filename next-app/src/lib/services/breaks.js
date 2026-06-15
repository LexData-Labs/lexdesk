import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';

// Break time — start/end break events per user. No approval. Simple event log,
// same Asia/Dhaka day handling the rest of the app uses.

function toIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return typeof v === 'string' ? v : null;
}

// action: 'start' | 'end'
export async function recordBreak(orgId, uid, action) {
  if (action !== 'start' && action !== 'end') throw Object.assign(new Error('invalid_action'), { status: 400 });
  const type = action === 'start' ? 'BREAK_START' : 'BREAK_END';
  const { db } = firebaseAdmin();
  const ref = await db.collection(Paths.breakEvents(orgId)).add({
    uid,
    type,
    timestamp: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, type };
}

export async function listMyBreaks(orgId, uid, limit = 100) {
  const { db } = firebaseAdmin();
  const snap = await db.collection(Paths.breakEvents(orgId)).where('uid', '==', uid).get();
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const events = snap.docs
    .map((d) => {
      const data = d.data();
      return { id: d.id, type: data.type, timestamp: toIso(data.timestamp) };
    })
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, n);
  // Derive whether the user is currently on a break (latest event is a START).
  const onBreak = events.length > 0 && events[0].type === 'BREAK_START';
  return { events, onBreak };
}
