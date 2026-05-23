# Attendance Pro

A single-app Next.js dashboard for employee attendance, sourced from Google Sheets and deployable to Vercel.

The project lives in [`next-app/`](next-app). The legacy `backend/` (Express) and `frontend/` (vanilla JS SPA) directories have been replaced.

## Quick start (local)

```bash
cd next-app
cp .env.local.example .env.local   # fill in the values
npm install
npm run dev
```

Open <http://localhost:3000>.

## Required environment variables

Set these in `.env.local` for local development and in **Vercel Project Settings → Environment Variables** for production.

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | yes | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_API_KEY` | yes | Google Sheets API key (read-only). Restrict it to Sheets API in Google Cloud Console. |
| `GOOGLE_SHEET_ID` | yes | The spreadsheet ID (from the sheet URL between `/d/` and `/edit`). The sheet must be shared "Anyone with the link can view". |
| `JWT_EXPIRES` | no | Token lifetime, default `8h`. |

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** → select this repo.
3. Set **Root Directory** to `next-app`.
4. Add the environment variables above in **Settings → Environment Variables**.
5. Deploy.

Vercel auto-detects Next.js — no `vercel.json` needed.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@example.com` | `admin123` |
| Admin | `admin@example.com` | `admin123` |
| Employee | `employee@example.com` | `user123` |

Replace the user list (and rotate bcrypt hashes) in [`next-app/src/lib/auth.js`](next-app/src/lib/auth.js) before production use.

## Routes

- `/` — login
- `/dashboard` — KPI overview + attendance matrix preview
- `/dashboard/employees` — directory (list/grid, search, pagination)
- `/dashboard/employees/[id]` — employee profile + per-day status
- `/dashboard/attendance` — full attendance table with filters and CSV export
- `/dashboard/calendar` — per-employee monthly calendar view
- `/dashboard/analytics` — top late/absent, monthly summary
- `/dashboard/profile` — current user's own profile
- `/dashboard/settings` — config & RBAC (super admin only)

## Google Sheet shape

The app expects a workbook with one tab per month (e.g., `January`, `February 2026`). Tabs called `Fingerprint`, `Leave List`, etc. are ignored. Each month tab should have:

| SL  | Name | 1-Jan | 2-Jan | …   | 31-Jan |
| --- | ---  | ----- | ----- | --- | ------ |
| 1   | Alex | P     | L     | …   | A      |

Status codes recognised: `P` (Present), `L` (Late), `A` (Absent), `WFH`, `CL`, `SL`. Blank cells are treated as unmarked, not present.

## What was intentionally dropped

These features required a long-running server or local filesystem and don't work on Vercel's serverless model:

- WebSocket realtime push (replaced by a Refresh button)
- Chokidar-based local Excel file watcher
- Add/Remove/Update employee endpoints that wrote back to a local `.xlsx` (read-only Google Sheets now)
- In-memory change log

If you need write access to the sheet, switch from an API key to a **Service Account** and add write scopes — see Google's docs.
