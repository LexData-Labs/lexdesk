// TeamOS logo mark — a hexagon outline enclosing a bold "T" monogram. Drawn
// with `currentColor` and tinted to --color-text-main, so it follows the theme:
// white in dark mode, near-black in light mode. Vector → crisp at any size.
export default function BrandMark({ size = 44, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={`text-[var(--color-text-main)] ${className}`}
      role="img"
      aria-label="TeamOS logo"
    >
      {/* Hexagon frame (flat top/bottom) */}
      <path
        d="M34.5 5.8 L45 24 L34.5 42.2 L13.5 42.2 L3 24 L13.5 5.8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Bold T monogram */}
      <path d="M13.5 13.5 H34.5 V20 H27 V35 H21 V20 H13.5 Z" fill="currentColor" />
    </svg>
  );
}
