# Deploy setup — Render + Vercel + Supabase [HUMAN: Priyam]

The D-001 production stack (see `docs/PLAN_AMENDMENT_OLD_STACK.md`). All free
tier. ~30 min end-to-end. The Docker/compose path stays maintained as the
self-host escape hatch (`docs/SETUP_ORACLE.md` + `compose.prod.yml`).

```
 Vercel (web, Next.js)  ──/api/proxy──►  Render (api, FastAPI)  ──►  Supabase (Postgres)
 GitHub Actions: cron-tick (15m) · nightly backup        UptimeRobot: keep-alive + alerts
```

## 1. Supabase (database only — no Supabase Auth)

1. supabase.com → New project. Pick a region near your users.
2. Project → Settings → Database → Connection string → **Session pooler** URI.
   Copy it; this is `DATABASE_URL`. (Pooler, not direct — Render's egress is
   fine with the pooler and it survives Supabase idle better.)
3. Nothing else — V2 owns its schema via Alembic; no Supabase Auth/RLS used.

## 2. Render (API)

1. render.com → New → **Web Service** → connect the GitHub repo.
2. Root directory `apps/api`. Runtime: Docker (uses `apps/api/Dockerfile`),
   or Python with build `pip install -r requirements.txt` and start
   `./entrypoint.sh` (runs `alembic upgrade head` then uvicorn).
3. Instance: **Free**. Region near Supabase.
4. Environment variables (Settings → Environment):
   ```
   APP_ENV=production
   DATABASE_URL=<supabase session pooler URI>
   JWT_SECRET=<python -c "import secrets;print(secrets.token_urlsafe(48))">
   APP_ENCRYPTION_KEY=<another token_urlsafe(48)>   # rotating it needs re-encryption
   CRON_SECRET=<another token_urlsafe(32)>
   APP_URL=https://<your-vercel-domain>
   ENABLE_BACKGROUND_WORKER=false                    # no worker on free; ticks drive jobs
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<gmail address>
   SMTP_PASSWORD=<gmail app password>                # auth emails
   MAIL_FROM=ReachFlow <your@gmail.com>
   ALERT_EMAIL=<your inbox>                           # feedback + ops alerts
   GROQ_API_KEY=<groq free key>                       # global AI fallback
   CASHFREE_APP_ID= / CASHFREE_SECRET_KEY= / CASHFREE_ENV=TEST / CASHFREE_WEBHOOK_SECRET=
   # REDIS_URL intentionally unset — memory-mode rate limit + tick jobs
   ```
5. Health check path: `/health`. Deploy. Note the URL `https://<svc>.onrender.com`.

## 3. Vercel (web)

1. vercel.com → New Project → import the repo. **Root directory `apps/web`.**
2. Framework preset: Next.js (auto). Build/output auto.
3. Environment variables:
   ```
   API_INTERNAL_URL=https://<svc>.onrender.com     # proxy → Render (server-side)
   NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=<from Umami, optional>
   NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
   ```
4. Deploy. Then set Render's `APP_URL` to the Vercel domain and redeploy Render
   (so auth-email links + Cashfree return URLs point at the real site).
5. **Cashfree webhook:** in the Cashfree dashboard set the webhook URL to
   `https://<your-vercel-domain>/api/proxy/api/payments/webhook` (the proxy
   forwards it to Render). Confirm `CASHFREE_WEBHOOK_SECRET` matches.

Both platforms **auto-deploy on push to `main`** — that's the deploy pipeline.
Rollback = the platform dashboard's "Redeploy"/"Rollback" on a prior build.

## 4. GitHub Actions secrets (Settings → Secrets and variables → Actions)

```
APP_URL            https://<svc>.onrender.com   # cron-tick target (Render, not Vercel)
CRON_SECRET        <same value as Render's CRON_SECRET>
DATABASE_URL       <supabase session pooler URI>   # for nightly backup
BACKUP_PASSPHRASE  <long random — KEEP SAFE, needed to restore>
BACKUP_REMOTE      r2:reachflow-backups            # rclone remote:bucket
RCLONE_CONF        <contents of your rclone.conf for R2/Drive>
```
- `cron-tick.yml` fires every 15 min → `POST $APP_URL/internal/cron/tick`.
- `backup.yml` runs nightly → encrypted pg_dump → offsite. Both no-op until
  their secrets exist.

### rclone remote (Cloudflare R2 free, 10 GB)

`rclone config` → new remote → type `s3` → provider `Cloudflare` → paste R2
access key/secret + endpoint. Test: `rclone copy test.txt r2:reachflow-backups/`.
Paste the resulting `~/.config/rclone/rclone.conf` into the `RCLONE_CONF` secret.

## 5. UptimeRobot (free — keep-alive + downtime alerts)

Render free spins down after ~15 min idle (cold start) and Supabase free pauses
after ~7 days idle. One external monitor solves both and alerts you when down:

1. uptimerobot.com (free) → Add Monitor → **HTTP(s)**.
2. URL: `https://<svc>.onrender.com/health` · interval **5 min** · alert to your
   email. This traffic keeps Render warm and Supabase active.
3. Add a second monitor on `https://<your-vercel-domain>/` (catches web outages).
4. (Optional) a third on the Cashfree webhook path returning 401 without a body
   is fine — don't monitor it.

External monitoring is deliberate: it survives the box it watches.

## 6. First-deploy checklist

- [ ] Render `/health` returns `{"status":"ok","db":"ok"}`
- [ ] `https://<vercel>` loads the landing; `/demo` works with no signup
- [ ] Sign up → verify email (link in inbox) → generate leads → see results
- [ ] `POST .../internal/cron/tick` with `X-Cron-Secret` returns 200 (Actions → run cron-tick manually)
- [ ] Trigger `backup` workflow manually → encrypted dump appears in R2
- [ ] **Restore drill:** `./infra/restore.sh <downloaded file> --drill` against a
      throwaway Supabase/Postgres → row counts look right (do this once; record
      the date in `docs/RUNBOOK.md`)
- [ ] UptimeRobot both monitors green
