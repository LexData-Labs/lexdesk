import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { firebaseAdmin } from '@/lib/firebase';
import { Paths } from '@/lib/paths';

export const dynamic = 'force-dynamic';

// DELETE /api/v1/me/data — clear the caller's face enrollment (GDPR-style).
export async function DELETE(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  try {
    const { db } = firebaseAdmin();
    await db.doc(Paths.user(user.orgId, user.uid)).update({
      faceEmbeddingB64: null,
      faceEmbeddingModel: null,
      faceEnrolledAt: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
