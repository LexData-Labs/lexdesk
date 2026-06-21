'use client';

// Virtual joystick for touch devices. Writes thrust/turn/boost into a shared ref
// that the ship reads each frame (same channel as the keyboard), so phones fly
// the exact same way. Pushing the knob to the rim engages boost.

import { useEffect, useRef } from 'react';

const TRAVEL = 46; // max knob travel in px

export default function Joystick({ controlRef }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const activePid = useRef(null);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const reset = () => {
      activePid.current = null;
      if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
      const c = controlRef.current;
      c.thrust = 0;
      c.turn = 0;
      c.boost = false;
    };

    const apply = (e) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const mag = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(mag, TRAVEL);
      const kx = (dx / mag) * clamped;
      const ky = (dy / mag) * clamped;
      if (knobRef.current) knobRef.current.style.transform = `translate(${kx}px, ${ky}px)`;
      const c = controlRef.current;
      c.thrust = -(ky / TRAVEL); // push up → forward
      c.turn = -(kx / TRAVEL); //   push left → steer left (matches ArrowLeft)
      c.boost = clamped / TRAVEL > 0.85;
    };

    const onDown = (e) => {
      activePid.current = e.pointerId;
      base.setPointerCapture?.(e.pointerId);
      apply(e);
    };
    const onMove = (e) => { if (e.pointerId === activePid.current) apply(e); };
    const onUp = (e) => { if (e.pointerId === activePid.current) reset(); };

    base.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      base.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      reset();
    };
  }, [controlRef]);

  return (
    <div className="hub-joy" ref={baseRef}>
      <div className="hub-joy__ring" />
      <div className="hub-joy__knob" ref={knobRef} />
    </div>
  );
}
