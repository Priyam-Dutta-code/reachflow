# RUNBOOK

Day-2 operations for the **D-001 stack**: Vercel (web) + Render (API) +
Supabase (Postgres), with GitHub Actions for cron-tick + nightly backups and
UptimeRobot for keep-alive/alerts. First-time setup lives in
[`SETUP_RENDER_VERCEL.md`](SETUP_RENDER_VERCEL.md). The self-host/compose path
is preserved as an escape hatch — see the appendix at the bottom.

Conventions: `<svc>.onrender.com` = the Render API URL; `<vercel>` = the Vercel
web domain. Local helper scripts assume a repo-root `.env` (git-ignored).

---

## Deploy

**There is no deploy script — push is the deploy.** Both Render and Vercel
watch the GitHub repo and auto-build on push to `main`.

```bash
git push origin main          # → Render rebuilds API, Vercel rebuilds web
```

- Render runs `entrypoint.sh` on boot → `alembic upgrade head` then uvicorn.
  Migrations apply automatically; a bad migration fails the deploy (old
  instance keeps serving until the new one is healthy).
- Vercel build = `next build`; a type/build error fails the deploy and the
  previous build stays live.
- Watch progress in each dashboard's Deploys/Logs tab. Confirm after:
  ```bash
  curl -s https://<svc>.onrender.com/health      # {"status":"ok","db":"ok"}
  curl -sI https://<vercel>/ | head -1           # 200
  ```

CI (`.github/workflows/ci.yml`) runs ruff+pytest+migrations and web
typecheck+build on every PR — green CI is the pre-deploy gate. Merge to `main`
only when it's green.

## Rollback

Forward-fix is usually faster, but to revert immediately:

- **Render:** dashboard → service → **Deploys** → pick the last good build →
  **Redeploy**. (Or **Rollback** if shown.)
- **Vercel:** dashboard → project → **Deployments** → ⋯ on a known-good one →
  **Promote to Production**.

Rollback redeploys old **code**; it does **not** undo a DB migration (Alembic
is forward-only). If a migration is the problem: restore the latest dump first
(see Backup/Restore), then roll back code, then redeploy.

## Logs

- **Render:** dashboard → service → **Logs** (live tail). CLI alternative if
  you've installed it: `render logs -r <service-id> --tail`.
- **Vercel:** dashboard → project → **Logs** (runtime), or **Deployments** →
  a build → build logs. CLI: `vercel logs <deployment-url>`.
- **Cron / backup runs:** GitHub → **Actions** → the `cron-tick` / `backup`
  workflow → the run. Each tick logs its HTTP code + JSON body.

## Database shell

Use the Supabase **session pooler** URI (same as `DATABASE_URL`):

```bash
psql "$DATABASE_URL"                                   # interactive
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"  # one-off
```

Supabase dashboard → **SQL Editor** works too (no local psql needed). Schema is
owned by Alembic — don't hand-edit DDL; write a migration.

## Background work (cron-tick)

Render free has no Celery worker; `ENABLE_BACKGROUND_WORKER=false`. Due sends,
follow-ups, and stale lead-gen jobs are driven by the `cron-tick` Action every
15 min hitting the signed endpoint.

```bash
# manual fire (same as the Action):
curl -fsS -X POST https://<svc>.onrender.com/internal/cron/tick \
  -H "X-Cron-Secret: $CRON_SECRET" --max-time 60
```

Health check: GitHub → Actions → `cron-tick` → recent runs should be green and
show `HTTP 200`. If they 401 → `CRON_SECRET` mismatch between the repo secret
and Render's env. If they time out → Render is cold; the next tick succeeds, or
confirm UptimeRobot keep-alive is running (below).

## Backup & restore

Nightly encrypted dump runs via `.github/workflows/backup.yml` (01:00 IST) →
offsite rclone remote, 14-day retention. Format: `pg_dump | gzip -9 | openssl
enc -aes-256-cbc -pbkdf2`. The crypto/compression round-trip is verified; the
**`pg_dump`/`psql` halves need a real Postgres** — do the drill once on deploy.

```bash
# on-demand backup (local + offsite if BACKUP_REMOTE set):
./infra/backup-now.sh

# list offsite copies:
rclone lsl "$BACKUP_REMOTE/"

# RESTORE DRILL (safe — into a throwaway DB, verifies row counts):
DRILL_DATABASE_URL="postgresql://…/scratch" \
  ./infra/restore.sh backups/reachflow-<stamp>.sql.gz.enc --drill

# REAL RESTORE (destructive — prompts for confirmation):
TARGET_DATABASE_URL="$DATABASE_URL" \
  ./infra/restore.sh backups/reachflow-<stamp>.sql.gz.enc
# then, if the dump predates a migration:
#   (Render redeploy runs alembic upgrade head automatically, or run it locally)
```

`BACKUP_PASSPHRASE` is the only thing that can decrypt a dump — losing it loses
the backups. Store it in a password manager, not just the repo secret. Record
the date of each successful restore drill below.

> Restore drills performed: _(none yet — do the first on deploy, then log the date here)_

## Rotating secrets

Set new values in the relevant dashboard, then redeploy. Match-ups that must
stay in sync:

| Secret | Lives in | Sync requirement |
|---|---|---|
| `CRON_SECRET` | Render env **and** GitHub `CRON_SECRET` | must be identical |
| `DATABASE_URL` | Render env **and** GitHub `DATABASE_URL` | must be identical |
| `CASHFREE_WEBHOOK_SECRET` | Render env **and** Cashfree dashboard | must match |

- **`JWT_SECRET`** — safe to rotate anytime. Effect: all existing access tokens
  stop verifying, so every session must re-login. Set new value on Render →
  redeploy. No data migration. Do it off-peak; warn that users get logged out.
- **`APP_ENCRYPTION_KEY`** — **NOT** safe to swap blindly. It's the Fernet key
  encrypting stored secrets (SMTP creds, etc., the `enc:`-prefixed columns).
  Rotating it makes existing ciphertext undecryptable. To rotate you must
  **re-encrypt**: with the OLD key still set, decrypt every `enc:` value; set
  the NEW key; re-encrypt and write them back — in one maintenance step. If you
  rotate without re-encrypting, users must re-enter their integration secrets.
  Until a re-encryption helper exists, treat this key as permanent; if it's
  ever compromised, plan the re-encryption window explicitly.
- **`CRON_SECRET`** — rotate on Render and the GitHub secret together; a window
  of mismatch just means ticks 401 until both match (harmless, jobs catch up).

## Monitoring & alerts

- **UptimeRobot** (external) — 5-min HTTP monitors on `/<svc>.onrender.com/health`
  and `<vercel>/`. Doubles as keep-alive (prevents Render spin-down + Supabase
  idle-pause) and downtime alert to email. This is the primary alarm.
- **App alerts** — set `ALERT_EMAIL` on Render; feedback + ops notices email out
  via SMTP.
- **Analytics** — Umami Cloud (`NEXT_PUBLIC_UMAMI_*` on Vercel), privacy-first,
  no cookies.

## "It's down" recovery

1. Check UptimeRobot — which monitor is red (API vs web)?
2. **API red:** Render dashboard → Logs. Cold start? wait ~50s and re-curl
   `/health`. Crash loop on boot? almost always a failed `alembic upgrade` or a
   missing env var — read the log line, fix the env/migration, redeploy.
3. **Web red:** Vercel → latest deployment logs. Build failed → fix & push, or
   promote the last good deployment.
4. **DB unreachable:** Supabase dashboard — project paused (free tier, ~7d
   idle)? un-pause; UptimeRobot keep-alive prevents recurrence. Data loss?
   restore the latest dump (above).
5. **Total loss of an account/platform:** the app is portable by design — the
   compose stack (appendix) brings the whole thing up on any Docker host from
   the repo + a restored dump. That's the ultimate fallback.

---

## Appendix — self-host escape hatch (compose)

The original Oracle/Cloudflare self-host path is kept maintained so we're never
locked to Render/Vercel. Full setup: [`SETUP_ORACLE.md`](SETUP_ORACLE.md),
[`SETUP_CLOUDFLARE.md`](SETUP_CLOUDFLARE.md), [`CADDY_FALLBACK.md`](CADDY_FALLBACK.md).
On the server in `~/reachflow` as the `reachflow` user:

```bash
./infra/deploy.sh                 # deploy latest on the current branch
./infra/deploy.sh rollback        # redeploy last recorded good commit
docker compose -f compose.prod.yml logs -f api        # follow logs
docker compose -f compose.prod.yml ps                 # health at a glance
docker compose -f compose.prod.yml exec db psql -U reachflow reachflow
docker compose -f compose.prod.yml exec worker \
  celery -A app.workers.celery_app inspect ping        # real Celery worker here
docker compose -f compose.prod.yml logs cloudflared --tail 20
```

In compose mode a real Celery worker + beat replace the cron-tick Action, and
the DB is the in-compose Postgres (back it up with the same `backup-now.sh`,
pointing `DATABASE_URL` at it). This path is the 30-minute portability drill:
fresh host + repo + restored dump → live.
