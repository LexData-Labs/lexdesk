'use client';

// Browser face-embedding pipeline with EXACT parity to the Android app
// (FaceEmbedder.kt) and the Windows kiosk (FaceEmbedder.cs), both of which
// match against the same server-side enrollment:
//   detect largest face -> crop the EXACT bounding box clamped to the frame
//   (no padding) -> resize to 160x160 bilinear WITHOUT preserving aspect ->
//   RGB float32 (p - 127.5) / 128 -> FaceNet ONNX (input_1 -> Identity)
//   -> L2-normalize the 128-D output -> base64 of raw float32 LITTLE-ENDIAN
//   bytes (512 bytes -> 684 chars).
// Everything here is lazy: nothing (runtimes, 23 MB model) loads until
// initFace() is called from the capture modal.

const MODEL_URL = '/models/face_embedder.onnx';
const MODEL_BYTES_HINT = 23256194; // fallback when content-length is absent
const DETECTOR_MODEL_URL = '/models/blaze_face_short_range.tflite';
const MEDIAPIPE_WASM_DIR = '/models/mediapipe';
const ORT_WASM_DIR = '/models/ort/';
const INPUT_SIZE = 160;
const EMBEDDING_DIM = 128;
// Subject must fill a reasonable share of the frame (proxy for ML Kit's
// minFaceSize 0.35 / the kiosk's 80 px floor).
const MIN_FACE_FRACTION = 0.25;

let _initPromise = null;
let _session = null;
let _detector = null;
let _cropCtx = null;
let _ortTensor = null;

// Typed arrays use platform byte order; the transport format is little-endian.
// Every browser target we support is LE — this guard documents the assumption.
function assertLittleEndian() {
  if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1) {
    throw new Error('big_endian_unsupported');
  }
}

async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`model_fetch_failed: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || MODEL_BYTES_HINT;
  if (!res.body) return await res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(received, total);
  }
  const buf = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.length; }
  return buf.buffer;
}

// Idempotent: concurrent/repeat callers share one promise; the ort session and
// detector live for the whole SPA session (reopening the modal is instant).
export function initFace({ onModelProgress } = {}) {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    assertLittleEndian();
    const [ort, vision] = await Promise.all([
      import('onnxruntime-web/wasm'),
      import('@mediapipe/tasks-vision'),
    ]);
    ort.env.wasm.wasmPaths = ORT_WASM_DIR;
    // Not crossOriginIsolated (no COOP/COEP headers) -> no SharedArrayBuffer;
    // run single-threaded SIMD rather than letting ort probe and fail.
    ort.env.wasm.numThreads = 1;

    const [modelBuf, fileset] = await Promise.all([
      fetchWithProgress(MODEL_URL, onModelProgress),
      vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_DIR),
    ]);
    const [session, detector] = await Promise.all([
      ort.InferenceSession.create(modelBuf, { executionProviders: ['wasm'] }),
      vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: DETECTOR_MODEL_URL },
        runningMode: 'VIDEO',
      }),
    ]);
    if (session.inputNames[0] !== 'input_1' || session.outputNames[0] !== 'Identity') {
      throw new Error(`unexpected_model_io: ${session.inputNames[0]} -> ${session.outputNames[0]}`);
    }
    // Warm-up: the first run JIT-compiles kernels; do it on zeros now so the
    // user's first real capture isn't the slow one.
    await session.run({
      input_1: new ort.Tensor('float32', new Float32Array(INPUT_SIZE * INPUT_SIZE * 3), [1, INPUT_SIZE, INPUT_SIZE, 3]),
    });
    _session = session;
    _detector = detector;
    _ortTensor = (data) => new ort.Tensor('float32', data, [1, INPUT_SIZE, INPUT_SIZE, 3]);
  })();
  _initPromise.catch(() => { _initPromise = null; }); // allow retry after failure
  return _initPromise;
}

export async function openCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function stopCamera(stream) {
  for (const t of stream?.getTracks() || []) t.stop();
}

// Largest detected face as an exact, frame-clamped crop box — or null when no
// face is found or the face is too small/degenerate.
export function detectLargestFace(videoEl) {
  if (!_detector || !videoEl.videoWidth) return null;
  const result = _detector.detectForVideo(videoEl, performance.now());
  let best = null;
  for (const d of result?.detections || []) {
    const b = d.boundingBox;
    if (!b) continue;
    if (!best || b.width * b.height > best.width * best.height) best = b;
  }
  if (!best) return null;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (best.width < MIN_FACE_FRACTION * vw) return null;
  // MediaPipe boxes can extend past the frame; INTERSECT with the frame like
  // Android's coerceIn and the kiosk's Rect.Intersect. Clamp both edges and
  // derive the size — clamping only the origin would keep the spilled width
  // and shift the face inside the crop, breaking embedding parity.
  const sx = Math.min(Math.max(0, Math.round(best.originX)), vw - 1);
  const sy = Math.min(Math.max(0, Math.round(best.originY)), vh - 1);
  const ex = Math.min(vw, Math.round(best.originX + best.width));
  const ey = Math.min(vh, Math.round(best.originY + best.height));
  const sw = ex - sx;
  const sh = ey - sy;
  if (sw < 2 || sh < 2) return null;
  return { sx, sy, sw, sh };
}

function cropCtx() {
  if (!_cropCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = INPUT_SIZE;
    canvas.height = INPUT_SIZE;
    _cropCtx = canvas.getContext('2d', { willReadFrequently: true });
    _cropCtx.imageSmoothingEnabled = true;
    // Default 'low' quality ~ bilinear, the closest match to Android's
    // ResizeOp BILINEAR and the kiosk's OpenCV INTER_LINEAR. 'high' uses a
    // better multi-step filter and would drift from the enrolled embeddings.
  }
  return _cropCtx;
}

// One frame -> L2-normalized 128-D Float32Array, or null if no usable face.
async function embedFrame(videoEl) {
  const box = detectLargestFace(videoEl);
  if (!box) return null;
  const ctx = cropCtx();
  // Crop + stretch to 160x160 in one drawImage — aspect deliberately NOT
  // preserved, and never mirrored (the preview's CSS mirror doesn't apply).
  ctx.drawImage(videoEl, box.sx, box.sy, box.sw, box.sh, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const rgba = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const f = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4) {
    f[j++] = (rgba[i] - 127.5) / 128;     // R
    f[j++] = (rgba[i + 1] - 127.5) / 128; // G
    f[j++] = (rgba[i + 2] - 127.5) / 128; // B
  }
  const out = await _session.run({ input_1: _ortTensor(f) });
  return l2Normalize(out.Identity.data);
}

function l2Normalize(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s);
  if (n === 0) return Float32Array.from(v);
  const outV = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) outV[i] = v[i] / n;
  return outV;
}

function encodeB64(f32) {
  const bytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function decodeB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer, 0, EMBEDDING_DIM);
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Single verification capture. Null means "no acceptable face this frame" —
// the caller's loop just tries again on the next tick.
export async function captureEmbedding(videoEl) {
  const emb = await embedFrame(videoEl);
  return emb ? { b64: encodeB64(emb) } : null;
}

// Enrollment: n frames at least 400 ms apart. Each candidate must agree with
// the frames already accepted (mean dot >= minPairwise) so one garbage crop
// (turned head, hand over face) can't poison the enrollment average.
export async function captureEnrollment(videoEl, { n = 5, onProgress, minPairwise = 0.8, timeoutMs = 30000 } = {}) {
  const accepted = [];
  const started = performance.now();
  let lastAccept = 0;
  let rejects = 0; // consecutive pairwise disagreements
  while (accepted.length < n) {
    if (performance.now() - started > timeoutMs) throw new Error('enroll_timeout');
    if (performance.now() - lastAccept < 400) {
      await new Promise((r) => setTimeout(r, 120));
      continue;
    }
    const emb = await embedFrame(videoEl);
    if (emb) {
      const ok =
        accepted.length === 0 ||
        accepted.reduce((s, a) => s + dot(a, emb), 0) / accepted.length >= minPairwise;
      if (ok) {
        accepted.push(emb);
        rejects = 0;
        lastAccept = performance.now();
        onProgress?.(accepted.length);
        continue;
      }
      // The first frame is accepted unconditionally, so a garbage anchor
      // (mid-turn crop, AE still settling) would otherwise reject every
      // genuine frame until timeout. After several straight disagreements,
      // assume the OLDEST accepted frame is the outlier and drop it.
      rejects += 1;
      if (rejects >= 4 && accepted.length > 0) {
        accepted.shift();
        rejects = 0;
        onProgress?.(accepted.length);
      }
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return accepted.map(encodeB64);
}

// Dot product of two transport-format embeddings (both pre-normalized, so
// this is cosine similarity). Debug/sanity helper.
export function embeddingSimilarity(b64a, b64b) {
  return dot(decodeB64(b64a), decodeB64(b64b));
}
