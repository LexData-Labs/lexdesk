'use client';

import { useEffect, useRef, useState } from 'react';
import {
  initFace,
  openCamera,
  stopCamera,
  captureEmbedding,
  captureEnrollment,
} from '@/lib/faceClient';

const NO_FACE_TIMEOUT_MS = 15000;

// Webcam face capture for check-in verification (mode='verify': one frame,
// onDone({ b64 })) or one-time enrollment (mode='enroll': five frames, POSTs
// /api/me/enroll-face itself, onDone({ enrolledAt })). The heavy runtimes and
// the 23 MB model load lazily on first open and stay cached module-level, so
// reopening is instant. Load this component with next/dynamic({ ssr: false }).
export default function FaceCaptureModal({ mode, onDone, onClose }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('loading-model'); // loading-model | starting-camera | detecting | capturing | submitting
  const [progress, setProgress] = useState(0); // model download 0..1
  const [dots, setDots] = useState(0); // enroll frames accepted
  const [error, setError] = useState(null); // { text, retry }
  const [attempt, setAttempt] = useState(0); // bump to re-run the flow

  useEffect(() => {
    // Per-RUN cancellation flag, deliberately not a ref: a shared ref would be
    // flipped back to true by the next effect run (StrictMode re-mounts,
    // Retry), resurrecting this run's suspended awaits — leaking a camera
    // stream and double-firing onDone.
    let alive = true;
    let stream = null;

    const fail = (text, retry = true) => {
      if (alive) setError({ text, retry });
    };

    (async () => {
      setError(null);
      setDots(0);
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        fail('Camera needs a secure connection — open this page over https:// (or localhost).', false);
        return;
      }
      try {
        setPhase('loading-model');
        await initFace({
          onModelProgress: (received, total) => {
            if (alive) setProgress(Math.min(1, received / total));
          },
        });
      } catch (e) {
        fail(e?.message === 'big_endian_unsupported'
          ? 'This device is not supported.'
          : 'Could not load the face model. Check your connection and retry.');
        return;
      }
      if (!alive) return;

      try {
        setPhase('starting-camera');
        stream = await openCamera(videoRef.current);
        if (!alive) { stopCamera(stream); return; }
      } catch (e) {
        if (e?.name === 'NotAllowedError') {
          fail('Camera permission denied — allow camera access for this site, then retry.');
        } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
          fail('No camera found on this device.', false);
        } else {
          fail(`Camera error: ${e?.message || e}`);
        }
        return;
      }
      setPhase('detecting');

      try {
        if (mode === 'enroll') {
          const embeddings = await captureEnrollment(videoRef.current, {
            n: 5,
            timeoutMs: 30000,
            onProgress: (k) => {
              if (alive) { setDots(k); setPhase('capturing'); }
            },
          });
          if (!alive) return;
          setPhase('submitting');
          const token = localStorage.getItem('token');
          const res = await fetch('/api/me/enroll-face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ embeddings }),
          });
          const json = await res.json().catch(() => ({}));
          if (!alive) return;
          if (res.status === 409) {
            // Already enrolled (stale profile, or an earlier interrupted
            // submit that actually committed) — tell the parent the truth so
            // it shows Verify face instead of a dead-end "ask your admin".
            onDone?.({ enrolledAt: json?.upstream?.enrolledAt || new Date().toISOString() });
            return;
          }
          if (!res.ok) {
            fail(json.error || `Enrollment failed (HTTP ${res.status})`);
            return;
          }
          onDone?.({ enrolledAt: json.enrolledAt });
        } else {
          const started = performance.now();
          for (;;) {
            if (!alive) return;
            if (performance.now() - started > NO_FACE_TIMEOUT_MS) {
              fail("Couldn't find a face — improve lighting, remove glasses, and retry.");
              return;
            }
            const cap = await captureEmbedding(videoRef.current);
            if (!alive) return;
            if (cap) { onDone?.({ b64: cap.b64 }); return; }
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      } catch (e) {
        if (e?.message === 'enroll_timeout') {
          fail("Couldn't capture 5 steady frames — face the camera in good light and retry.");
        } else {
          fail(`Face capture error: ${e?.message || e}`);
        }
      }
    })();

    return () => {
      alive = false;
      stopCamera(stream);
    };
  }, [mode, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing mid-submit would commit the one-time enrollment upstream without
  // the UI ever learning about it — block close for those few seconds.
  const closable = phase !== 'submitting';
  const requestClose = () => { if (closable) onClose?.(); };

  const status =
    phase === 'loading-model' ? `Downloading face model — one time, ~23 MB (${Math.round(progress * 100)}%)`
    : phase === 'starting-camera' ? 'Starting camera…'
    : phase === 'capturing' ? `Captured ${dots} of 5 — move slightly between captures`
    : phase === 'submitting' ? 'Saving enrollment…'
    : mode === 'enroll' ? 'Center your face in the oval — capturing 5 frames'
    : 'Center your face in the oval';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={requestClose}>
      <div className="card w-full max-w-sm sm:max-w-md flex flex-col gap-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-lg text-[var(--color-text-main)]">
          {mode === 'enroll' ? 'Enroll your face' : 'Verify your face'}
        </h3>

        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-black">
          {/* Mirror the PREVIEW only — the captured pixels are never mirrored. */}
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          {phase === 'loading-model' && (
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-[var(--color-purple)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          )}
          {(phase === 'detecting' || phase === 'capturing') && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[78%] rounded-[50%] border-2 border-white/80"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            />
          )}
        </div>

        {mode === 'enroll' && (
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${i < dots ? 'bg-[var(--color-green)]' : 'bg-[var(--color-card-border)]'}`}
              />
            ))}
          </div>
        )}

        {error ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-red)]">{error.text}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-outline py-2 px-4 text-sm">Close</button>
              {error.retry && (
                <button onClick={() => setAttempt((a) => a + 1)} className="btn-primary py-2 px-4 text-sm">Retry</button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-text-muted)]">{status}</p>
            <button onClick={requestClose} disabled={!closable} className="btn-outline py-1.5 px-3 text-sm shrink-0 disabled:opacity-50">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
