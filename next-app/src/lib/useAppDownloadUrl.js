'use client';

import { useEffect, useState } from 'react';

// The build-time value renders immediately so the link is never missing on
// first paint; the stored setting then replaces it if an admin has set one.
const ENV_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || null;

/**
 * Download link for the Android app. Used by public pages (login, landing),
 * so it reads the unauthenticated /api/app-download endpoint.
 */
export function useAppDownloadUrl() {
  const [url, setUrl] = useState(ENV_URL);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/app-download', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.appDownloadUrl) setUrl(d.appDownloadUrl); })
      .catch(() => { /* keep the env fallback */ });
    return () => { cancelled = true; };
  }, []);

  return url;
}
