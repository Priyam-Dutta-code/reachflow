# RUNBOOK (seed — completed in Phase 11)

Day-2 operations for the ReachFlow stack. All commands run on the server in
`~/reachflow` as the `reachflow` user.

## Deploy & rollback

```bash
./infra/deploy.sh                 # deploy latest on the current branch
./infra/deploy.sh v2.1.0          # deploy a tag/commit
./infra/deploy.sh rollback        # redeploy the last recorded good commit
./infra/deploy.sh rollback <ref>  # redeploy an explicit ref
```

Pipeline: `git pull → compose build → alembic upgrade head → up -d → health
verify`. A deploy only counts (and is recorded in `.last-good-deploy`) after
every container reports healthy **and** the api `/health` says `ok`.

Rollback redeploys old code but does **not** undo DB migrations (forward-only).
If a migration itself is the problem: restore the latest dump first
(see Backup/Restore, Phase 11), then roll back code.

## Logs

```bash
docker compose -f compose.prod.yml logs -f api        # follow one service
docker compose -f compose.prod.yml logs --tail 100    # everything, recent
docker compose -f compose.prod.yml ps                 # health at a glance
```

## DB shell

```bash
docker compose -f compose.prod.yml exec db psql -U reachflow reachflow
```

## Worker health (Phase 2+)

```bash
docker compose -f compose.prod.yml exec worker \
  celery -A app.workers.celery_app inspect ping
```

## Cloudflare tunnel

```bash
docker compose -f compose.prod.yml logs cloudflared --tail 20
# token rotation: Zero Trust → Tunnels → ⋯ → Rotate token → update .env →
docker compose -f compose.prod.yml up -d cloudflared
```

## Placeholders (filled by later phases)

- Backup / restore (`backup-now.sh`, `restore.sh`) — Phase 11
- Rotating `JWT_SECRET` / `APP_ENCRYPTION_KEY` (with re-encryption) — Phase 11
- "Server died" recovery = 30-minute portability drill — Phases 11–12
- Monitoring (Uptime Kuma + external) — Phase 11
