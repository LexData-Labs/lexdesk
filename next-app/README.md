# Attendance Pro — web app

The Next.js web dashboard **and** all server APIs for Attendance Pro (including the mobile `/api/v1` endpoints the Android app calls). For the product overview, role model, full environment-variable reference, and deployment notes, see the [root README](../README.md).

> **Heads-up — this is Next.js 16.** It has breaking changes versus earlier versions. Consult the bundled guides in `node_modules/next/dist/docs/` before writing code, and heed deprecation notices. See [`AGENTS.md`](AGENTS.md).

## Tech

Next.js `16.2.6` (App Router) · React `19.2.4` · Tailwind CSS `4` · `firebase-admin` **v12** (Firestore + Auth) · plain JavaScript (no TypeScript). Face recognition uses `@mediapipe/tasks-vision` + `onnxruntime-web` with models served from `public/models`.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the dev server on <http://localhost:3000> |
| `npm run build` | Production build |
| `npm start` | Run the production build locally |
| `npm run lint` | ESLint |

## Project structure

```text
src/
  app/                 # App Router: pages + API routes
    dashboard/         # Role-gated dashboard pages
    api/               # Web API routes (auth, employees, teams, admin, me, …)
    api/v1/            # Mobile API (Firebase ID-token auth)
    page.js            # Login page
  components/          # Reusable UI (SidebarNav, CheckInCard, FaceCaptureModal, …)
  lib/
    firebase.js        # firebase-admin init (Firestore + Auth), service-account decode
    auth.js            # LexDesk JWT sign/verify + Firebase password verification
    mobileAuth.js      # Firebase ID-token verification + role resolution
    config.js          # ORG_ID pin + QR token config
    paths.js           # Firestore path builders (all scoped to ORG_ID)
    storage.js         # Firebase Storage photo upload/download (optional 2nd project)
    services/          # Firestore operations (users, attendance, leave, teams, …)
public/models/         # Face detection + ONNX embedding models (cached 1y immutable)
scripts/               # One-off admin/seed scripts (see below)
```

## Local development

1. `cp .env.local.example .env.local` and fill it in. The example is minimal — use the [environment-variable table in the root README](../README.md#environment-variables) as the source of truth. At minimum you need `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, and `QR_TOKEN_SECRET`.
2. `npm install`
3. `npm run dev`

**Testing from a LAN device** (e.g. a phone hitting the dev server): add its host/IP to `allowedDevOrigins` in [`next.config.mjs`](next.config.mjs) so it can load `/_next` resources. Production builds ignore that setting.

## Admin & seed scripts

Run from this directory with `.env.local` populated (they connect to the live Firebase project):

| Script | Purpose |
| --- | --- |
| [`scripts/probe-org.mjs`](scripts/probe-org.mjs) | List Firestore organizations — use it to find the value for `LEXDESK_ORG_ID`. |
| [`scripts/seed.mjs`](scripts/seed.mjs) | Seed an initial organization and admin user. |
| [`scripts/seed-superadmin.mjs`](scripts/seed-superadmin.mjs) | Create/update the system (super) admin account (idempotent). |

## Conventions

- **Single-org.** Every Firestore path is pinned to `LEXDESK_ORG_ID` (default `default`) via [`lib/config.js`](src/lib/config.js); build paths with [`lib/paths.js`](src/lib/paths.js) rather than hard-coding them.
- **`firebase-admin` is v12-pinned and externalized.** Do not upgrade to v14+ (ESM-only `jose` v5 crashes the Vercel runtime), and keep it in `serverExternalPackages` in [`next.config.mjs`](next.config.mjs). See the root README's deployment section.
- **Two auth models.** Web uses a LexDesk JWT minted after verifying the password against Firebase Auth; mobile (`/api/v1`) uses Firebase ID tokens. See [`lib/auth.js`](src/lib/auth.js) and [`lib/mobileAuth.js`](src/lib/mobileAuth.js).
