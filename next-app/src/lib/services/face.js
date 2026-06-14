// Face embedding math — ported verbatim from AttendDesk so embeddings enrolled
// on any client (web/Android/kiosk) match. 128-D float32, L2-normalized; the
// stored/transport form is base64 of the raw little-endian bytes (512 bytes).

export const FACE_EMBEDDING_DIM = 128;
export const FACE_EMBEDDING_MODEL = 'facenet-128';

export function decodeEmbedding(b64) {
  const buf = Buffer.from(b64, 'base64');
  if (buf.byteLength !== FACE_EMBEDDING_DIM * 4) {
    throw new Error(`bad_embedding_length: got ${buf.byteLength} bytes, expected ${FACE_EMBEDDING_DIM * 4}`);
  }
  return new Float32Array(buf.buffer, buf.byteOffset, FACE_EMBEDDING_DIM);
}

export function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error('embedding_dim_mismatch');
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot; // inputs are L2-normalized, so the dot product IS cosine similarity
}

export function l2Normalize(v) {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) sumSq += (v[i] ?? 0) ** 2;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return v;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = (v[i] ?? 0) / norm;
  return out;
}

// Average 3-10 capture embeddings into one enrollment reference and return it
// as base64 (little-endian float32) — the exact value stored as faceEmbeddingB64.
export function averageEmbeddings(embeddingsB64) {
  const decoded = embeddingsB64.map(decodeEmbedding);
  const avg = new Float32Array(FACE_EMBEDDING_DIM);
  for (const e of decoded) {
    for (let i = 0; i < FACE_EMBEDDING_DIM; i++) avg[i] = (avg[i] ?? 0) + (e[i] ?? 0) / decoded.length;
  }
  const normalized = l2Normalize(avg);
  return Buffer.from(normalized.buffer, normalized.byteOffset, normalized.byteLength).toString('base64');
}
