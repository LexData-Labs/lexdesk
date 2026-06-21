'use client';

// Orchestrates the playable hub: owns selected (docked) + focused (in range) +
// warping state, feeds pointer parallax + a shared control channel (keyboard or
// touch joystick) + reads live ship state via refs (no per-frame re-renders),
// drives the radar, sounds, and warp, and lays the HUD with always-available
// exits. Dynamically imported with ssr:false by HomeExperience.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import HubScene from './HubScene';
import HubHud from './HubHud';
import Radar from './Radar';
import Compass from './Compass';
import Joystick from './Joystick';
import { audio } from './audio';
import { STATIONS_BY_ID } from './stations';

export default function HubExperience({ onExit, lowPerf = false }) {
  const [selected, setSelected] = useState(null);
  const [focused, setFocused] = useState(null);
  const [muted, setMuted] = useState(false);
  const [warping, setWarping] = useState(false);
  const [touch, setTouch] = useState(false);
  const [score, setScore] = useState(0);
  const pointer = useRef({ x: 0, y: 0 });
  const control = useRef({ thrust: 0, turn: 0, boost: false }); // keyboard + joystick
  const shipRef = useRef({ x: 0, z: 0, heading: 0, speed: 0, boost: false });
  const compassRef = useRef({ angle: 0, name: '', dist: 0, hidden: true });
  const prevSelected = useRef(null);

  useEffect(() => {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    setTouch(coarse || 'ontouchstart' in window);
  }, []);

  const onPointerMove = useCallback((e) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, []);

  // Unlock audio + start the ambient drone on the first gesture (browser policy).
  useEffect(() => {
    const unlock = () => {
      audio.init();
      audio.startAmbient();
      audio.engineStart();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      audio.stopAmbient();
      audio.engineStop();
    };
  }, []);

  const handleCollect = useCallback((n) => {
    setScore((s) => s + n);
    audio.collect();
  }, []);

  // Dock / undock chimes + a hyperspace warp on both arrival and departure.
  useEffect(() => {
    let t;
    if (selected && selected !== prevSelected.current) {
      audio.dock();
      setWarping(true);
      t = setTimeout(() => setWarping(false), 700);
    } else if (!selected && prevSelected.current) {
      audio.undock();
      setWarping(true);
      t = setTimeout(() => setWarping(false), 600);
    }
    prevSelected.current = selected;
    return () => { if (t) clearTimeout(t); };
  }, [selected]);

  // Soft blip when a node enters docking range.
  useEffect(() => {
    if (focused) audio.blip();
  }, [focused]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audio.init();
    audio.setMuted(m);
  };

  const focusedStation = focused ? STATIONS_BY_ID[focused] : null;

  return (
    <div className="hub-root" onPointerMove={onPointerMove}>
      <Canvas
        className="hub-canvas"
        dpr={lowPerf ? [1, 1.25] : [1, 1.75]}
        gl={{ antialias: !lowPerf, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 3.9, -18], fov: 50 }}
      >
        <Suspense fallback={null}>
          <HubScene
            selected={selected}
            focused={focused}
            warping={warping}
            lowPerf={lowPerf}
            onSelect={setSelected}
            onFocusChange={setFocused}
            onBoost={() => audio.boost()}
            onCollect={handleCollect}
            pointer={pointer}
            control={control}
            shipRef={shipRef}
            compassRef={compassRef}
          />
        </Suspense>
      </Canvas>

      {warping && <div className="hub-warp" aria-hidden="true" />}

      {score > 0 && (
        <div className="hub-score" aria-hidden="true">
          <span className="hub-score__icon">✦</span>
          {score}
        </div>
      )}

      <header className="hub-topbar">
        <button type="button" className="hub-brand" onClick={() => setSelected(null)}>
          <span className="hub-brand__mark">T</span>
          <span className="hub-brand__name">TeamOS</span>
        </button>
        <div className="hub-topbar__right">
          <button type="button" className="hub-icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
            )}
          </button>
          <button type="button" className="hub-ghost" onClick={onExit}>Classic view</button>
          <Link href="/register" className="btn-primary px-5 py-2 text-[0.85rem] no-underline">Sign in</Link>
        </div>
      </header>

      {/* Intro headline — fades away after a few seconds, leaving a clean stage. */}
      <div className="hub-intro">
        <h1 className="hub-intro__title">Where Teams Work Better Together.</h1>
        <p className="hub-intro__sub">
          {touch ? 'Pilot with the joystick — fly to a node and tap Dock.' : 'Pilot your ship — fly up to a node and dock to begin.'}
        </p>
      </div>

      {!selected && <Compass compassRef={compassRef} />}
      {!selected && !touch && <Radar shipRef={shipRef} focused={focused} />}

      {/* Desktop controls legend. */}
      {!selected && !touch && (
        <div className="hub-controls" aria-hidden="true">
          <span><kbd>↑</kbd> Thrust</span>
          <span><kbd>↓</kbd> Brake</span>
          <span><kbd>←</kbd><kbd>→</kbd> Steer</span>
          <span><kbd>Shift</kbd> Boost</span>
          <span><kbd>Enter</kbd> Dock</span>
        </div>
      )}

      {/* Touch controls. */}
      {!selected && touch && <Joystick controlRef={control} />}
      {!selected && touch && (
        <button
          type="button"
          className="hub-dock-btn"
          data-on={Boolean(focused)}
          onClick={() => { if (focused) setSelected(focused); }}
        >
          DOCK
        </button>
      )}

      {/* Docking prompt when a node is in range (desktop wording). */}
      {!selected && !touch && focusedStation && (
        <div className="hub-prompt" key={focusedStation.id}>
          <span className="hub-prompt__label">{focusedStation.label} · {focusedStation.sub}</span>
          <span className="hub-prompt__cta"><kbd>Enter</kbd> to dock — or click the node</span>
        </div>
      )}

      <HubHud selected={selected} onBack={() => setSelected(null)} />
    </div>
  );
}
