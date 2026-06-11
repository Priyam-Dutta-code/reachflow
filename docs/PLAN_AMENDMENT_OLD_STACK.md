# Plan amendment — V2 on the existing free stack (D-001)

Amends `REACHFLOW_V2_MASTER_PLAN.md` per Priyam's decision D-001
(`docs/DECISIONS.md`). The **product** scope (Parts III–IV, Phases 2–10, 13)
is unchanged. Everything about *where it runs* is revised below.

## Revised architecture

```
            ┌────────────────────────────┐
 Internet ─►│ Vercel (free)              │  Next.js 15 (apps/web)
            │  marketing + app + proxy   │
            └──────────────┬─────────────┘
                           │ /api/proxy/[...path] → API_URL
            ┌──────────────▼─────────────┐
            │ Render free web service    │  FastAPI (apps/api)
            │  kept warm by UptimeRobot  │  in-process jobs + cron ticks
            └──────────────┬─────────────┘
                           │ DATABASE_URL
            ┌──────────────▼─────────────┐
            │ Supabase (free)            │  Postgres ONLY (no Supabase Auth)
            └────────────────────────────┘

 GitHub Actions (free):  CI · scheduled cron ticks · nightly pg_dump backup
 UptimeRobot (free):     keep-alive ping + downtime alerts
 Local dev (Docker):     compose.dev.yml = full stack incl. Celery (parity + portability)
```

## Replacements map (amends Part II)

| Master plan said | Amended to |
|---|---|
| Oracle Always Free VM, docker compose in prod | Render free web service (auto-deploy from git, `rootDir apps/api`) |
| Cloudflare Tunnel, zero open ports | Vercel + Render public HTTPS endpoints (their TLS/CDN) |
| Next.js standalone container | Vercel project (`rootDir apps/web`) |
| Postgres 16 container + volumes | Supabase free Postgres (connection string only; **Supabase Auth still removed in Phase 3**) |
| Celery worker + beat containers | **Tick model:** GitHub Actions schedule (e.g. */15 min) calls signed `POST /internal/cron/tick` → bounded in-process batches (sends, follow-ups, job processing). Celery code still ships and runs in compose for local/self-host parity. |
| Redis container (broker + rate limits) | Optional in prod: in-memory rate-limit fallback (single instance) — V1 pattern, already ported. Local dev uses real Redis via compose. |
| Self-hosted Umami | Umami Cloud free tier, or Umami deployed to Vercel with its own Postgres schema (Phase 9 decision) |
| Uptime Kuma + external monitor | UptimeRobot free only — doubles as the keep-alive that prevents Render spin-down and Supabase pausing |
| Nightly pg_dump on VM + rclone offsite | GitHub Actions scheduled `pg_dump` of Supabase → encrypted → free remote (R2 10 GB / GDrive). Restore drill still mandatory. |
| `infra/deploy.sh` in prod | Git-push auto-deploys (Vercel + Render). `deploy.sh`/compose remain the self-host path (kept tested). |
| Domain + Cloudflare DNS | Optional. Free `*.vercel.app` / `*.onrender.com` until selling justifies a domain. |

## Revised phase map

- **Phase 1 (server & edge)** → *closed.* Deliverables re-scoped as the
  optional self-host path (`docs/SETUP_ORACLE.md`, `SETUP_CLOUDFLARE.md`,
  `CADDY_FALLBACK.md`, `infra/*.sh` all stay maintained).
- **Phase 1R (new, runs after Phase 3):** old-stack production wiring —
  Render service for `apps/api` + env vars, Vercel project for `apps/web`,
  UptimeRobot keep-alive, GitHub Actions cron tick + backup workflows,
  Supabase connection settings. Documented in `docs/SETUP_RENDER_VERCEL.md`
  (written when first deployable).
- **Phase 2 (backend core):** unchanged, plus: settings must run cleanly with
  `REDIS_URL` empty (Render) and present (compose); cron-tick endpoint scaffold.
- **Phase 3 (auth):** unchanged (custom auth works identically on Render).
- **Phase 4 (engines):** "generation as a Celery job" becomes **dual-mode
  jobs**: a `jobs` table + status endpoint either processed by Celery (compose)
  or by FastAPI BackgroundTasks + cron ticks (Render). Bounded batch sizes so
  no request/tick exceeds platform limits. Send pacing via tick scheduling,
  never `time.sleep` loops.
- **Phases 5–8, 10, 13:** unchanged.
- **Phase 9:** Umami choice per table above.
- **Phase 11:** CI (GitHub Actions tests) + backup workflow + restore drill +
  UptimeRobot alerts. No SSH deploys.
- **Phase 12:** cutover = swap the Vercel/Render projects (or repoint
  `rootDir`) from V1 to V2 and run the V1→V2 data migration inside the same
  Supabase Postgres. Simpler than the original cross-cloud migration.

## Honest revision of the Extraordinary bar

- "Zero cold starts — first request after 12 idle hours responds < 1 s" →
  **"API stays warm via keep-alive; first response after a deploy or platform
  restart may take 30–60 s; steady-state requests < 1 s."** This is the real
  trade accepted in D-001.
- "A stranger can clone and run the platform with `docker compose up`" →
  **unchanged** (kept true by local compose parity).
- ₹0/month → **unchanged.**

## Accepted risks (named, per the plan's honesty rule)

1. Keep-alive pinging a free Render service is a tolerated-but-gray pattern;
   if Render tightens policy, the self-host path is the escape hatch.
2. Only ONE always-on free service → worker concurrency is bounded by the
   web process; long jobs must be chunked (enforced in Phase 4 design).
3. Supabase free: 500 MB DB, no automated backups (ours via Actions), 7-day
   inactivity pause (prevented by keep-alive traffic).
4. In-process jobs die on deploy/restart → all tick work must be idempotent
   and resumable (Phase 4 acceptance criterion).
