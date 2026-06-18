// Shared decorative bits for the auth screens (login + signup), so the two
// pages stay visually in sync: brand-glow + dot-grid backdrop and the glassy
// feature chips. Pure presentational — safe to import into client pages.

// Absolute backdrop: purple/blue radial glows + a faint dot-grid texture.
// Drop inside a `relative overflow-hidden` container, behind the content.
export function AuthDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_20%,rgba(150,150,150,0.28),transparent_60%),radial-gradient(50%_40%_at_80%_90%,rgba(90,90,90,0.32),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:18px_18px]"
      />
    </>
  );
}

export function FeatureChip({ icon, label }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text-main)] backdrop-blur">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-[var(--color-purple)] shrink-0">{icon}</span>
      {label}
    </li>
  );
}

const svgProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function SyncIcon() {
  return (
    <svg {...svgProps}><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
  );
}
export function ChartIcon() {
  return (
    <svg {...svgProps}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
  );
}
export function ShieldIcon() {
  return (
    <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
}
export function UsersIcon() {
  return (
    <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  );
}
