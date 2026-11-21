# Habiton ✦ MVP
A gentle, mobile-first habit tracker that helps people recover after a missed day instead of giving up.

## Stack
- Frontend: Next.js 15 App Router, React 19, TypeScript, CSS, PWA
- Backend: Go 1.25, Gin REST API, pgx
- Database: PostgreSQL 16 in Docker Compose (persistent named volume)
- Analytics: PostgreSQL event log, administrator recovery KPI, optional Amplitude HTTP API

## First-time launch on Windows
```powershell
cd D:\Habiton\Habiton-project
Copy-Item .env.example .env
# DEMO_MODE=true is safe for LOCAL demos only, NEVER deploy public with it enabled.
docker compose up --build -d
docker compose ps
```

Open **http://localhost:3000**. API: **http://localhost:8080/api/health**. Database is reachable **only within Docker** at `db:5432`, not published on the Windows host (avoids port conflict).

If you already had Habiton running, use [docs/UPGRADE.md](docs/UPGRADE.md) to preserve your existing PostgreSQL volume. Do **not** use `docker compose down -v` unless you intentionally want to erase local data.

## Demo logins (local only)

All have password **`HabitonDemo2026!`** and are created automatically when `DEMO_MODE=true`:

| Email | Demo progress |
| --- | --- |
| demo@habiton.local | Study (12 days), Stay hydrated |
| maya@habiton.local | Study (12 days), Stay hydrated |
| alex@habiton.local | Morning movement (12 days), Stay hydrated |

Demo accounts are excluded from real-user metrics and Amplitude forwarding. For the core recovery test, log in, open Today, report yesterday's missed day, accept micro-quest, tick the self-report confirmation, record completion, view **Streak kept!**, continue through step-up and original goal, then open Insights.

## App URLs

| URL | Purpose |
| --- | --- |
| `/login`, `/register` | Authentication |
| `/today` | Dashboard, habits, main recovery action |
| `/habits/new` | Create habit |
| `/recovery/report` | Report missed day |
| `/recovery/:id` | Instant micro-quest, accept and check in |
| `/recovery/:id/success` | Streak kept, next step, penguin celebration |
| `/profile` | Penguin companion, Warrior / Mage / Priest, XP, profile |
| `/insights` | Session history and charts |
| `/admin` | Admin-only KPI dashboard |

## Admin dashboard

The dashboard opens from **Profile → Admin dashboard** for the configured administrator account. Set `ADMIN_USER_ID` on the Go backend to the UUID of a trusted existing, non-demo account. For an existing deployment, `ADMIN_EMAIL` still works when `ADMIN_USER_ID` is unset. In that case use an email for a trusted account that already exists. Public registration cannot use the configured admin email.

The dashboard shows aggregated 7- and 30-day reports using the Asia/Almaty calendar. Demo accounts are excluded. The recovery funnel counts unique users offered a plan during the period. The 48-hour KPI counts eligible reports with elapsed windows in that cohort and requires a completion before the deadline. Open windows are shown separately. D7 retention counts accounts whose seventh local calendar day fell in the period and has ended, and checks for recorded activity on that day.

## Recovery rules

1. A habit must have an existing streak >=3 days to qualify.
2. Reporting a miss starts the **48-hour** window immediately; does not silently move after template delivery.
3. Ready-to-use template micro-quest is offered immediately; user acceptance does not count as completing it.
4. Confirm completion to keep the streak. Recovery and step-up steps are recorded distinctly from full sessions.
5. Return in stages, e.g. 30-minute habit → 5-minute micro-quest → 15-minute step-up → 30-minute original goal.
6. Maximum 3 recovery windows per rolling 30 days and 2 consecutively. XP, calendar and history remain intact even if streak resets.
7. Penguin mascot celebrates or supports without guilt-inducing penalties. RPG progression is personal, no leaderboards.

## Local development without Docker

Run PostgreSQL separately and set `DATABASE_URL`. Within `backend/`: `go mod tidy`, `go run .` (Go 1.25). Within `frontend/`: `npm install`, set `BACKEND_URL=http://localhost:8080` in `.env.local`, `npm run dev`. Do not commit secret environment files.

## Release verification

Compare the production deployment's Source Commit in Vercel with the frontend response at `/version`. Vercel supplies `VERCEL_GIT_COMMIT_SHA` when system environment variables are exposed to the build. For other frontend builds, set `APP_VERSION` to the commit SHA at build time. The backend's `/api/health` returns its Go build revision when available. Set `APP_VERSION` on the API host to the SHA of that artifact when VCS build information is unavailable, as with a Docker build context that omits Git metadata.

The frontend uses `BACKEND_URL` when building the API rewrite. Set it to the deployed Go API in the Vercel Production environment and rebuild after changing it. Deploy Go changes separately, then verify health and the recovery flow.

GitHub Actions runs ESLint, the Next.js build, and Go tests with PostgreSQL. To run the integration test locally, set `HABITON_TEST_DATABASE_URL` to a test PostgreSQL database where the role can create schemas, then run `go test -mod=readonly -count=1 ./...` in `backend/`. The test creates and drops its own schema.

In the admin dashboard, G1 tracks timely micro-quest completions whose seven-day measurement windows closed in the selected period. It reports the share that returned to the original goal within seven days of reporting the missed habit.

## Email and Google sign-in

Configure these variables on the **Go API host**. Keep credentials in the hosting provider's secret settings. Next.js continues to use `BACKEND_URL` to proxy `/api`.

| Setting | Value |
| --- | --- |
| `SMTP_REQUIRED` | Set to `true` in production once the settings below are available. The API then stops at startup if email configuration is missing. |
| `SMTP_HOST`, `SMTP_PORT` | Your SMTP provider's hostname and port. Use `587` with STARTTLS or `465` with implicit TLS, according to the provider. |
| `SMTP_TLS_MODE` | `starttls` (default) or `implicit`. |
| `SMTP_FROM` | Sender address verified by the provider. |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | SMTP credentials from the provider, if required. |
| `EMAIL_CODE_SECRET` | Stable secret of at least 32 bytes shared by all API instances. Generate it with `openssl rand -hex 32`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client of type **Web application**. |
| `GOOGLE_REDIRECT_URL` | Set this to `https://myhabiton.vercel.app/api/auth/google/callback` and add the same URL to the Google client's authorized redirect URIs. For local HTTP use `http://localhost:3000/api/auth/google/callback`. |
| `APP_ORIGIN`, `COOKIE_SECURE` | In production use the deployed frontend origin and set `COOKIE_SECURE=true`. |

Without SMTP configuration, the local development workflow uses password-only registration and password login. With SMTP enabled, new accounts verify their address before creation. Existing accounts verify via the password reset flow, which keeps the user ID, habits and progress and revokes prior sessions. The passwordless login option is available for verified non-demo accounts. Finish provider testing before enabling this policy on a live database.

Google sign-in uses Gmail or a verified Google Workspace address. It creates a profile on the first sign-in and uses the Google subject on subsequent sign-ins. Existing accounts keep their existing sign-in methods, including when a Google profile presents the same email. Google test-mode users must be added to the OAuth consent screen's test-user list.

The Go test suite uses a disposable PostgreSQL schema and simulated delivery and Google responses. After setting up production providers, confirm that a message arrives, verify a test registration, and complete one Google sign-in using the deployed frontend.
