# MVP acceptance checklist

- [ ] `docker compose up --build -d` completes on Windows with no 5432 host port conflict
- [ ] `docker compose ps` shows db healthy, backend and frontend up
- [ ] `/api/health` returns HTTP 200
- [ ] Login with demo@habiton.local / HabitonDemo2026! (local only)
- [ ] Today contains Study and Stay hydrated
- [ ] Report yesterday's missed Study day (12 prior full sessions)
- [ ] Quest appears immediately; 48h deadline starts when report is sent
- [ ] Acceptance does not itself mark completion
- [ ] Tick confirm to record micro-quest; see Streak kept!
- [ ] Step-up then Original goal; history distinguishes recovery/step-up/full
- [ ] Change Penguin RPG class and refresh; saved class stays
- [ ] Create new habit, refresh and log back in; it remains in PostgreSQL
- [ ] Demo account data excluded from internal real-user metrics
- [ ] `http://localhost:3000/profile` is an actual URL and can be refreshed
- [ ] `go test ./...` passes within backend (if dependencies are downloaded)
- [ ] `npm run build` passes within frontend (if dependencies are downloaded)
- [ ] Rebuild without `docker compose down -v` to keep persistent PostgreSQL data

For a second independent recovery journey, log in as maya@habiton.local or alex@habiton.local.
