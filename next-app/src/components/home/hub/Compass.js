'use client';

// Nearest-station compass. Reads a bearing written by CompassTracker (in the 3D
// loop) each frame via its own rAF, and rotates an arrow toward the nearest
// station — fading out when that station is already on screen.

import { useEffect, useRef } from 'react';

export default function Compass({ compassRef }) {
  const root = useRef(null);
  const arrow = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      const c = compassRef.current;
      const show = c && !c.hidden;
      if (root.current) root.current.style.opacity = show ? '1' : '0';
      if (show) {
        if (arrow.current) arrow.current.style.transform = `rotate(${(c.angle * 180) / Math.PI}deg)`;
        if (label.current) label.current.textContent = `${c.name} · ${c.dist}u`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [compassRef]);

  return (
    <div className="hub-compass" ref={root}>
      <div className="hub-compass__dial">
        <svg viewBox="0 0 24 24" ref={arrow} className="hub-compass__arrow"><path d="M12 3 L18 19 L12 15 L6 19 Z" /></svg>
      </div>
      <span className="hub-compass__label" ref={label} />
    </div>
  );
}
