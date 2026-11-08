# Safely upgrade an existing local Habiton MVP

Your previous Habiton project may contain accounts/habit logs in the Docker named volume `habiton-project_habiton_data`. **Do not delete or recreate the volume to migrate the code.**

1. In PowerShell at the current project folder, run `docker compose ps` and make sure you are in the intended Habiton project.
2. (Recommended) Back up your current project folder and PostgreSQL data before doing anything. With the old `db` container healthy, run:

```powershell
# In the original Habiton-project folder
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
docker compose exec -T db pg_dump -U habiton -d habiton -Fc > "D:\Habiton\habiton-backup-$stamp.dump"
```

3. Keep your existing `.env`. Stop old containers without deleting the database:

```powershell
docker compose down
```

4. Replace **only the source files** in `Habiton-project` with the new ZIP contents, preserving `.env` and any backup. Use the exact same `Habiton-project` folder name to keep Compose project identity and reuse the existing named volume.
5. Rebuild:

```powershell
docker compose up --build -d
docker compose ps
```

6. Visit `http://localhost:3000/login` and test your existing account. The schema is additive/idempotent; migration `001_init.sql` uses `IF NOT EXISTS`.
7. If the old Compose was run with an explicit `-p` project name or `COMPOSE_PROJECT_NAME`, use the same name to reconnect the correct volume.

**Never use** `docker compose down -v`, `docker volume prune`, or Docker factory reset just to update the code. Those operations can destroy your habit history.

Troubleshooting: if `docker compose ps` shows no `db`, or login doesn't work, inspect `docker compose logs db backend frontend --tail=100`. Do not post passwords, tokens or user data in public messages.
