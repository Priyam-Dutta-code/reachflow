# ReachFlow V2 — Salvage Map

> Phase 0 deliverable per `REACHFLOW_V2_MASTER_PLAN.md`.
> Verdict legend: **PORT** = move into the V2 structure and harden (do not re-derive),
> **REWRITE** = build new from scratch (V1 version is reference only),
> **DROP** = does not move to V2 (reason given).
>
> V1 reference points: branch `main` (live V1) and tag `v1`. Branch `redesign-frontend`
> holds a partial light-theme redesign from the superseded `REACHFLOW_REVAMP_PLAN.md`
> (landing + UI primitives only; app pages still dark). V2 supersedes both.

---

## 1. Root / infra

| File | Verdict | Reason / V2 destination |
|---|---|---|
| `README.md` | REWRITE | Phase 13 rewrites it as a hiring artifact. V1 copy describes the Vercel/Render/Supabase stack being eliminated. |
| `DEPLOY.md` | DROP | Entirely about Vercel + Render + Supabase free-mode deploys. Replaced by `docs/RUNBOOK.md` + `docs/SETUP_ORACLE.md` + `docs/SETUP_CLOUDFLARE.md` (Phases 1, 11). |
| `docker-compose.yml` | REWRITE | Concept survives (db/redis/api/worker/beat) but V2 uses `compose.dev.yml` + `compose.prod.yml` with cloudflared instead of nginx+certbot, Postgres 16, healthchecks everywhere, and no Supabase escape hatches. |
| `nginx/nginx.conf` | DROP | V2 ingress is a Cloudflare Tunnel (no open web ports). A Caddy fallback config will be documented in `docs/` for non-Cloudflare portability (Phase 1) — written fresh, not derived from this. |
| `render.yaml` | DROP | Render is eliminated. |
| `backend/Procfile`, `backend/railway.json` | DROP | Heroku/Railway artifacts; no longer targets. |
| `start.py` | DROP | Dev-launcher built around Supabase env validation. V2 dev entry point is `docker compose -f compose.dev.yml up`. |
| `.env.example` | REWRITE | V2 version documents the full Appendix B variable set (JWT_SECRET, SMTP_*, tunnel, Umami, backup remotes); Supabase vars removed. |
| `.gitignore` | PORT | Keep and extend (`.claude/`, alembic cache, backups, etc.). |
| `REACHFLOW_REVAMP_PLAN.md` | DROP | Explicitly superseded by `REACHFLOW_V2_MASTER_PLAN.md` (removed from the V2 branch; still in git history). |
| `docs/API_MAP.md` | PORT | Accurate endpoint inventory; becomes the seed of `docs/API.md` and the contract table below. |
| `docs/AUDIT.md` | PORT | Baseline audit findings remain valid; referenced throughout this map (items A1–A15). |

## 2. Backend — `backend/`

| File | Verdict | Reason / V2 destination |
|---|---|---|
| `main.py` | REWRITE | New `apps/api/app/main.py`: same ideas (security headers, gzip, sanitized 500s, router mounting) but with structured JSON logging, request IDs, db+redis health checks, lifespan-managed resources, and **no** `Base.metadata.create_all` (Alembic owns the schema — Phase 2). |
| `config.py` | REWRITE | Replaced by `pydantic-settings` (`app/core/settings.py`), validated at boot. All Supabase vars deleted; Appendix B vars added. |
| `database.py` (engine/session) | REWRITE | New `app/db/{base,session}.py` with Alembic from day one. |
| `database.py` (models User/Lead/Campaign/EmailLog/Payment + enums) | **PORT** | Contract-preserved per Part IV. Additions in V2: `User.password_hash`, `User.email_verified_at` (Phase 3), `auth_sessions`, `one_time_tokens` (Phase 3), `unsubscribes` suppression table (Phase 4), hot-query indexes (`leads(user_id,status)`, `email_logs(user_id,sent_at)`), unique idempotency guard on `email_logs` (Phase 4). String UUID PKs stay (server-generated `uuid4().hex` instead of Supabase-issued). |
| `security.py` — `SecretManager` (Fernet) | **PORT (unchanged behavior)** | Crown jewel per plan. Moves to `app/core/security.py` + startup check that `APP_ENCRYPTION_KEY` is set. The `enc:` prefix format must stay byte-compatible so migrated rows still decrypt. |
| `security.py` — rate limiter | REWRITE | Redis-backed limiter (e.g. slowapi) as middleware with per-bucket configs (Phase 2). V1's in-memory fallback dies with always-on Redis. |
| `security.py` — CORS/origin builders | DROP | Vercel-preview regex logic is meaningless in V2; CORS is locked to the single app origin. |
| `routers/auth.py` — Supabase JWT verify (`verify_token`, JWKS pinning, `_project_ref_*`) | DROP | Supabase is fully removed. Phase 3 builds argon2id + own JWT + rotating refresh sessions. |
| `routers/auth.py` — `get_current_user` lazy provisioning | DROP | V2 has a real `register` endpoint; users are created explicitly, not on first request. |
| `routers/auth.py` — `_user_dict`, `_ensure_product_profile`, `_update_sensitive_fields`, profile/onboard endpoints + validators | **PORT** | This is the `/me`, `PATCH /profile`, `POST /onboard` contract (Part IV) incl. `missing_setup[]` logic and the vertical→plan remap rules. Re-attach to the new auth dependency. |
| `routers/leads.py` | **PORT** | Keep contracts (`/generate`, `GET /`, `PATCH/DELETE /{id}`), the quota cap, campaign ownership checks, and `_lead_dict`. Phase 4 changes: generate becomes a Celery job returning `job_id` + status endpoint; quota decrement becomes atomic (audit A6: `leads_used` is lifetime-only — define quota model); suppression-aware status handling. |
| `routers/campaigns.py` | **PORT** | Keep contracts + entitlement gates. Phase 4 fixes: campaign create must clamp/communicate plan caps (audit A1: default 40/day 400-errors on free plans), idempotent sends, accurate statuses, campaign-detail endpoint added. |
| `routers/emails.py` | **PORT** | `/preview` contract kept. `/check-replies` logic needs a real fix (audit A5: marks every inbox sender as replied) — port the endpoint, rewrite the matching logic. |
| `routers/analytics.py` | **PORT** | `/overview` payload is the dashboard+analytics contract (Part IV). Phase 8 adds date-range + CSV export; consider consolidated queries (it currently issues ~12 counts per call). |
| `routers/payments.py` | **PORT** | Cashfree create-order / verify / **signature-verified webhook** (±900 s window) / plans — battle-tested, keep. Phase 4: disabled-safe state ("payments not configured" instead of 500), plans payload unchanged. |
| `services/lead_gen_service.py` | **PORT + harden** | The crown jewel (1,174 lines of working scraper logic: vertical strategies, job portals, Bing-RSS web discovery, Clearbit/website scoring, public-email finder + ranking, Google Maps, Apollo). Phase 4 splits it into `app/services/leads/` by source, adds per-source timeouts/try-except, partial-success reporting, structured logs. `scrape_linkedin_selenium` ports behind `ENABLE_SELENIUM_SOURCES=false` using distro chromium/chromium-driver (never `webdriver-manager` — arm64). |
| `services/ai_service.py` | **PORT + sharpen** | Per-user key decryption, global fallback, cache, 5 vertical prompt families, deterministic fallback templates — all kept. Phase 4: review prompts (subjects < 60 chars, no spam triggers), replace unbounded in-process `_cache` dict with a bounded/Redis cache, add per-vertical unit tests with a mocked client. Compliance footer (sender identity + unsubscribe link) appended at the send layer. |
| `services/campaign_service.py` | **PORT** | 15-line stats sync; fine as-is, gains the bounced-status fix (audit A4: failed sends never set `LeadStatus.bounced`). |
| `tasks.py` | REWRITE (logic PORTed) | Becomes `app/workers/{celery_app,tasks}.py`. The send/follow-up/lead-gen *logic* ports, but: real Celery worker is now default-on, `time.sleep(60)` between sends is replaced with scheduled/queued pacing, suppression + bounce checks run before every send, idempotency guard on email_logs, IMAP reply matching rewritten (A5), `ENABLE_BACKGROUND_WORKER=false` kept as a local-light synchronous fallback. |
| `verticals.py` | **PORT VERBATIM** | Sacred per the plan: all five vertical configs, plan catalog, entitlements, top-ups, helper functions. Only the `PlanType` import path changes. Pricing numbers are Priyam's Appendix E decision #5. |
| `requirements.txt` | REWRITE | New pinned set: + `argon2-cffi`, `alembic`, `pydantic-settings`, `slowapi`, `pytest`; − `PyJWT[crypto]`-for-Supabase usage (kept for own JWTs), − `webdriver-manager`. |
| `Dockerfile` | REWRITE | Multi-stage, non-root user, arm64-ready, healthcheck, optional chromium layer behind a build arg. |

## 3. Frontend — `frontend/`

The entire frontend is **REWRITE** per the plan (new `apps/web`, Next.js 15 + Tailwind v4 + Part III tokens). Per-file notes on what survives conceptually:

| File | Verdict | What carries over |
|---|---|---|
| `lib/verticals.ts` | **PORT VERBATIM** | Sacred. All five vertical configs (labels, headlines, lead-input labels/placeholders, dashboard copy) move to `apps/web/lib/verticals.ts` unchanged. |
| `app/api/proxy/[...path]/route.ts` | **PORT** | The request spine is explicitly kept. Phase 5 adds an Origin/Host check on mutating requests and retargets to `API_INTERNAL_URL` (Docker network). |
| `lib/api.ts` | REWRITE | Supabase session lookup replaced by the in-memory access token + auto-refresh-once-on-401 (`lib/auth-client.ts`, Phase 3). |
| `lib/auth.tsx`, `lib/supabase.ts`, `lib/supabase-middleware.ts` | DROP | Supabase client code; `@supabase/*` leaves the dependency tree (Phase 3). |
| `middleware.ts` | REWRITE | Soft-gates app routes on refresh-cookie presence; the real check is `/me` (Phase 3). |
| `app/page.tsx` (landing) | REWRITE | **Keep the behavior:** the five-vertical switcher that morphs the hero/showcase (V1's genuinely good interaction), the honest FAQ themes, `?vertical=` propagation into signup CTAs. New: signature element (lead record → mono-typeset drafted email), server-rendered, Part III system (Phase 6). |
| `app/pricing/page.tsx` | REWRITE | Keep: vertical-aware plans payload incl. `entitlements`, Cashfree SDK checkout flow, free-plan activation path, `?payment=success` verify handling. New: server-rendered shell, disabled-safe state, comparison layout (Phase 6). |
| `app/dashboard/page.tsx` | REWRITE | Keep: per-vertical layout *flavors* concept, `missing_setup[]` checklist, stat fields used. All five variants unify visually on the new system (Phase 8). |
| `app/leads/page.tsx` | REWRITE | Keep: vertical-aware generation form driven by config, campaign attach, status filters, preview flow. New: async job progress, drawer with mono preview, bulk actions, cards on mobile (Phase 8, audit A11). |
| `app/campaigns/page.tsx` | REWRITE | Keep: create/edit fields, send-now/pause/resume/delete actions, eligible-leads warning state. New: plan-cap-aware validation (fixes audit A1), detail view, confirm dialogs (Phase 8). |
| `app/analytics/page.tsx` | REWRITE | Keep: KPI/funnel/daily-sends/source-mix/industries data mapping. New: tokens-based SVG charts, date range, CSV export (Phase 8). |
| `app/settings/page.tsx` | REWRITE | Keep: profile + sender identity fields, secrets never echoed (`has_*` booleans), connection status list, vertical switcher. New: switch confirm (audit A10), test-connection actions, security section (Phase 8). |
| `app/login/page.tsx`, `app/signup/page.tsx` | REWRITE | Keep: vertical picker preselected from `?vertical=`, two-step signup→onboard shape, `?next=` handling. Auth calls go to the new FastAPI auth (Phase 7). |
| `app/privacy|terms|acceptable-use/page.tsx` | **PORT (content)** | Honest legal template copy written June 2026 is good; re-skin in the new system, extend per Phase 6 (data sources, secrets handling). Still flagged "review by counsel". |
| `components/Shell.tsx` | REWRITE | Nav structure (Overview / Lead Studio / Campaigns / Analytics / Settings) and plan/quota chip concept survive; implementation is new (Phase 5 app shell). |
| `components/ui/*` (Button, Badge, Card, Container, Eyebrow, Field, Input, Logo, cn) | REWRITE | These are from the superseded redesign and are close in spirit, but V2 uses Tailwind v4 `@theme`, different tokens (`#0E6F5C` teal vs `#c2410c` ember), and a much larger component set (Modal, Drawer, Toast, Table→cards, Skeleton, EmptyState…). Treat as reference only (Phase 5). |
| `components/Reveal.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`, `LegalLayout.tsx` | REWRITE | Patterns survive (reduced-motion-aware reveal, sticky header, footer columns); rebuilt on the new system. |
| `app/globals.css`, `tailwind.config.js` | REWRITE | Tailwind v4 `@theme` with Part III tokens; the dual light/dark legacy layer dies. |
| `app/layout.tsx` | REWRITE | Fonts change to Bricolage Grotesque / Inter / JetBrains Mono via `next/font`; real metadata per page (Phase 6). |
| `next.config.js` | REWRITE | Keep the CSP/security-headers idea; add `output: "standalone"`; drop Supabase/Vercel-specific origins. |
| `package.json` / lockfile | REWRITE | Fresh in `apps/web`; `@supabase/*` removed, Tailwind v4, `motion` (or latest framer-motion) — one of the two, consistently. |
| `vercel.json` | DROP | Vercel is eliminated. |
| `app/icon.svg` | PORT | Until a new mark exists. |
| `tsconfig.json`, `postcss.config.js`, `.env.local.example` | REWRITE | Regenerated for the new app. |

## 4. Known V1 defects the port must fix (from `docs/AUDIT.md`)

Carried as acceptance criteria into the phases noted:

1. **A1** Campaign default `emails_per_day=40` 400-errors on free plans → Phase 4/8.
2. **A2** No unsubscribe/suppression/footer → Phase 4 (compliance is a feature).
3. **A3** Synchronous lead generation blocks HTTP → Phase 4 (Celery job + progress endpoint).
4. **A4** Bounced status never written; bounce rate always 0 → Phase 4.
5. **A5** Reply check flags every inbox sender → Phase 4 (rewrite matching).
6. **A6** `leads_used` is lifetime-only → Phase 4 (atomic, defined quota model).
7. **A8/A9** No loading/error boundaries, silent shell failures, inline error strings → Phase 5 (Toast system, skeletons, error.tsx).
8. **A10** Vertical switch destructive without confirm → Phase 8.
9. **A12** Tokens not in Tailwind → Phase 5 (v4 `@theme`).
10. **A13** Marketing pages client-rendered, no SEO files → Phase 6.
11. **A15** No tests/CI/lint → Phases 2, 11.

Also noted during Phase 0 re-read (not in the original audit):

12. `tasks.py` `_send_batch_impl` sleeps 60 s **inside the request-serving process** in free mode — with the real worker this moves off-thread, but pacing should be queue-scheduled, not `time.sleep`.
13. `payments.create-order` writes the Payment row *after* the Cashfree call; a crash in between orphans the order — make creation transactional in the port.
14. `ai_service._signature()` joins with literal `"\\n"` and relies on `_fallback_email` to undo it — fragile; normalize during port.
15. `email_logs` has no unique constraint preventing double-sends (the plan's idempotency guard covers this).
16. CORS in V1 allows credentials with a regex origin; V2's single-origin + Bearer-token model removes the need.

## 5. API contracts preserved (Part IV of the master plan)

The new frontend and the ported backend must keep these shapes (extend freely, break knowingly):

| Endpoint | Contract |
|---|---|
| `GET /api/auth/me` | profile incl. `vertical`, `plan_name`, `credits`, `sender_*`, `has_gmail_password`, `has_groq_api_key`, `missing_setup[]`, `vertical_config`, `entitlements` |
| `PATCH /api/auth/profile` | partial profile update; vertical change remaps plan/quota/credits |
| `POST /api/auth/onboard` | name, vertical, sender identity, optional secrets → `{message, user}` |
| `GET /api/leads/?page&per_page&status` | `{leads[], total, page, per_page}` |
| `POST /api/leads/generate` | body: `source:"auto"`, query, location, industry, audience, offer, goal, max, campaign_id, vertical → `{status, message, warning?}` (+ V2: `job_id` + `GET /api/leads/generate/{job_id}`) |
| `PATCH /api/leads/{id}` | lead fields incl. `campaign_id`, `status` → lead dict |
| `POST /api/emails/preview` | `{lead_id}` → `{subject, body, to, company}` |
| `GET/POST /api/campaigns/` · `PATCH/DELETE /api/campaigns/{id}` · `POST /api/campaigns/{id}/send-now` | campaign objects carry `total_leads, eligible_leads, total_sent, total_replied, emails_per_day, send_time, follow_up_days, status` |
| `GET /api/analytics/overview` | `total_leads, with_email, ready_to_send, sent, replied, reply_rate, follow_ups, credits_left, leads_used, leads_quota, active_campaigns, campaigns_count, draft_campaigns, daily_sends[{date,count}], sources[{source,count}], industries[{industry,count}], funnel[{stage,count}]` |
| `GET /api/payments/plans?vertical=` | `{vertical, vertical_config, plans[], credits}` |
| `POST /api/payments/create-order` / `POST /api/payments/verify` / webhook | Cashfree flow incl. HMAC-verified webhook |
| `GET /health` | service health (V2: includes db + redis checks) |

## 6. Preserved content & models

- `frontend/lib/verticals.ts` and `backend/verticals.py` — **verbatim**.
- Models User, Lead, Campaign, EmailLog, Payment — ported with Phase 3 auth columns and Phase 4 `unsubscribes` addition.
- Security posture (never weakens): Fernet secret encryption (`enc:` format compatible), Cashfree HMAC webhook verification, security headers, rate limits, strict CORS, tenant-scoped queries on every endpoint.
