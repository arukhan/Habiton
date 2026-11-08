# Working on Habiton as a team

1. Clone the team's GitHub repository. Copy `.env.example` to `.env` and run `docker compose up --build -d`.
2. Everyone has their **own local** PostgreSQL volume; updates to code do not automatically share database records. Production uses one managed DB.
3. Before making changes: `git switch main`, `git pull`, `git switch -c feature/meaningful-name`.
4. Commit code and test, push your branch, open a Pull Request; another teammate reviews it before merge.
5. Never commit `.env`, production secrets, database dumps, or real users' personal data.
6. Backend code ownership: auth.go, habits.go, recovery.go, analytics.go. Frontend screen ownership maps to `src/app/**/page.tsx`; shared components should be reviewed across the team.
7. Verify the checklist and `docker compose logs backend frontend` before merging.
