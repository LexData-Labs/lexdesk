import { sql } from '../db';

// Org-level app settings. Today just the Android download link, kept in the org
// row rather than `policy` (which is the anti-cheat ruleset) because it is
// presentation, not a check.

const URL_RE = /^https:\/\/[^\s<>"]+$/i;

/**
 * The link the public pages offer as "Download the app". Falls back to
 * NEXT_PUBLIC_APP_DOWNLOAD_URL so nothing changes until an admin sets one.
 */
export async function getAppDownloadUrl(orgId) {
  let stored = null;
  try {
    const rows = await sql`SELECT app_download_url FROM org WHERE id = ${orgId}`;
    stored = rows[0]?.app_download_url ?? null;
  } catch {
    // A missing column or an unreachable database must not break the public
    // landing page — fall through to the env var.
  }
  const url = String(stored || '').trim() || process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || null;
  return { appDownloadUrl: url, source: stored ? 'settings' : (url ? 'env' : 'unset') };
}

/** Admin write. Pass '' or null to clear and fall back to the env var again. */
export async function setAppDownloadUrl(orgId, value) {
  const next = String(value ?? '').trim() || null;
  // https only: the link is handed to people to install an APK from, and the
  // browser blocks a mixed-content download from an https page anyway.
  if (next && !URL_RE.test(next)) {
    throw Object.assign(new Error('Enter a full https:// link to the APK.'), { status: 400, code: 'invalid_url' });
  }
  const rows = await sql`
    UPDATE org SET app_download_url = ${next}, updated_at = now()
    WHERE id = ${orgId} RETURNING id
  `;
  if (!rows.length) throw Object.assign(new Error('org_not_found'), { status: 404 });
  return { ok: true, appDownloadUrl: next };
}
