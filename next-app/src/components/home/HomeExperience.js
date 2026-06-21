'use client';

// Progressive-enhancement gate for the homepage. Server + first client render
// show the real, crawlable landing (HomeFallback). On WebGL-capable devices we
// swap in the 3D playable hub — desktops with keyboard, phones with a touch
// joystick. Reduced-motion / no-WebGL visitors keep the lightweight landing.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HomeFallback from './HomeFallback';

const HubExperience = dynamic(() => import('./hub/HubExperience'), {
  ssr: false,
  loading: () => (
    <div className="hub-boot">
      <span className="hub-boot__ring" />
      <span className="hub-boot__text">Entering TeamOS…</span>
    </div>
  ),
});

function canRun3D() {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia;
  if (mm && mm('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// Trim the scene on phones / low-core machines so it stays smooth.
function isLowPerf() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const fewCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  return !!(coarse || fewCores || window.innerWidth < 820);
}

export default function HomeExperience() {
  const [mode, setMode] = useState('fallback'); // 'fallback' | 'hub'
  const [capable, setCapable] = useState(false);
  const [lowPerf, setLowPerf] = useState(false);

  useEffect(() => {
    if (canRun3D()) {
      setCapable(true);
      setLowPerf(isLowPerf());
      setMode('hub');
    }
  }, []);

  if (mode === 'hub') return <HubExperience lowPerf={lowPerf} onExit={() => setMode('fallback')} />;
  return <HomeFallback onEnterHub={capable ? () => setMode('hub') : undefined} />;
}
