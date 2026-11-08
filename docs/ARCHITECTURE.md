# Habiton architecture — MVP v2

## Components

- `frontend/`: Next.js 15 App Router, responsive installable PWA; each screen has its own URL.
- `frontend/src/lib/api.ts`: typed HTTP API client, cookies and error handling.
- `frontend/src/context/AppContext.tsx`: logged-in user, shared datasets, refresh and actions.
- `frontend/src/components/`: re-usable navigation, penguin mascot, habit and recovery cards.
- `backend/`: Go 1.25 + Gin + pgx, organized by domain files (`auth.go`, `habits.go`, `recovery.go`, `recovery_rules.go`, `analytics.go`, `demo.go`). Single Go package (`main`) keeps MVP deployment straightforward. Future scale: internal packages / repository/service boundaries.
- `backend/migrations/`: PostgreSQL schema applied on startup using idempotent `CREATE IF NOT EXISTS` statements. Do not edit existing migrations after real deployment; add versioned migrations.
- `docker-compose.yml`: local containers and named PostgreSQL volume. Database port intentionally **not** exposed to Windows.

## User journey

Login -> Today -> report missed day -> template micro-quest (instant) -> accept -> self-report completion -> Streak kept -> step-up -> original goal -> Insights.

## Recovery invariant

- Recoveries require a prior streak >=3 days.
- At most 3 per rolling 30 days, no more than 2 consecutively.
- The 48h clock starts at *report time*, not at template delivery.
- Recovery and step-up logs are separate from full sessions. History and XP are never erased when a streak resets.
- Recovery eligibility and advancement are verified server-side, with DB row-lock/transaction checks.
- Demo users are excluded from KPIs and outgoing Amplitude events.

## Environment

Production needs managed PostgreSQL, TLS, `COOKIE_SECURE=true`, `APP_ORIGIN` matching public URL, `DEMO_MODE=false`, secure `POSTGRES_PASSWORD`, ADMIN_EMAIL set only to the admin's real account, and backend API routed as same-origin `/api`.

## License and inspiration

Habitica (provided by the user) was examined only for broad gamification ideas such as personal quests, XP, and a character companion. **No Habitica source code or artwork is incorporated.** Their repository is GPLv3 and has separate art licenses. Penguin reference is supplied by the project owner.
