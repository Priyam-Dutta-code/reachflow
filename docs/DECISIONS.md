# Decisions log

Owner: Priyam. Each entry records a decision that shapes the V2 build.

---

## D-001 · 2026-06-11 · Infrastructure: stay on the existing free stack permanently

**Decision (Priyam):** V2 runs on the previous setup — Vercel (frontend) +
Render (API) + Supabase (Postgres only) — instead of the master plan's
Oracle VM + Cloudflare Tunnel. No Oracle account, no domain purchase required.

**What this keeps:** ₹0/month, zero new accounts, auto-deploy from git.

**What this gives up (accepted):** guaranteed zero cold starts, a real Celery
worker/beat, self-owned backups, single-server portability as the *production*
story. See `docs/PLAN_AMENDMENT_OLD_STACK.md` for the full revised
architecture and per-phase changes.

**Mitigations:** Render free = 750 instance-hours/month → one always-on API
service + UptimeRobot keep-alive (also prevents Supabase's 7-day pause);
scheduled work moves to signed cron-tick endpoints driven by GitHub Actions;
backups move to a scheduled GitHub Actions `pg_dump`.

**Not lost:** the Docker/compose path stays maintained and tested locally
(Docker Desktop) — "self-hostable in 30 minutes" remains a README feature and
the escape hatch if free-tier terms ever change. Phase 1's Oracle/Cloudflare
runbooks are kept in `docs/` as the optional self-host path.

## D-002 · 2026-06-11 · Local development uses Docker Desktop

**Decision (Priyam):** Docker Desktop will be installed on the Windows dev
machine. Local dev = `docker compose -f compose.dev.yml up` (Postgres 16 +
Redis + api + worker + web). Tests also run without Docker via SQLite.

## Open decisions (Appendix E — defaults in bold)

- Custom domain later for credibility/SEO (**recommended once selling**; free
  `vercel.app` subdomain until then).
- Google OAuth (**later**). Dark mode (**later**). Charts (**hand-rolled SVG**).
- Pricing numbers per plan/vertical (current `verticals.py` values stand until revised).
- Migrate V1 users vs fresh start (**fresh start if <10 real users**) — Phase 12.
- Selenium/LinkedIn source behind flag (**yes, off by default**).
