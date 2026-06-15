# Attendance Pro (LexDesk)

A Firebase-backed employee attendance platform with a **Next.js web dashboard** and a **native Android app**. Both clients share one Firebase project (Firestore + Auth) scoped to a single organization. The platform does anti-cheat attendance check-in (GPS geofence, WiFi, face recognition, QR), leave & asset request workflows with approvals, teams with team-lead approvals, analytics, and org administration.

## Repository layout

| Path | What it is |
| --- | --- |
| [`next-app/`](next-app) | The web dashboard **and** all server APIs (Next.js 16 App Router). Includes the mobile `/api/v1` endpoints the Android app talks to. See [`next-app/README.md`](next-app/README.md). |
| [`android/`](android) | The native Android app (Kotlin + Jetpack Compose). See [`android/README.md`](android/README.md). |

The legacy `backend/` (Express) and `frontend/` (vanilla JS) directories have been removed.

## Features

- **Attendance check-in/out with anti-cheat** — every check-in runs a server-side pipeline: GPS geofence, WiFi (allowed SSID/BSSID), face recognition, and a rotating QR token, plus late/early policy enforcement.
- **Leave & asset requests** — employees submit; team leads and admins approve/reject with audited decisions.
- **Teams & team leads** — an employee who leads a team can view that team's attendance and approve its leave.
- **Employee directory** — list/grid with search and pagination, per-employee profiles, daily timelines, and profile photos.
- **Analytics & calendar** — late/absent trends, monthly summaries, and a per-employee monthly calendar.
- **Holidays** — managed holiday calendar.
- **Organization provisioning** — a system admin sets the org name and creates the first org admin with a temporary password.
- **Web + mobile clients** — a browser dashboard and an Android app, both backed by the same Firestore data.
- **Face recognition** — MediaPipe face detection + an ONNX embedding model, served from `next-app/public/models`.

## Architecture

- **Framework:** Next.js `16.2.6` (App Router, JavaScript — no TypeScript).
- **Data:** Firebase **Firestore + Auth**. The app is **single-org**: every Firestore path is pinned to `LEXDESK_ORG_ID`.
- **Storage:** Firebase Storage for profile photos. Photos may live in a different Firebase project's bucket via `STORAGE_FIREBASE_SERVICE_ACCOUNT` (falls back to the main service account).
- **Two auth models:**
  - **Web** — password is verified against Firebase Auth (Identity Toolkit REST), then the server mints its own **LexDesk JWT** session.
  - **Mobile** — the Android app sends a **Firebase ID token** as `Authorization: Bearer <token>` to `/api/v1`.
- **Deployment:** Vercel serverless. `firebase-admin` is externalized from the bundle (see [Deploying](#deploying-to-vercel)).

## Roles

| Role | Source | Can do |
| --- | --- | --- |
| `superadmin` (system admin) | `LEXDESK_SYSADMIN_*` env vars, or a seeded super admin | Provision the org, create/reset the org admin, everything below. |
| `admin` (org admin) | Firestore user doc | Manage employees, teams, holidays, and approve all leave/asset requests org-wide. |
| `employee` | Firestore user doc | Check in/out, submit leave/asset requests, edit own profile. A **team lead** (employee who leads a team) additionally approves their team's requests. |
| `lexsysadmin` | Platform-level | Platform admin with no org profile. |

## Quick start (local)

Prerequisites: **Node.js 20+** (Node 24 LTS recommended).

```bash
cd next-app
cp .env.local.example .env.local   # then fill in the values (see below)
npm install
npm run dev
```

Open <http://localhost:3000>.

> The current `.env.local.example` is minimal — use the [Environment variables](#environment-variables) table below as the source of truth for what to set.

## Environment variables

Set these in `next-app/.env.local` for local dev, and in **Vercel → Project Settings → Environment Variables** for production.

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | ✅ | Long random string for signing the LexDesk web session JWT. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ | Service account for the main Firebase project (Firestore + Auth admin SDK). Base64-encoded or raw JSON. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Web API key. Used for email/password login via the Identity Toolkit REST endpoint. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Storage bucket name for profile photos. |
| `QR_TOKEN_SECRET` | ✅ | Secret for signing/validating rotating QR check-in tokens. Must match the clients. |
| `JWT_EXPIRES` | — | Web token lifetime. Default `8h`. |
| `LEXDESK_ORG_ID` | — | The org id every Firestore path is pinned to. Default `default`; set it from the live data with `scripts/probe-org.mjs`. |
| `QR_TOKEN_WINDOW_SECONDS` | — | QR token validity window in seconds. Default `30`. |
| `LEXDESK_SYSADMIN_EMAIL` / `LEXDESK_SYSADMIN_PASSWORD` | — | Enables env-based **system admin** login (mints a `superadmin` session; constant-time password compare). Inert unless both are set. |
| `STORAGE_FIREBASE_SERVICE_ACCOUNT` | — | Service account for the photo bucket if it lives in a **different** Firebase project. Falls back to `FIREBASE_SERVICE_ACCOUNT`. |
| `LEXDESK_LOCATION_MODE` | — | Mobile location tracking: `manual` (default), `periodic`, or `continuous`. |
| `LEXDESK_LOCATION_PERIODIC_MIN` | — | Minutes between pings in periodic mode. Default `15`. |
| `LEXDESK_LOCATION_CONTINUOUS_SEC` | — | Seconds between pings in continuous mode. Default `60`. |
| `NEXT_PUBLIC_APP_DOWNLOAD_URL` | — | Android app download link shown on the login page and sidebar. |

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** → select the repo.
3. Set **Root Directory** to `next-app`.
4. Add the [environment variables](#environment-variables) above under **Settings → Environment Variables**.
5. Deploy. Vercel auto-detects Next.js — **no `vercel.json` is needed**.

**`firebase-admin` is pinned to v12** in [`next-app/package.json`](next-app/package.json). v14 pulls the ESM-only `jose` v5, which throws `ERR_REQUIRE_ESM` on Vercel's serverless runtime (it works in `next dev` but 500s in production). It is also externalized from the bundle via `serverExternalPackages: ['firebase-admin']` in [`next-app/next.config.mjs`](next-app/next.config.mjs).

## Web routes

All `/dashboard/*` routes require a signed-in session; the navigation and access are role-gated.

| Route | Role | Purpose |
| --- | --- | --- |
| `/` | public | Login (email + password) |
| `/dashboard` | any | KPI overview + recent activity + leave summary |
| `/dashboard/my-dashboard` | employee | Today's check-ins and personal KPIs |
| `/dashboard/my-leave` | employee | Submit and track own leave requests |
| `/dashboard/my-assets` | employee | Submit and track own asset requests |
| `/dashboard/team-attendance` | team lead | Their team's attendance |
| `/dashboard/team-approvals` | team lead | Approve their team's leave requests |
| `/dashboard/employees` | admin | Directory (list/grid, search, pagination) |
| `/dashboard/employees/[id]` | admin | Employee profile + per-day timeline |
| `/dashboard/attendance` | admin | Full attendance table with filters and CSV export |
| `/dashboard/analytics` | admin | Late/absent trends and monthly summaries |
| `/dashboard/calendar` | admin | Per-employee monthly calendar |
| `/dashboard/leave-approvals` | admin | Approve/reject all leave requests |
| `/dashboard/asset-approvals` | admin | Approve/reject all asset requests |
| `/dashboard/holidays` | admin | Manage holidays |
| `/dashboard/teams` | admin | Create/update teams, assign leaders and members |
| `/dashboard/organization` | superadmin | Set org name, create the org admin |
| `/dashboard/profile` | any | Edit own profile and upload a photo |
| `/dashboard/attenddesk` | admin | Sync office/policy settings |

## Mobile API (`/api/v1`)

The Android app authenticates with a **Firebase ID token** sent as `Authorization: Bearer <id-token>`. The server verifies it and resolves the role from custom claims (with Firestore fallbacks). All endpoints are single-org.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/me` | Current user profile + face-enrollment status + signed photo URL |
| GET | `/api/v1/me/policy` | Org policy, office config, features, face-model metadata |
| GET | `/api/v1/me/history` | Recent attendance events |
| POST | `/api/v1/me/check-in` | Check in/out (runs the full anti-cheat pipeline) |
| POST | `/api/v1/me/enroll-face` | Enroll a face embedding |
| POST / DELETE | `/api/v1/me/photo` | Upload / delete profile photo |
| DELETE | `/api/v1/me/data` | Clear stored face embeddings |
| POST | `/api/v1/me/location-ping` | Record a background location ping (audit only) |
| GET / POST | `/api/v1/me/leave-requests` | List / submit leave requests |
| GET / POST | `/api/v1/me/leave-requests/[id]` | Fetch / approve / reject a leave request |
| POST | `/api/v1/auth/set-password` | Change password (and revoke existing tokens) |

Source: [`next-app/src/app/api/v1/`](next-app/src/app/api/v1). Auth helper: [`next-app/src/lib/mobileAuth.js`](next-app/src/lib/mobileAuth.js).

## Admin & seed scripts

Run from `next-app/` with `.env.local` populated (they connect to the live Firebase project):

| Script | Purpose |
| --- | --- |
| [`scripts/probe-org.mjs`](next-app/scripts/probe-org.mjs) | List existing organizations in Firestore — use it to find the value for `LEXDESK_ORG_ID`. |
| [`scripts/seed.mjs`](next-app/scripts/seed.mjs) | Seed an initial organization and admin user. |
| [`scripts/seed-superadmin.mjs`](next-app/scripts/seed-superadmin.mjs) | Create/update the system (super) admin account (idempotent). |

## Android app

The native client lives in [`android/`](android) (Kotlin + Jetpack Compose, Firebase Auth). It talks to the web app's `/api/v1` endpoints and needs a `google-services.json` for the same Firebase project as the web dashboard. See [`android/README.md`](android/README.md) for setup, the wired-feature matrix, and troubleshooting.
