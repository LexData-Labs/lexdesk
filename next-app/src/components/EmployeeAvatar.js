'use client';

import { useEffect, useState } from 'react';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]).join('').toUpperCase();
}

export default function EmployeeAvatar({ id, name, size = 36 }) {
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (!id || typeof window === 'undefined') return;
    setAvatar(localStorage.getItem('avatar-' + id));
  }, [id]);

  if (avatar) {
    return (
      <div
        className="rounded-full bg-cover bg-center shrink-0"
        style={{ width: size, height: size, backgroundImage: `url(${avatar})` }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] flex items-center justify-center font-semibold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
