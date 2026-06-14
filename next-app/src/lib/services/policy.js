import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';
import { FACE_EMBEDDING_DIM, FACE_EMBEDDING_MODEL } from './face';

// Org attendance policy (single doc). Ported from AttendDesk; same response
// shape (policy + face embedding metadata).

export async function getPolicy(orgId) {
  const { db } = firebaseAdmin();
  const snap = await db.doc(Paths.policy(orgId)).get();
  return {
    policy: snap.exists ? snap.data() : null,
    faceEmbeddingDim: FACE_EMBEDDING_DIM,
    faceEmbeddingModel: FACE_EMBEDDING_MODEL,
  };
}

// body: { requireWifi, requireGeo, requireQr, requireFace, faceThreshold, gpsAccuracyMaxMeters }
export async function updatePolicy(body, orgId) {
  const { db } = firebaseAdmin();
  const ref = db.doc(Paths.policy(orgId));
  await ref.set({ ...body, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const snap = await ref.get();
  return {
    policy: snap.exists ? snap.data() : null,
    faceEmbeddingDim: FACE_EMBEDDING_DIM,
    faceEmbeddingModel: FACE_EMBEDDING_MODEL,
  };
}
