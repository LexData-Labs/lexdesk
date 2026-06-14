import { getStorage } from 'firebase-admin/storage';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { firebaseAdmin } from './firebase';

// Profile photos live in a Firebase Storage bucket that may belong to a
// DIFFERENT project than Firestore/Auth — e.g. reuse the AttendDesk bucket so
// this project doesn't need Storage (Blaze/billing) enabled. If
// STORAGE_FIREBASE_SERVICE_ACCOUNT is set, photo ops use a dedicated admin app
// with that bucket-owner credential; otherwise they fall back to the main app
// (single-project setup). Path layout: users/{orgId}/{uid}/photo.jpg.

function photoObjectPath(orgId, uid) {
  return `users/${orgId}/${uid}/photo.jpg`;
}

function decodeServiceAccount(raw) {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf-8');
  const parsed = JSON.parse(json);
  return {
    projectId: parsed.project_id ?? parsed.projectId,
    clientEmail: parsed.client_email ?? parsed.clientEmail,
    privateKey: (parsed.private_key ?? parsed.privateKey ?? '').replace(/\\n/g, '\n'),
  };
}

let _storageApp;
// The Firebase app used for Storage. Uses STORAGE_FIREBASE_SERVICE_ACCOUNT (the
// bucket owner) if set, else the main app.
function storageApp() {
  const raw = process.env.STORAGE_FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return firebaseAdmin().app;
  if (_storageApp) return _storageApp;
  const existing = getApps().find((a) => a.name === 'storage');
  _storageApp =
    existing ??
    (() => {
      const sa = decodeServiceAccount(raw);
      return initializeApp(
        { credential: cert({ projectId: sa.projectId, clientEmail: sa.clientEmail, privateKey: sa.privateKey }), projectId: sa.projectId },
        'storage',
      );
    })();
  return _storageApp;
}

function bucket() {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!name) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set');
  return getStorage(storageApp()).bucket(name);
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
