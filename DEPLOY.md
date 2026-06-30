# Deploying TeamOS

The deployable unit is **`next-app/`** (Next.js 16 web + API). The Android app is a
client that talks to whatever URL `next-app` is hosted at.

## Deploy the web/backend to Vercel (GitHub import)

1. **Push the code** to GitHub (Vercel builds from the repo, not your laptop).
   The production branch is `main`.

2. In the target Vercel account: **Add New… → Project → Import** the
   `Attendence-Pro` GitHub repo.

3. **Configure the project** before the first deploy:
   - **Root Directory: `next-app`**  ← critical; otherwise the build fails.
   - Framework Preset: **Next.js** (auto-detected).
   - Node.js Version: **24.x**.
   - Build/Output/Install: defaults.

4. **Environment Variables** — add every var from
   [`next-app/.env.local.example`](next-app/.env.local.example), copying the
   **values from your current `next-app/.env.local`**. Scope them to
   **Production** (and Preview if you use preview deploys). `NEXT_PUBLIC_*` are
   inlined at build time, so they must exist before you deploy.

   Must-not-get-wrong:
   - `LEXDESK_ORG_ID` — must equal the existing org id, or the site shows **no data**.
   - `QR_TOKEN_SECRET` — must match AttendDesk's value, or QR check-in breaks.
   - `FIREBASE_SERVICE_ACCOUNT` / `STORAGE_FIREBASE_SERVICE_ACCOUNT` — same Firebase
     project as today ⇒ same data; no migration.

5. **Deploy**, then **Project → Settings → Domains → Add** `teamos.lexdatalabs.com`.
   Because the `lexdatalabs.com` zone is already on this Vercel account, Vercel
   creates the DNS record + SSL automatically.

6. **Verify**:
   - `curl -o /dev/null -w '%{http_code}' https://teamos.lexdatalabs.com/api/v1/attendance` → **401** (route live, auth-gated).
   - Log in at `https://teamos.lexdatalabs.com` → you should see the existing
     employees/attendance (confirms `LEXDESK_ORG_ID` + service account are right).
   - If client-side Firebase Auth is ever used, add `teamos.lexdatalabs.com` under
     Firebase Console → Authentication → Settings → Authorized domains.

The old `lexdesk-dhaka.vercel.app` project can stay or be deleted — both are just
clients of the same Firebase project.

## Android app

The app's backend URL is baked in at build time in
[`android/app/build.gradle.kts`](android/app/build.gradle.kts) and now defaults to
`https://teamos.lexdatalabs.com`. Rebuild the APK after the domain is live:

```sh
cd android
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew :app:assembleDebug
```

Override per-build if needed (e.g. emulator against local dev):

```sh
./gradlew :app:assembleDebug -PattendDeskApiBase=http://10.0.2.2:3000/api/v1 -PadminWebUrl=http://10.0.2.2:3000
```
