# AttendDesk Android

Native Android app (Kotlin + Jetpack Compose, min SDK 26, target SDK 34). Authentication is **Firebase Auth**; data flows through the Next.js API at `/api/v1/...`.

## First-time setup

1. **Open in Android Studio** (Hedgehog or newer) and let it sync. Alternatively from the `android/` directory:

   ```bash
   gradle wrapper --gradle-version 8.7
   ```

2. **Add Firebase Android config.** Drop the `google-services.json` you generated when adding the Android app in the Firebase console:

   ```text
   android/app/google-services.json
   ```

   Without this file the `com.google.gms.google-services` plugin fails. The file is not committed.

3. **Add the face recognition model.** Drop a 112×112-input, 192-D-output MobileFaceNet TFLite file at:

   ```text
   android/app/src/main/assets/mobilefacenet.tflite
   ```

   The face enrollment screen displays a clear "model missing" message until this is added.

4. **Point the app at your backend.** Defaults are tuned for the emulator pointing at a local Next.js dev server:

   - `API_BASE` = `http://10.0.2.2:3000/api/v1`
   - `ADMIN_WEB_URL` = `https://attenddesk.vercel.app` (used by the admin-only banner on the Home screen)

   Override at build time:

   ```bash
   ./gradlew assembleDebug \
     -PattendDeskApiBase="https://attenddesk.vercel.app/api/v1" \
     -PadminWebUrl="https://attenddesk.vercel.app"
   ```

## What's wired

| Feature | Status |
| --- | --- |
| Firebase Auth sign-in (email/password) | ✅ |
| Set-password (post-temp-password flow) | ✅ |
| Permissions flow (location, camera, nearby-wifi on Android 13+) | ✅ |
| Ambient checks: WiFi (SSID/BSSID + ARP gateway-MAC fallback), GPS (with mock-location detection) | ✅ |
| QR scan (ML Kit barcode scanner) + manual-entry fallback | ✅ |
| Face enrollment (CameraX + ML Kit face detection + MobileFaceNet TFLite embedding) | ✅ *(model file required)* |
| Check-in submit (sends bundled checks to the server, server enforces policy) | ✅ |
| History view (events grouped by day) | ✅ |
| Admin banner on Home (when signed-in user has role ADMIN) | ✅ |
| Face verification at check-in time | ⚠️ Stub — `HomeScreen` doesn't trigger a face capture before submitting. Plug `FaceEmbedder` + ML Kit liveness into the check-in flow. |
| Certificate pinning | ⚠️ Future hardening — add `OkHttpClient.Builder().certificatePinner(...)` in `ApiClient.kt` for production builds. |

## Why the unusual permission setup

- `ACCESS_FINE_LOCATION` is **mandatory** to read the WiFi SSID on Android 8.1+. The app uses it for both the geofence and the WiFi anti-cheat check.
- `NEARBY_WIFI_DEVICES` is required on Android 13+ for current-network info APIs. We intentionally do **not** set `usesPermissionFlags="neverForLocation"` because we correlate WiFi with location.

## Auth model

Firebase Auth owns the tokens. The Retrofit interceptor in [`ApiClient.kt`](app/src/main/java/com/attenddesk/data/api/ApiClient.kt) calls `FirebaseAuth.currentUser?.getIdToken(false)` per request and attaches it as `Authorization: Bearer <id-token>`. The SDK auto-refreshes expired tokens.

[`ProfileStore`](app/src/main/java/com/attenddesk/data/ProfileStore.kt) keeps a small DataStore-backed cache of the signed-in email + role for UI display — no auth secrets there.

## Troubleshooting

- **`<unknown ssid>` shown for the WiFi check.** The user denied or revoked Location, or device location services are off. The app falls back to the gateway MAC (`/proc/net/arp`) automatically — make sure the office gateway MAC is in the admin's BSSID allowlist.
- **GPS check fails with `mock_location`.** A mock-location app is installed and enabled. This is the anti-cheat working as designed.
- **Build fails on first sync.** Ensure JDK 17 is selected (Project Structure → SDK Location → Gradle JDK).
- **Build fails at `processDebugGoogleServices`.** You haven't added `app/google-services.json` yet (see step 2 above).
