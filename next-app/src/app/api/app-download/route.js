import { NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/config';
import { getAppDownloadUrl } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// GET /api/app-download — PUBLIC on purpose. The login screen and the marketing
// landing page both offer this link, and neither has a session; the value is a
// public release URL, so there is nothing here worth gating.
export async function GET() {
  try {
    const data = await getAppDownloadUrl(ORG_ID);
    return NextResponse.json(data, {
      // Short cache: an admin changing the link should see it take effect
      // quickly, but every anonymous landing-page hit need not touch the DB.
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch {
    // Never fail the page over this — fall back to the build-time value.
    return NextResponse.json({ appDownloadUrl: process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || null, source: 'env' });
  }
}
