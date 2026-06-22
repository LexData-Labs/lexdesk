'use client';

// RoboAssistant — a friendly SVG bot for the sign-in screen. Its eyes follow the
// cursor and it reacts to the form via `formState`: it blinks naturally, glances
// down at the focused field, looks away shyly when the password is revealed,
// frowns + shakes on error, beams while submitting, and celebrates on success.
//
// Pure-client (window mousemove + timers), so it carries 'use client'. Decorative
// only — marked aria-hidden so screen readers ignore it. Keyframes live in
// globals.css under the `robo-*` namespace; this file owns the markup + behaviour.
//
// Ported from the reference AnimatedCharacters and recoloured from cyan to a
// white/silver glow to match LexDesk's monochrome theme (the visor is always dark,
// so bright eyes stay visible in both light and dark modes).

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * @param {Object} props
 * @param {Object} [props.formState]
 * @param {('email'|'password'|null)} [props.formState.focusedField]
 * @param {boolean} [props.formState.isPasswordVisible]
 * @param {boolean} [props.formState.isSubmitting]
 * @param {boolean} [props.formState.hasError]
 * @param {boolean} [props.formState.isSuccess]
 */
export default function RoboAssistant({ formState = {}, className = 'w-[196px] h-[224px] sm:w-[224px] sm:h-[256px]' }) {
  const {
    focusedField = null,
    isPasswordVisible = false,
    isSubmitting = false,
    hasError = false,
    isSuccess = false,
  } = formState;

  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track the cursor across the whole window and store a normalized (-1..1)
  // offset from the robot's center, so the eyes can lean toward the pointer.
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const relX = (e.clientX - centerX) / (window.innerWidth / 2);
    const relY = (e.clientY - centerY) / (window.innerHeight / 2);
    setMousePos({
      x: Math.max(-1, Math.min(1, relX)),
      y: Math.max(-1, Math.min(1, relY)),
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Natural blinking — a randomized recursive timeout reads more lifelike than a
  // fixed interval. Skipped while shy (eyes already squinted) to avoid a twitch.
  useEffect(() => {
    if (isPasswordVisible) return;
    let cancelled = false;
    let openTimer;
    let nextTimer;
    const scheduleBlink = () => {
      const delay = 2400 + Math.random() * 3800;
      nextTimer = setTimeout(() => {
        if (cancelled) return;
        setIsBlinking(true);
        openTimer = setTimeout(() => {
          if (!cancelled) setIsBlinking(false);
        }, 130);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => {
      cancelled = true;
      clearTimeout(nextTimer);
      clearTimeout(openTimer);
      setIsBlinking(false);
    };
  }, [isPasswordVisible]);

  // Where the eyes point. Shy = look away; otherwise follow the cursor, and bias
  // downward when a field is focused so the bot "reads along" with the form below.
  const getEyeOffset = () => {
    if (isPasswordVisible) return { x: -10, y: 4 };
    let x = mousePos.x * 8;
    let y = mousePos.y * 6;
    if (focusedField) {
      x *= 0.6;
      y = Math.max(y, 4.5);
    }
    return { x, y };
  };
  const eyeOffset = getEyeOffset();

  const getMood = () => {
    if (isSuccess) return 'success';
    if (hasError) return 'error';
    if (isSubmitting) return 'submitting';
    if (isPasswordVisible) return 'password-visible';
    if (focusedField) return 'focused';
    return 'idle';
  };
  const mood = getMood();

  // Mouth shape per mood — quadratic curves sized to sit inside the visor.
  const getSmilePath = () => {
    switch (mood) {
      case 'success':
        return 'M 80 106 Q 100 123 120 106'; // Beaming grin
      case 'error':
        return 'M 85 112 Q 100 106 115 112'; // Frown
      case 'password-visible':
        return 'M 88 110 Q 100 110 112 110'; // Flat / sheepish
      case 'submitting':
        return 'M 82 107 Q 100 118 118 107'; // Big happy smile
      case 'focused':
        return 'M 84 108 Q 100 115 116 108'; // Attentive soft smile
      default:
        return 'M 85 108 Q 100 116 115 108'; // Idle smile
    }
  };

  // Eye shape per mood, then a blink collapses them vertically.
  const getEyeScale = () => {
    if (isBlinking) return { scaleX: 1, scaleY: 0.1 };
    switch (mood) {
      case 'password-visible':
        return { scaleX: 1, scaleY: 0.3 }; // Squint
      case 'error':
        return { scaleX: 1, scaleY: 0.6 }; // Half-closed
      case 'success':
        return { scaleX: 1.1, scaleY: 1.15 }; // Wide & delighted
      case 'submitting':
        return { scaleX: 1.05, scaleY: 1.1 }; // Eager
      default:
        return { scaleX: 1, scaleY: 1 };
    }
  };
  const eyeScale = getEyeScale();

  const botAnimClass =
    mood === 'error'
      ? 'robo-shake'
      : mood === 'password-visible'
        ? 'robo-tilt-shy'
        : mood === 'success'
          ? 'robo-bounce'
          : 'robo-float';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`relative ${className} transition-opacity duration-700 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Soft glow halo behind the bot — makes it pop on the black backdrop. */}
      <div
        aria-hidden
        className="robo-halo pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[140%] h-[120%] rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 55%, transparent 72%)',
        }}
      />

      <svg viewBox="0 0 200 250" className={`relative w-full h-full ${botAnimClass}`}>
        <defs>
          <linearGradient id="robo-bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#f8f9fa" />
            <stop offset="70%" stopColor="#e9ecef" />
            <stop offset="100%" stopColor="#dee2e6" />
          </linearGradient>

          <linearGradient id="robo-bodyShadowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#f8f9fa" stopOpacity="0" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          <linearGradient id="robo-headGradient" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fafbfc" />
            <stop offset="60%" stopColor="#f1f3f5" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>

          <linearGradient id="robo-visorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="30%" stopColor="#334155" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="robo-visorInnerShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="20%" stopColor="#000000" stopOpacity="0" />
            <stop offset="80%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="robo-earGradientLeft" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8f9fa" />
            <stop offset="50%" stopColor="#e9ecef" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          <linearGradient id="robo-earGradientRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8f9fa" />
            <stop offset="50%" stopColor="#e9ecef" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          <linearGradient id="robo-armGradientLeft" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8f9fa" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          <linearGradient id="robo-armGradientRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8f9fa" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          {/* Glossy white eye orb */}
          <radialGradient id="robo-eyeOrb" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#eef2f6" />
            <stop offset="100%" stopColor="#c2cbd6" />
          </radialGradient>

          <filter id="robo-softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="robo-eyeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="robo-shadowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>

          <filter id="robo-dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.18" />
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.12" />
          </filter>

          <radialGradient id="robo-bodyHighlight" cx="25%" cy="15%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="robo-headHighlight" cx="30%" cy="20%" r="45%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="robo-headHighlight2" cx="70%" cy="80%" r="30%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="robo-antennaGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f8f9fa" />
            <stop offset="100%" stopColor="#d1d5db" />
          </radialGradient>

          <linearGradient id="robo-neckGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="100"
          cy="242"
          rx="50"
          ry="8"
          fill="rgba(0, 0, 0, 0.18)"
          filter="url(#robo-shadowFilter)"
          className="robo-shadow-pulse"
        />

        <g filter="url(#robo-dropShadow)">
          {/* Body */}
          <g className="robo-breathe">
            <ellipse cx="102" cy="192" rx="40" ry="48" fill="rgba(0,0,0,0.08)" />
            <ellipse cx="100" cy="190" rx="40" ry="48" fill="url(#robo-bodyGradient)" />
            <ellipse cx="100" cy="190" rx="40" ry="48" fill="url(#robo-bodyShadowGradient)" opacity="0.5" />
            <ellipse cx="85" cy="165" rx="22" ry="28" fill="url(#robo-bodyHighlight)" />
            <path d="M 68 200 Q 100 210 132 200" stroke="#d1d5db" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 75 215 Q 100 220 125 215" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeLinecap="round" />
            <ellipse cx="100" cy="200" rx="18" ry="22" fill="none" stroke="#e5e7eb" strokeWidth="1" />
            {/* Belly light — recoloured to a soft white core */}
            <ellipse
              cx="100"
              cy="208"
              rx="6"
              ry="4"
              fill="#e2e8f0"
              opacity="0.85"
              filter="url(#robo-softGlow)"
              className="robo-glow-pulse"
            />

            {/* Left arm */}
            <g transform="rotate(15, 58, 185)">
              <ellipse cx="54" cy="200" rx="10" ry="18" fill="rgba(0,0,0,0.05)" />
              <ellipse cx="52" cy="198" rx="10" ry="18" fill="url(#robo-armGradientLeft)" />
              <ellipse cx="48" cy="192" rx="4" ry="7" fill="url(#robo-bodyHighlight)" />
            </g>

            {/* Right arm */}
            <g transform="rotate(-15, 142, 185)">
              <ellipse cx="146" cy="200" rx="10" ry="18" fill="rgba(0,0,0,0.05)" />
              <ellipse cx="148" cy="198" rx="10" ry="18" fill="url(#robo-armGradientRight)" />
              <ellipse cx="152" cy="192" rx="4" ry="7" fill="url(#robo-bodyHighlight)" />
            </g>

            {/* Neck */}
            <rect x="90" y="138" width="20" height="16" rx="4" fill="url(#robo-neckGradient)" />
            <line x1="93" y1="142" x2="93" y2="150" stroke="#d1d5db" strokeWidth="0.5" />
            <line x1="107" y1="142" x2="107" y2="150" stroke="#d1d5db" strokeWidth="0.5" />
          </g>

          {/* Head */}
          <g>
            <rect x="54" y="48" width="94" height="100" rx="38" ry="38" fill="rgba(0,0,0,0.06)" />
            <rect x="52" y="45" width="96" height="100" rx="40" ry="40" fill="url(#robo-headGradient)" />
            <ellipse cx="80" cy="65" rx="30" ry="22" fill="url(#robo-headHighlight)" />
            <ellipse cx="115" cy="130" rx="20" ry="12" fill="url(#robo-headHighlight2)" />
            <path d="M 60 80 Q 52 95 60 125" stroke="rgba(255,255,255,0.4)" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Antenna with animated signal rings */}
            <ellipse cx="100" cy="48" rx="14" ry="10" fill="url(#robo-headGradient)" />
            <rect x="96" y="35" width="8" height="15" rx="4" fill="url(#robo-antennaGradient)" />
            <circle cx="100" cy="32" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" className="robo-ping" />
            <circle cx="100" cy="32" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" className="robo-ping robo-ping-delay" />
            <circle cx="100" cy="32" r="7" fill="url(#robo-antennaGradient)" />
            <circle cx="100" cy="32" r="3.5" fill="#ffffff" filter="url(#robo-softGlow)" className="robo-glow-pulse" />
            <circle cx="97" cy="29" r="2.2" fill="rgba(255,255,255,0.85)" />

            {/* Left ear */}
            <ellipse cx="50" cy="95" rx="13" ry="20" fill="rgba(0,0,0,0.05)" />
            <ellipse cx="48" cy="93" rx="13" ry="20" fill="url(#robo-earGradientLeft)" />
            <ellipse cx="44" cy="85" rx="5" ry="8" fill="rgba(255,255,255,0.5)" />
            <ellipse cx="48" cy="93" rx="6" ry="10" fill="none" stroke="#d1d5db" strokeWidth="1" />

            {/* Right ear */}
            <ellipse cx="152" cy="95" rx="13" ry="20" fill="rgba(0,0,0,0.05)" />
            <ellipse cx="152" cy="93" rx="13" ry="20" fill="url(#robo-earGradientRight)" />
            <ellipse cx="156" cy="85" rx="5" ry="8" fill="rgba(255,255,255,0.5)" />
            <ellipse cx="152" cy="93" rx="6" ry="10" fill="none" stroke="#d1d5db" strokeWidth="1" />

            {/* Visor */}
            <rect x="62" y="68" width="78" height="58" rx="22" ry="22" fill="rgba(0,0,0,0.1)" />
            <rect x="60" y="65" width="80" height="58" rx="24" ry="24" fill="url(#robo-visorGradient)" />
            <rect x="60" y="65" width="80" height="58" rx="24" ry="24" fill="url(#robo-visorInnerShadow)" />
            <path d="M 68 72 Q 95 66 125 74" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M 72 78 Q 85 75 95 78" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <rect x="60" y="65" width="80" height="58" rx="24" ry="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {/* Left eye */}
            <g
              filter="url(#robo-eyeGlow)"
              style={{ transition: 'transform 0.15s ease-out', transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)` }}
            >
              <ellipse
                cx="82"
                cy="88"
                rx="11"
                ry="9"
                fill="url(#robo-eyeOrb)"
                className="robo-eye-glow"
                style={{ transition: 'transform 0.12s ease-out', transform: `scale(${eyeScale.scaleX}, ${eyeScale.scaleY})`, transformOrigin: '82px 88px' }}
              />
              <ellipse
                cx="79"
                cy="85"
                rx="3.5"
                ry="2.6"
                fill="rgba(255,255,255,0.9)"
                style={{ transition: 'transform 0.12s ease-out', transform: `scale(${eyeScale.scaleX}, ${eyeScale.scaleY})`, transformOrigin: '82px 88px' }}
              />
            </g>

            {/* Right eye */}
            <g
              filter="url(#robo-eyeGlow)"
              style={{ transition: 'transform 0.15s ease-out', transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)` }}
            >
              <ellipse
                cx="118"
                cy="88"
                rx="11"
                ry="9"
                fill="url(#robo-eyeOrb)"
                className="robo-eye-glow"
                style={{ transition: 'transform 0.12s ease-out', transform: `scale(${eyeScale.scaleX}, ${eyeScale.scaleY})`, transformOrigin: '118px 88px' }}
              />
              <ellipse
                cx="115"
                cy="85"
                rx="3.5"
                ry="2.6"
                fill="rgba(255,255,255,0.9)"
                style={{ transition: 'transform 0.12s ease-out', transform: `scale(${eyeScale.scaleX}, ${eyeScale.scaleY})`, transformOrigin: '118px 88px' }}
              />
            </g>

            {/* Mouth */}
            <path
              d={getSmilePath()}
              stroke="#e2e8f0"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              filter="url(#robo-softGlow)"
              className="transition-all duration-300"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
