import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { enrollFaceOverwrite } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

// POST /api/v1/me/enroll-face — { embeddings: [b64 x3-10] }. Mobile allows
// re-enroll (overwrite), unlike the web one-time path.
export async function POST(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const embeddings = body?.embeddings;
  const valid =
    Array.isArray(embeddings) &&
    embeddings.length >= 3 &&
    embeddings.length <= 10 &&
    embeddings.every((s) => typeof s === 'string' && s.length <= 700 && Buffer.from(s, 'base64').length === 512);
  if (!valid) {
    return NextResponse.json({ error: 'embeddings must be 3-10 base64 strings of 512-byte float32 data' }, { status: 400 });
  }

  try {
    const result = await enrollFaceOverwrite(user.uid, embeddings, user.orgId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
