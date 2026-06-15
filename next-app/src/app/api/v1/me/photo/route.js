import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { firebaseAdmin, FieldValue } from '@/lib/firebase';
import { Paths } from '@/lib/paths';
import { uploadUserPhoto, deleteUserPhoto, signedReadUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024;

// POST /api/v1/me/photo — multipart form field `file`.
export async function POST(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'no_file' }, { status: 400 });
    const contentType = file.type || '';
    if (!ALLOWED.has(contentType)) return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length <= 0 || bytes.length > MAX_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });

    const { storagePath } = await uploadUserPhoto(user.orgId, user.uid, bytes, contentType);
    const { db } = firebaseAdmin();
    await db.doc(Paths.user(user.orgId, user.uid)).update({
      photoStoragePath: storagePath,
      photoUpdatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, photoUrl: await signedReadUrl(storagePath) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

// DELETE /api/v1/me/photo — remove the stored photo.
export async function DELETE(request) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  try {
    await deleteUserPhoto(user.orgId, user.uid);
    const { db } = firebaseAdmin();
    await db.doc(Paths.user(user.orgId, user.uid)).update({
      photoStoragePath: FieldValue.delete(),
      photoUpdatedAt: FieldValue.delete(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
