import { getStorage } from 'firebase-admin/storage';
import { firebaseAdmin } from './firebase';

// Profile photos in Firebase Storage — same bucket + path layout as AttendDesk
// (users/{orgId}/{uid}/photo.jpg) so existing photos resolve unchanged.

function photoObjectPath(orgId, uid) {
  return `users/${orgId}/${uid}/photo.jpg`;
}

function bucket() {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!name) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set');
  const { app } = firebaseAdmin();
  return getStorage(app).bucket(name);
}

export async function uploadUserPhoto(orgId, uid, bytes, contentType) {
  const storagePath = photoObjectPath(orgId, uid);
  await bucket().file(storagePath).save(bytes, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=3600', contentType },
  });
  return { storagePath };
}

export async function deleteUserPhoto(orgId, uid) {
  await bucket().file(photoObjectPath(orgId, uid)).delete({ ignoreNotFound: true });
}

// Short-lived signed read URL; returns null on failure so callers degrade
// gracefully instead of 500-ing.
export async function signedReadUrl(storagePath, ttlSeconds = 3600) {
  if (!storagePath) return null;
  try {
    const [url] = await bucket()
      .file(storagePath)
      .getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + ttlSeconds * 1000 });
    return url;
  } catch (err) {
    console.warn('[storage] failed to sign URL for', storagePath, err);
    return null;
  }
}

export async function signedReadUrls(paths, ttlSeconds = 3600) {
  return Promise.all(paths.map((p) => signedReadUrl(p, ttlSeconds)));
}
