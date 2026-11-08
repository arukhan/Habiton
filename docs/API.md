# REST API map

All endpoints use `/api` prefix; requests and responses are JSON. Protected endpoints use a cookie `habiton_session` (HttpOnly, SameSite Lax).

| Method | Route | Action |
| --- | --- | --- |
| GET | /health | service health check |
| POST | /auth/register | register `{name,email,password}` |
| POST | /auth/login | login `{email,password}` |
| POST | /auth/logout | end session |
| GET | /me | current user, XP and level |
| PATCH | /me | update `{name}` or `{hero_class}` |
| GET | /habits | habit list, streaks, today's completion |
| POST | /habits | create `{title,category,target_minutes}` |
| DELETE | /habits/:id | archive habit, keep history |
| POST | /habits/:id/complete | complete full habit, +20 XP |
| POST | /habits/:id/report-miss | send `{missed_date,reason,workload,energy}`, return instant micro-quest |
| GET | /recoveries | user's recovery sessions |
| POST | /recoveries/:id/accept | accept micro-quest |
| POST | /recoveries/:id/micro | confirm self-reported micro-quest, +10 XP |
| POST | /recoveries/:id/step | confirm step-up, +10 XP |
| POST | /recoveries/:id/original | confirm original goal, +20 XP |
| GET | /insights | history, sessions, recovery counts |
| GET | /admin/metrics | real-user KR1 and event counts, admin only |
| POST | /demo/seed | demo history, only in DEMO_MODE=true |

### Analytics: 48-hour Recovery Rate
Eligible = reports by non-demo users with prior streak >=3, recorded at least 48 hours ago. Recovered = those whose micro completion occurred <=48h from report. The difference between report timestamp and quest delivery is not silently shifted.

### Errors
Responses on failure use `{ "error": "human-readable message" }`, with 400 (input), 401 (auth), 403 (permissions), 404 (missing), 409 (conflict), 500 (unexpected failure). Frontend shows the API error rather than silently swallowing it.
