// Shared avatar: shows an uploaded image when present, otherwise the user's initials.
// Sizing / text styling is passed in via `className` so callers keep their existing look.
export default function Avatar({ image, initials, className = '', alt = '' }) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] flex items-center justify-center overflow-hidden ${className}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
