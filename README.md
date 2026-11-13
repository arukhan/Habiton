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
