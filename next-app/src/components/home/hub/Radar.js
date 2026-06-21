'use client';

// A north-up minimap so you never get lost in the big world. It reads the ship's
// live position/heading from a ref and updates the SVG via its own rAF loop —
// completely decoupled from React renders, so it's free per-frame.

import { useEffect, useRef } from 'react';
import { STATIONS, WORLD_RADIUS } from './stations';

const SIZE = 116;
const C = SIZE / 2;
const R = C - 8;
const SCALE = R / WORLD_RADIUS;

export default function Radar({ shipRef, focused }) {
  const shipMark = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      const s = shipRef.current;
      const el = shipMark.current;
      if (el && s) {
        const x = C + s.x * SCALE;
        const y = C + s.z * SCALE;
        const deg = 180 - (s.heading * 180) / Math.PI;
        el.setAttribute('transform', `translate(${x} ${y}) rotate(${deg})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shipRef]);

  return (
    <div className="hub-radar" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={C} cy={C} r={R} className="hub-radar__ring" />
        <circle cx={C} cy={C} r={R * 0.6} className="hub-radar__ring" />
        <circle cx={C} cy={C} r={R * 0.3} className="hub-radar__ring" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} className="hub-radar__cross" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} className="hub-radar__cross" />
        {STATIONS.map((st) => {
          const x = C + st.pos[0] * SCALE;
          const y = C + st.pos[2] * SCALE;
          const on = focused === st.id;
          return <circle key={st.id} cx={x} cy={y} r={on ? 4 : 2.6} className={`hub-radar__node${on ? ' is-on' : ''}`} />;
        })}
        <g ref={shipMark}>
          <path d="M0,-5 L4,5 L0,2.5 L-4,5 Z" className="hub-radar__ship" />
        </g>
      </svg>
      <span className="hub-radar__label">RADAR</span>
    </div>
  );
}
