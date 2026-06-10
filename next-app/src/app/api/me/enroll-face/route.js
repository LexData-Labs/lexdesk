import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { enrollFace } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// Self-enrollment of the logged-in user's face. The uid comes ONLY from the
// VERIFIED token, so nobody can enroll a face onto someone else's account.
// Enrollment is one-time upstream — a 409 already_enrolled passes through so
// the UI can tell the user to ask their admin for a reset.

// A 128-dim float32 embedding is 512 bytes = exactly 684 base64 chars.
const EMBEDDING_BYTES = 512;
const MAX_B64_CHARS = 700;

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id || !user.orgId) {
    return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const embeddings = body?.embeddings;
  const valid =
    Array.isArray(embeddings) &&
    embeddings.length >= 3 &&
    embeddings.length <= 10 &&
    embeddings.every(
      (s) =>
        typeof s === 'string' &&
        s.length <= MAX_B64_CHARS &&
        Buffer.from(s, 'base64').length === EMBEDDING_BYTES,
    );
  if (!valid) {
    return NextResponse.json(
      { error: 'embeddings must be 3-10 base64 strings of 512-byte float32 data' },
      { status: 400 },
    );
  }

  try {
    const result = await enrollFace(String(user.id), embeddings, user.orgId);
    return NextResponse.json(result);
  } catch (err) {
    // 409 already_enrolled and 403 feature_disabled flow through with status.
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
