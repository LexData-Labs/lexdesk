'use client';

import { useEffect, useState } from 'react';

// Shared avatar: shows an uploaded/remote image when present, otherwise the
// user's initials. Falls back to initials if the image fails to load (e.g. an
// expired signed URL), so a stale link never shows a broken-image icon.
export default function Avatar({ image, initials, className = '', alt = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [image]);
  const showImage = image && !failed;
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] flex items-center justify-center overflow-hidden ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
