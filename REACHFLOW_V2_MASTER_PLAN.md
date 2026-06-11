# ReachFlow V2 — Master Rebuild Plan (for Claude Code)

> **Repo:** https://github.com/Priyam-Dutta-code/reachflow.git
> **Current live (V1, being replaced):** https://reachflow-indol.vercel.app/
> **This document supersedes** any earlier plan file (e.g. `REACHFLOW_REVAMP_PLAN.md`). If both exist in the repo, follow THIS one.

---

## PART I — THE MISSION

ReachFlow V1 is a working multi-vertical AI outreach SaaS (lead discovery → AI-drafted cold emails → campaigns → analytics) built on Vercel + Render + Supabase free tiers. V2 is a ground-up transformation with three non-negotiable outcomes:

1. **Fully self-owned.** Zero Supabase, zero Vercel, zero Render. The entire platform runs from one server Priyam controls, in Docker. It must be portable to any VPS on Earth in under 30 minutes (`git clone` + `.env` + `docker compose up`).
2. **₹0/month to operate.** Oracle Cloud Always Free (always-on VPS) + Cloudflare Free (DNS/CDN/Tunnel) + free tiers of Groq/Gmail/GitHub. The only optional spend is a custom domain (~₹100–900/yr, strongly recommended for credibility — free-subdomain fallback documented below).
3. **Built to sell.** Fast (no cold starts — V1's biggest demo-killer dies here), minimal and clean (V1's dark glassmorphism reads "vibe-coded" — V2 gets a precise light design system), trustworthy (real compliance, honest copy), and instrumented (self-hosted analytics, clear upgrade paths, Cashfree payments live).

**The base idea is sacred.** The five-vertical concept (Job Seekers / Recruiters / Agencies / Business Growth / Partnerships), where the entire product reshapes per vertical, is ReachFlow's differentiator. Keep it. Everything else — infrastructure, auth, frontend, project structure — is rebuilt.

### What "from scratch" means here (read carefully)

- **Rebuilt from scratch:** all infrastructure, all hosting, the entire auth system, the entire frontend (every page, every component, the whole design system), the backend project structure, deployment, CI/CD, ops.
- **Ported and hardened, not blindly rewritten:** the lead-generation scrapers (`services/lead_gen_service.py`), the AI email engine (`services/ai_service.py`), the campaign/send/follow-up logic, the Cashfree payment flow, the verticals configuration (`verticals.py` / `lib/verticals.ts`), and the secret-encryption module (`security.py`). These are battle-tested business logic — the product's crown jewels. Move them into the new structure, add timeouts/tests/resilience, improve prompts — but do not re-derive working scraper logic from zero. Rewriting them would burn days to reach a worse version of what already works.

### Operating protocol for Claude Code — follow strictly

1. **One phase at a time, in order.** Finish a phase, satisfy its "Done when" list, summarise what changed, then stop before the next phase.
2. **Branch per phase** (`v2/phase-N-name`), small logical commits, clear messages. Never push to `main` without Priyam's approval.
3. **Verify, don't assume.** Before marking anything done, actually run it: boot the stack, click the flow, curl the endpoint. After every phase: frontend `npm run build` + `lint` clean, backend imports and boots, `docker compose up` healthy.
4. **HUMAN TASK boxes.** You cannot create Oracle/Cloudflare accounts, buy domains, or complete Cashfree KYC. Tasks marked **[HUMAN: Priyam]** are his; your job is to prepare exact step-by-step instructions, scripts, and configs so each human task takes him minutes.
5. **Surface decisions, don't guess.** Appendix E lists decisions Priyam owns. If one blocks you, present options and wait.
6. **Verify current free-tier terms at execution time.** This plan was written June 2026; Oracle/Cloudflare/Groq terms can drift. Confirm during Phase 1 and flag any changes.

### Global guardrails (apply to every phase, every file)

- **Honesty rule — absolute.** "Built to sell" never means fake. No invented testimonials, fake logos, made-up user counts, or unverifiable stats anywhere. Honest framing only: capabilities ("finds public hiring signals across N sources"), real numbers once they exist, or nothing. This is a credibility product for a job-seeking engineer; one fake metric poisons it.
- **Security never weakens.** Keep/port: encrypted secret storage (`APP_ENCRYPTION_KEY` + `security.py`), Cashfree webhook signature verification, security headers, rate limits, strict CORS, tenant-scoped queries (every query filtered by authenticated `user_id` — no exceptions, ever).
- **No secrets in git.** `.env` files server-side only; commit `.env.example` documentation only. Verify `.gitignore` every phase.
- **Cold-email compliance is a feature.** Working unsubscribe, suppression of unsubscribed/bounced contacts, sender identity in every email, daily send caps. Non-negotiable (Phase 4).
- **ARM64 everywhere.** The server is aarch64. Every Docker image must support linux/arm64 (Postgres, Redis, Node, Python, Caddy, cloudflared, Umami all do). Flag anything that doesn't.
- **₹0 invariant.** No change may introduce a required paid service. If something would, stop and propose a free alternative.

### Definition of EXTRAORDINARY (the acceptance bar)

V2 ships only when ALL of these are true:

- [ ] Marketing pages load fast and score Lighthouse ≥ 95 (performance) / ≥ 95 (accessibility); app pages ≥ 90.
- [ ] Zero cold starts — first request after 12 idle hours responds in < 1s (always-on VPS makes this automatic; verify it).
- [ ] Flawless from 360px phones to 1536px+ desktops. Every table becomes cards on mobile. Tap targets ≥ 44px.
- [ ] Zero console errors on any page. Every button does something real. Every list has loading skeleton + designed empty state. Every API failure shows a friendly message.
- [ ] Signup → first generated leads in under 2 minutes.
- [ ] A stranger can clone the repo and run the entire platform locally with `docker compose up`.
- [ ] Monthly bill: ₹0 (plus optional domain).
- [ ] Not one fabricated number, testimonial, or logo anywhere.

---

## PART II — TARGET ARCHITECTURE ("the sovereign stack")

```
                        ┌─────────────────────────────┐
   Internet ──────────► │  Cloudflare (free)          │
                        │  DNS · CDN · TLS · DDoS     │
                        │  + Cloudflare Tunnel        │
                        └──────────┬──────────────────┘
                                   │ outbound-only tunnel (no open web ports)
                  ┌────────────────▼─────────────────────────────┐
                  │  Oracle Always Free VM (Ubuntu 24.04 arm64)  │
                  │  4 OCPU Ampere · 24 GB RAM · 200 GB          │
                  │                                              │
                  │  docker compose:                             │
                  │   cloudflared ── ingress:                    │
                  │     app.domain /api/payments/webhook → api   │
                  │     app.domain /*                    → web   │
                  │     (optional) stats.domain          → umami │
                  │   web    Next.js 15 (node, standalone)       │
                  │   api    FastAPI + uvicorn  (internal only)  │
                  │   worker Celery worker                       │
                  │   beat   Celery beat (schedules/follow-ups)  │
                  │   db     Postgres 16 (named volume)          │
                  │   redis  Redis 7                             │
                  │   umami  self-hosted analytics (optional)    │
                  │   kuma   Uptime Kuma (optional, internal)    │
                  │   backup nightly pg_dump + offsite rclone    │
                  └──────────────────────────────────────────────┘
```

**Request spine (kept from V1 — it's good):** browser → Next.js route handler proxy (`/api/proxy/[...path]`) → FastAPI over the internal Docker network. The API is **never publicly exposed** except one tunnel ingress rule for the Cashfree webhook path. This is simpler AND more secure than V1.

**Replacements map:**

| V1 (leaving) | V2 (self-owned) |
|---|---|
| Vercel (frontend hosting) | Next.js standalone in Docker on the VPS |
| Render (API hosting, cold starts) | FastAPI in Docker, always on |
| Supabase Auth | Custom FastAPI auth (argon2id + JWT + rotating refresh sessions) — Phase 3 |
| Supabase Postgres | Postgres 16 container + Alembic migrations |
| No worker (free-tier limitation) | Celery worker + beat, finally enabled properly (Redis is now free/local) |
| Vercel Analytics / none | Self-hosted Umami |
| — | Nightly backups + offsite copy, Uptime Kuma, deploy script, CI/CD |

### Cost truth table

| Item | Cost | Notes |
|---|---|---|
| Oracle Always Free VM | ₹0 forever | Card needed at signup for identity verification (~$1 temporary hold, refunded). |
| Cloudflare Free (DNS, CDN, Tunnel, TLS) | ₹0 | |
| Domain (e.g. reachflow.in) | ~₹100–900/yr | **The one recommended spend.** Free fallback: a free subdomain (DuckDNS/afraid.org) or temporary `*.trycloudflare.com` — fine for dev, weak for selling. |
| Groq API (AI drafting) | ₹0 tier | Already V1's design; users can bring their own key (kept). |
| Gmail SMTP (auth emails + user sending) | ₹0 | ~500/day limit per account; users connect their own Gmail app password for campaign sends (V1 design, kept). |
| GitHub (repo, Actions CI, public) | ₹0 | |
| Cashfree | ₹0 fixed | Transaction fees only when revenue happens — aligned with "sells". Requires KYC **[HUMAN]**. |
| Umami, Uptime Kuma, Caddy, Postgres, Redis | ₹0 | Self-hosted open source. |
| **Total fixed monthly** | **₹0** | |

### Known risks & mitigations (be upfront)

- **Oracle ARM "Out of capacity"** in busy regions at instance creation. Mitigations: pick home region carefully (it's locked forever — prefer a multi-AD region; Mumbai/Hyderabad for latency vs. larger regions for availability — Priyam's call), retry across availability domains, or script periodic retries. Upgrading the account to Pay-As-You-Go (still ₹0 if you stay within Always Free shapes) significantly improves capacity access **and** removes idle-reclamation risk — recommended once stable.
- **Idle reclamation:** Oracle can reclaim Always Free instances with very low utilization. Mitigations: a real running app + monitoring keeps baseline activity; PAYG upgrade removes the policy entirely.
- **Single-VPS = single point of failure:** accepted at this stage. Mitigations: nightly DB backups with offsite copy + the 30-minute portability invariant (tested in Phase 13). When revenue justifies it, the same compose file moves to a paid VPS unchanged.
- **ARM64 friction:** all chosen images support arm64. Selenium/Chromium on arm64 works via the distro `chromium` + `chromium-driver` packages (do NOT rely on `webdriver-manager` downloading x86 binaries). The `linkedin_selenium` source becomes optional behind an env flag, off by default — the requests-based sources are primary.
- **Gmail 500/day:** fine for launch scale; per-user Gmail credentials (existing design) distribute the load. Document upgrade paths (user-provided SMTP) for later.

---

## PART III — DESIGN DIRECTION (the new face)

V1's look — dark, heavy glassmorphism, multi-color gradients, glow borders, 24–30px blob radii — is exactly the "AI-default dark + neon accent" aesthetic. V2 goes the opposite way and commits fully: **light, precise, quiet, confident.** Reference register: Linear's discipline, Stripe's clarity — but with ReachFlow's own identity, not a clone.

### Tokens (single source of truth — implement as CSS variables via Tailwind v4 `@theme`)

```css
--color-bg:            #FAFAF7;   /* warm paper, not clinical white */
--color-surface:       #FFFFFF;
--color-ink:           #121915;   /* near-black with a green undertone */
--color-ink-soft:      #3E4A45;
--color-muted:         #6B7672;
--color-line:          #E6E4DD;   /* hairline borders do the structural work */
--color-accent:        #0E6F5C;   /* deep teal — matured from V1's brand teal */
--color-accent-strong: #0A5747;
--color-accent-tint:   #E9F3EF;
--color-success:       #067647;  --color-success-bg: #ECFDF3;
--color-warning:       #B54708;  --color-warning-bg: #FFFAEB;
--color-danger:        #B42318;  --color-danger-bg:  #FEF3F2;
```

Rules: ONE accent color, used sparingly (primary buttons, links, active states, small highlights). Tinted backgrounds only for status. Borders over shadows — shadows reserved for popovers/modals only. Radii: 6px (badges/small), 10px (buttons/inputs), 14px (cards). **Nothing rounder than 16px** — the blobby radius is what made V1 feel templated.

### Typography

- **Display:** Bricolage Grotesque (600/700) — characterful, modern, not yet an AI cliché.
- **Body/UI:** Inter (400/500/600).
- **Mono:** JetBrains Mono — for email previews, lead data, and code-like surfaces.
- All loaded via `next/font` (self-hosted at build — zero external font requests; fits the sovereignty theme).
- Scale: 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48–56 (hero). Tight tracking on display sizes only. Generous line-height on body (1.6+).

### The signature element

**"The product is the hero."** Marketing pages never show abstract decoration — they show the actual artifact ReachFlow produces: a real-shaped lead record flowing into a **mono-typeset drafted email** (rendered like a clean plain-text letter, JetBrains Mono, hairline border). The hero composition morphs live as the visitor switches verticals (the V1 vertical-switcher interaction was genuinely good — keep the behavior, restyle it completely). This mono-email motif repeats through the whole product (Lead Studio previews, campaign views), making marketing and app feel like one object. Everything around the signature stays quiet.

### Motion

Micro-interactions 150–200ms ease-out. One orchestrated hero entrance. Scroll reveals subtle (8–12px rise, once). `prefers-reduced-motion` fully respected. Use `motion` (the framer-motion successor) or framer-motion latest — either is fine; pick one and be consistent. **When in doubt, less motion.**

### Copy voice

Plain verbs, sentence case, specific over clever. Name what the user controls ("Generate leads", "Connect Gmail"), never internals. No hype vocabulary (no "revolutionary/supercharge/unleash"). Errors say what happened and what to do next. Buttons say what they do ("Save changes", not "Submit"). Starting hero copy (refine within voice): **"Find the right inboxes. Send emails that get answered."** — sub: one sentence naming the five workflows.

### Layout & responsiveness

4px spacing base. Content max-width ~1152px (max-w-6xl) marketing, full-width-with-padding app. Sections: 96–128px vertical desktop, 56–72px mobile. Mobile-first: every layout designed at 360px first, enhanced upward. Breakpoint QA matrix: 360 / 390 / 768 / 1024 / 1280 / 1536.

---

## PART IV — WHAT TO PRESERVE (contracts & content)

**Preserve these API contracts** (the new frontend and ported backend must keep these shapes so the port is verifiable — extend freely, break knowingly):

- `GET /api/auth/me` → profile incl. `vertical`, `plan_name`, `credits`, `sender_*`, `has_gmail_password`, `has_groq_api_key`, `missing_setup[]`, `vertical_config`
- `PATCH /api/auth/profile`, `POST /api/auth/onboard`
- `GET /api/leads/?page&per_page&status` → `{leads[], total}`; `POST /api/leads/generate` (body: source:"auto", query, location, industry, audience, offer, goal, max, campaign_id, vertical) → `{status, message, warning?}`; `PATCH /api/leads/{id}`
- `POST /api/emails/preview` (lead_id) → `{subject, body, to, company}`
- `GET/POST /api/campaigns/`, `PATCH/DELETE /api/campaigns/{id}`, `POST /api/campaigns/{id}/send-now` — campaign objects carry `total_leads, eligible_leads, total_sent, total_replied, emails_per_day, send_time, follow_up_days, status`
- `GET /api/analytics/overview` → `total_leads, with_email, ready_to_send, sent, replied, reply_rate, follow_ups, credits_left, leads_used, leads_quota, active_campaigns, campaigns_count, draft_campaigns, daily_sends[{date,count}], sources[{source,count}], industries[{industry,count}], funnel[{stage,count}]`
- `GET /api/payments/plans?vertical=`, `POST /api/payments/create-order`, `POST /api/payments/verify`, webhook endpoint
- `GET /health`

**Preserve this content:** `frontend/lib/verticals.ts` and `backend/verticals.py` (all five vertical configs — labels, headlines, lead-input labels/placeholders, dashboard copy). Port verbatim into V2; the copy is good and the whole product depends on it.

**Preserve these models** (SQLAlchemy in `database.py`): User, Lead, Campaign, EmailLog, Payment — with the auth-related additions in Phase 3 and an Unsubscribe/suppression addition in Phase 4.

---

# THE PHASES

## PHASE 0 — Salvage audit & repo restructure

**Goal:** total understanding + a clean V2 skeleton.

- [ ] Read everything: both READMEs, `DEPLOY.md`, `docker-compose.yml`, `nginx/`, `render.yaml`, `start.py`, all of `backend/` (main, config, database, security, tasks, verticals, routers/*, services/*), all of `frontend/` (every page, components, lib, middleware, proxy route, configs).
- [ ] Write `docs/SALVAGE_MAP.md`: for every existing file — PORT (move + harden), REWRITE (new from scratch), or DROP (with reason). Include the API contract table from Part IV.
- [ ] Restructure the repo:
  ```
  apps/web/        # Next.js 15 (new)
  apps/api/        # FastAPI (new layout; ported services live inside)
  infra/           # compose files, Caddy/cloudflared config, deploy + server scripts
  docs/            # SALVAGE_MAP, RUNBOOK, DESIGN_SYSTEM, API, DECISIONS
  .github/workflows/
  compose.dev.yml  # full local stack
  compose.prod.yml
  .env.example     # every variable documented (see Appendix B)
  ```
- [ ] Keep V1 code reachable under a `v1/` tag or branch for reference during porting. Don't delete history.
- [ ] `compose.dev.yml` boots db + redis + api stub + web stub locally with healthchecks.

**Done when:** SALVAGE_MAP exists, the skeleton boots locally via `docker compose -f compose.dev.yml up`, and you present the salvage decisions for approval.

## PHASE 1 — Server & edge foundation

**Goal:** a hardened, free, always-on server reachable through Cloudflare, serving a hello-world stack over HTTPS.

**[HUMAN: Priyam] — Claude Code prepares an exact click-by-click runbook (`docs/SETUP_ORACLE.md`, `docs/SETUP_CLOUDFLARE.md`) for these:**
- [ ] Create Oracle Cloud account (card verification, ~$1 hold). Choose home region deliberately — it's permanent. Create **VM.Standard.A1.Flex, 4 OCPU / 24 GB, Ubuntu 24.04 Minimal aarch64**, paste SSH public key. If "Out of capacity": retry other ADs / times, or use the retry script Claude Code provides. Consider PAYG upgrade once stable (stays ₹0 within Always Free; removes reclamation + capacity pain).
- [ ] Buy domain (recommended; see cost table) or pick free-subdomain fallback. Create Cloudflare account, add domain, set nameservers.
- [ ] Create a Cloudflare Tunnel (Zero Trust → Tunnels), note the token for the `cloudflared` container.
- [ ] (Later, Phase 5) Cashfree KYC.

**Claude Code tasks:**
- [ ] Write `infra/server-setup.sh` (idempotent): create non-root sudo user, SSH key-only auth, disable root/password login, ufw (allow 22 only — web traffic enters via outbound tunnel, **no open 80/443 needed**), fail2ban, unattended-upgrades, Docker Engine + compose plugin, log rotation, timezone.
- [ ] `cloudflared` service in compose with ingress rules: `app.<domain>` path `/api/payments/webhook*` → `api:8000`; `app.<domain>` everything else → `web:3000`; optional `stats.<domain>` → `umami:3000`. Document the equivalent reverse-proxy-with-origin-cert setup (Caddy) in `docs/` as the portability fallback for non-Cloudflare hosts.
- [ ] Deploy hello-world web + `/health` api through the tunnel. Verify HTTPS, headers, and that the api is unreachable except the webhook path.
- [ ] `infra/deploy.sh`: `git pull → docker compose -f compose.prod.yml build → run migrations → up -d → health-verify`, with a documented rollback (checkout previous tag + redeploy + restore note).

**Done when:** `https://app.<domain>` serves the stack over Cloudflare with zero open web ports, server hardening checklist passes, and deploy.sh round-trips a trivial change.

## PHASE 2 — Backend core rebuild

**Goal:** a clean FastAPI foundation the engines will be ported into.

- [ ] New layout: `apps/api/app/{main.py, core/{settings,security,logging,rate_limit}.py, db/{base,session,models/}, schemas/, api/routers/, services/, workers/{celery_app,tasks}.py}` with `pydantic-settings` for all config (env-driven, validated at boot).
- [ ] Postgres 16 + **Alembic from day one** (initial migration generated from ported models; `Base.metadata.create_all` allowed in tests only).
- [ ] Port models (User, Lead, Campaign, EmailLog, Payment) + enums; User keeps String UUID PKs (server-generated `uuid4().hex`), gains `password_hash`, `email_verified_at`. Add indexes used by hot queries (user_id+status on leads, user_id+sent_at on email_logs).
- [ ] Port `security.py` secret encryption unchanged in behavior; add startup check that `APP_ENCRYPTION_KEY` is set.
- [ ] Structured JSON logging (request id, user id, route, latency, no secrets/PII), global exception handler (sanitized 500s), `/health` with db+redis checks, gzip, strict security headers, CORS locked to the app origin.
- [ ] Rate limiting middleware (Redis-backed, e.g. slowapi): defaults + stricter buckets reserved for auth/generate/preview/checkout.
- [ ] Celery app + beat wired (worker runs; a demo task proves the loop). `ENABLE_BACKGROUND_WORKER` flag kept for local-light mode, default **true** in prod.
- [ ] Pytest scaffold + first tests (settings, health, model round-trip via test db).

**Done when:** api boots in compose with migrations applied, health is green, logs are structured, tests pass in CI-able form.

## PHASE 3 — Auth from scratch (Supabase fully removed)

**Goal:** secure, boring, self-owned auth.

**Spec:**
- [ ] Passwords: **argon2id** (`argon2-cffi`). Policy: min 8 chars; check against a small common-password list.
- [ ] Tokens: access JWT (HS256, `JWT_SECRET`, 15 min, claims: sub/email/jti/iat/exp) returned in JSON and held **in memory** client-side; refresh token = opaque 256-bit random, stored as **httpOnly Secure SameSite=Lax cookie**, server keeps only its SHA-256 hash in an `auth_sessions` table (id, user_id, token_hash, user_agent, ip, created/last_used/expires/revoked). **Rotation on every refresh; reuse of a rotated token revokes the whole session family.** This split means API calls authenticate via Bearer header (no CSRF surface) and only `/api/auth/refresh|logout` use the cookie (protected by SameSite=Lax + Origin check in the Next proxy).
- [ ] Endpoints: `register`, `login`, `refresh`, `logout`, `logout-all`, `verify-email` + `resend`, `forgot-password`, `reset-password`, `change-password`, `me` (existing contract), `onboard`, `profile`.
- [ ] One-time tokens (verify/reset): random 32-byte, store hash + purpose + expiry + used_at in `one_time_tokens`; single-use; 30–60 min expiry.
- [ ] Auth emails via SMTP (Gmail app password, env-configured): verification, reset, password-changed notice. Clean plain-text-first templates (on-brand: mono aesthetic).
- [ ] **Email verification gates sending, not exploring.** Unverified users can tour the app and generate a small sample; campaign sends require verification. (Conversion-friendly, abuse-resistant.)
- [ ] Rate limits: login 5/min/IP+email with backoff; register 3/hr/IP; reset 3/hr/identifier.
- [ ] Frontend: delete `@supabase/*`; new `lib/auth-client.ts` (login/register/refresh/logout, in-memory access token, auto-refresh on 401 once) + `AuthProvider`; rewrite `lib/api.ts` to attach Bearer; Next `middleware.ts` soft-gates app routes on refresh-cookie presence (real check = `/me`).
- [ ] Tests: register/login/refresh-rotation/reuse-revocation, reset flow, rate limits, `me` scoping.
- [ ] Optional (Appendix E): "Continue with Google" via plain OAuth code flow in FastAPI — free, conversion-positive; build only if Priyam opts in.

**Done when:** full auth lifecycle works in the browser against the compose stack, Supabase is absent from the dependency tree, tests pass.

## PHASE 4 — Engines ported & hardened (leads, AI, campaigns, email, compliance)

**Goal:** the product's core, now reliable and legal.

- [ ] Port `lead_gen_service` into `apps/api/app/services/leads/` split by source (maps, web, jobs boards, apollo). Every source: explicit timeouts, per-source try/except, partial-success results (`found 18/40; X returned nothing`), structured logs. `linkedin_selenium` behind `ENABLE_SELENIUM_SOURCES=false` default; if enabled, use distro `chromium`+`chromium-driver` (arm64) — never webdriver-manager downloads.
- [ ] Run generation as a **Celery job** (worker exists now): POST `/leads/generate` enqueues and returns a job id; add `GET /leads/generate/{job_id}` for status/progress; keep a synchronous fallback path for `ENABLE_BACKGROUND_WORKER=false`.
- [ ] Quotas/credits enforced **server-side and atomically** (single UPDATE with guard or SELECT…FOR UPDATE); never negative; clear 402-style error payload the UI can turn into an upgrade prompt.
- [ ] Port `ai_service` (Groq drafting): keep per-user key decryption + global fallback + cache; review and sharpen the five vertical prompt families (use sender_profile + lead context; subjects < 60 chars; no spam-trigger words; plain text). Add a unit test per vertical with a mocked client asserting structure.
- [ ] Campaign engine: port send-now + scheduled sends + follow-ups (beat schedules respecting `send_time`, `emails_per_day`, `follow_up_days`). Idempotency: a lead never receives the same campaign email twice (unique guard on email_logs), retries with backoff, accurate statuses.
- [ ] **Compliance (required):** `unsubscribes` suppression table; HMAC-signed unsubscribe token per send; footer in every outbound email = sender identity + unsubscribe link; public unsubscribe page (web) → api flags lead `unsubscribed` + adds suppression; send pipeline checks suppression + bounced before every send. Per-plan daily caps enforced.
- [ ] Payments: port Cashfree (create-order, verify, **signature-verified webhook**, plans/entitlements per vertical). All plan gates (campaign slots, daily caps, follow-up automation) enforced server-side. Disabled-safe without creds (clear "payments not configured" state).
- [ ] Tests: quota atomicity, suppression honored, idempotent send, webhook signature accept/reject, generate-job happy path with mocked network.

**Done when:** in the compose stack a real run works end-to-end — generate (async w/ progress) → preview → assign → send (or a clear "connect Gmail" state) → logs/analytics update — and an unsubscribe link actually suppresses.

## PHASE 5 — Frontend foundation (new app, new system)

**Goal:** the design system and component library everything visible is built from.

- [ ] Fresh `apps/web`: Next.js 15 (App Router; bump to latest stable if trivial), **Tailwind v4** with Part III tokens in `@theme`, fonts via `next/font` (Bricolage Grotesque / Inter / JetBrains Mono), `output: "standalone"` for the Docker image.
- [ ] Port the proxy route (`/api/proxy/[...path]`) + add Origin/Host check on mutating requests; port `lib/verticals.ts` verbatim.
- [ ] Build `components/ui/` (typed, accessible, consistent): Button (primary/secondary/ghost/danger; sizes; loading; icon), Input/Textarea/Select/Field+Label+Error, Card, Badge/StatusPill (one status→style map for lead+campaign states), Tabs, Modal + Drawer (focus-trapped, esc, scroll-lock), **Toast system** (replaces V1's inline error strings everywhere), Tooltip, Skeleton (text/card/row), EmptyState (icon/title/desc/action), Table that **collapses to cards < md**, Stat tile, ProgressMeter (quotas), PageHeader, ConfirmDialog (destructive actions).
- [ ] App shell: light top-bar + left sidebar on desktop, top-bar + slide-over drawer on mobile (Overview / Lead Studio / Campaigns / Analytics / Settings + plan/quota chip + account menu). Quiet, dense, fast.
- [ ] Dev-only `/_kitchen-sink` page rendering every component/state for visual QA.
- [ ] `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` designed, plus per-segment error boundaries.
- [ ] `docs/DESIGN_SYSTEM.md`: tokens, type scale, spacing, component usage rules, do/don't examples.

**Done when:** kitchen-sink shows a coherent, precise system; shell works 360px→desktop; build clean.

## PHASE 6 — Marketing site that sells

**Goal:** a stranger understands ReachFlow in 10 seconds and trusts it enough to try.

- [ ] **Landing** (`/`, server-rendered): nav (logo, Pricing, Log in, Start free) → hero with the **signature element** (lead-record → mono drafted email, morphing with the five-vertical switcher — keep V1's interaction concept, fully restyled) → "How it works" (3 real steps with real UI) → honest capabilities ("Why ReachFlow": multi-vertical reshaping, one-click sourced generation across named public sources, vertical-aware drafting, full discover→send→track loop, your own Gmail = your deliverability) → FAQ (data sources, do I need my own keys, deliverability, compliance, pricing) → final CTA → footer (product links, legal, contact). **Zero fabricated proof.**
- [ ] **Per-vertical SEO landers** `/for/job-seekers|recruiters|agencies|business-growth|partnerships` — generated from the verticals config (unique title/description/H1/copy/CTA per page). Five honest, fast pages targeting "cold email tool for X" — the free acquisition engine.
- [ ] **Pricing** `/pricing`: vertical-aware (existing plans payload incl. `entitlements`), clean comparison, monthly quota/caps/slots explicit, Free plan prominent, credit top-up section, FAQ snippet. Wired to real checkout (Phase 4) and disabled-safe.
- [ ] **Legal:** `/privacy`, `/terms`, `/acceptable-use` — real content covering data sources, user responsibilities for compliant outreach, secrets handling. Mark in docs: templates for Priyam to review, not legal advice.
- [ ] `/changelog` (simple, markdown-fed) — signals a living product.
- [ ] SEO/meta: per-page metadata, OG/Twitter cards with a designed OG image, `sitemap.xml`, `robots.txt`, canonical URLs, JSON-LD (SoftwareApplication + FAQPage).

**Done when:** landing + 5 verticals + pricing + legal are live in the stack, Lighthouse ≥95/95 on landing mobile, every CTA routes correctly.

## PHASE 7 — Auth UX, onboarding & public demo

**Goal:** from stranger → exploring user in minutes; from visitor → believer without signup.

- [ ] **Signup**: vertical picker (cards, preselected from `?vertical=`) + name/email/password, inline validation, password toggle, friendly errors. **Login**: + forgot-password link, `?next=` preserved. **Verify/reset** pages matching the system.
- [ ] **Onboarding** (post-signup, resumable, skippable): 1) confirm vertical → 2) sender identity (name/role/profile blurb that powers drafts) → 3) optional Gmail app password + Groq key with "do this later" → 4) guided **first lead run** (prefilled per vertical) landing them on results. Target: signup → first leads **< 2 minutes**.
- [ ] First-run dashboard checklist (driven by existing `missing_setup[]`) until setup complete.
- [ ] **`/demo`** — public, no signup: the real app UI rendered from static, clearly-labeled sample fixtures (sample leads/campaign/analytics per vertical); mutations show a toast "Demo data — start free to run this live" + CTA. Banner marks it a demo. This is the link for recruiters, customers, and Priyam's portfolio.

**Done when:** a fresh user reaches generated leads in <2 min; `/demo` lets anyone feel the product instantly with zero setup; all auth screens handle every error state.

## PHASE 8 — App rebuild (the five surfaces)

**Goal:** every product screen rebuilt on the new system, mobile-perfect, data-accurate.

- [ ] **Dashboard**: PageHeader + vertical title/summary (config), Stat tiles from real `/analytics/overview` fields, quota ProgressMeter + contextual upgrade CTA, recent activity (latest leads/sends/replies), quick actions per vertical, mini trend linking to Analytics, first-run checklist state. Keep the five per-vertical layout flavors conceptually; unify visually.
- [ ] **Lead Studio**: generation panel (vertical-aware labels/placeholders from config; campaign attach; count; "uses N credits" preview) → async job progress UI (status endpoint) with partial-results messaging → results table (name/company/title/email/source-badge/status/location; sortable; server pagination; **cards on mobile**) → filters (status + search + source) → lead drawer with mono email preview (subject/body, copy button) → bulk select (assign / status / delete w/ ConfirmDialog) → designed empty state = guided first run.
- [ ] **Campaigns**: list with status/counters/progress; create-edit modal (name, description, emails_per_day within plan cap, send_time, follow_up_days, validation); detail view (assigned leads + per-lead status + previews); send-now with explicit confirm and result toast; pause/resume/complete; "no eligible leads" and "connect Gmail to send" states; follow-up visibility.
- [ ] **Analytics**: KPI row; **funnel** (leads→sent→replied) visual; daily-sends trend (lightweight chart — Recharts or hand-rolled SVG bars on tokens; no heavy lib); source mix + industries with proportion bars; date-range filter; **CSV export** (leads + email log); reconciles with dashboard numbers; empty + skeleton states.
- [ ] **Settings**: profile + sender identity; vertical switcher (with "this reshapes your workspace" confirm); integrations (Gmail/Groq: encrypted, never echoed, connected-status, **test connection** action); plan & usage + payment history + manage; security (change password, sign out everywhere, gated delete-account with cascade); about/version.
- [ ] Every page passes Appendix D before it counts as done.

**Done when:** all five surfaces work end-to-end against real data in compose, on phone and desktop, with zero console errors.

## PHASE 9 — Growth & monetization wiring

**Goal:** the "sells" layer.

- [ ] **Umami** self-hosted (own db in the same Postgres): pageviews + events (signup, onboarding steps, first-generate, preview, send, checkout-start, upgrade). Dashboard reachable at `stats.<domain>` (auth-protected).
- [ ] Contextual **upgrade moments**: quota meter at 80%/100%, generate-blocked state, campaign-slot/daily-cap walls — each with a specific, honest pitch + one-click path to pricing/checkout. Never dark-patterned.
- [ ] In-app **feedback widget** (one textarea → emails Priyam + logs row). Footer "Contact" mailto.
- [ ] Email capture on marketing (optional newsletter row → simple table; no third-party ESP).
- [ ] **Dogfood task:** document (docs/PLAYBOOK.md) how Priyam runs ReachFlow's own first acquisition campaign *through ReachFlow* — finds agencies/recruiters, sends honest outreach. Best QA and best proof.

**Done when:** funnel events visible in Umami, every quota wall converts gracefully, feedback round-trips.

## PHASE 10 — Quality bar (perf, a11y, responsive, security)

- [ ] Performance: code-split heavy client islands, lazy below-the-fold, `next/image`, font subset check, bundle audit, compression at the edge (Cloudflare) + gzip at app. Hit the Lighthouse targets in Part I.
- [ ] Accessibility: landmarks, labels on every control, visible focus rings, full keyboard nav (modals/drawers trap+restore), contrast ≥ 4.5:1 on the light theme, reduced-motion, alt text. Run axe; fix to zero critical.
- [ ] Responsive sweep at the six widths on every page; tables→cards verified; no horizontal scroll; ≥44px taps; iOS Safari sanity (inputs, 100dvh, sticky).
- [ ] Security review: headers (incl. a sane CSP for web), rate limits live, CORS strict, cookies (httpOnly/Secure/SameSite) verified, Origin checks on proxy mutations, webhook signature tested with bad input, tenant-scoping spot-audited across endpoints, dependency audit (`npm audit` / `pip-audit`) triaged.

**Done when:** the Extraordinary bar's measurable items pass with evidence (scores, screenshots) attached to the phase summary.

## PHASE 11 — CI/CD, backups, monitoring, runbook

- [ ] GitHub Actions: PR pipeline (web: lint+tsc+build; api: ruff+pytest) and main pipeline → SSH deploy via `infra/deploy.sh` (manual-approval environment on prod).
- [ ] Backups: nightly `pg_dump | gzip` (db + umami), keep 14 local; **offsite** via rclone to a free remote (Cloudflare R2 10GB free or Google Drive), encrypted. `backup-now.sh` + a **tested `restore.sh`** (restore drill executed once and documented — an untested backup is a wish).
- [ ] Monitoring: Uptime Kuma internal checks (web, api health, db, redis, worker heartbeat) + **one external free monitor** (e.g. UptimeRobot free) on `https://app.<domain>/health-edge` with email alert — external because Kuma dies with the box. Disk/RAM alert via simple cron threshold script → email.
- [ ] Log rotation for Docker; `docs/RUNBOOK.md`: deploy, rollback, logs, db shell, backup/restore, rotate JWT_SECRET / APP_ENCRYPTION_KEY (with re-encryption note), renew Cloudflare tunnel, "server died" recovery = the 30-minute portability procedure.

**Done when:** a PR flows test→deploy→healthy automatically; a restore drill has actually been performed; an external alert fires when the app is downed on purpose.

## PHASE 12 — Migration & cutover

- [ ] Export from Supabase (it's Postgres): users (profiles), leads, campaigns, email_logs, payments → import scripts into V2 schema (IDs preserved). Passwords: **not migrated** — on first V2 login, "We've upgraded — set a new password" reset-flow email path. (If real user count is ~0–handful, fresh start is acceptable — Priyam decides, Appendix E.)
- [ ] Parallel-run V2 on the real domain while V1 stays up; full Appendix D sweep on production; then point any old links/README at the new domain; set the Vercel project to a redirect page or take it down; decommission Render/Supabase **after** a final export + 2 weeks of stable V2.
- [ ] **Portability drill:** on a throwaway machine/VM, prove `git clone + .env + compose up + restore backup` < 30 min. Record it in the runbook.

**Done when:** V2 is the only public ReachFlow, old infra is archived/exported, portability is proven.

## PHASE 13 — Polish, docs & launch

- [ ] README rewrite: one-paragraph pitch, real screenshots, architecture diagram, "runs anywhere for ₹0" story, full local setup, env table link, scripts. This README is also a hiring artifact — make it excellent.
- [ ] `docs/` complete: DESIGN_SYSTEM, API, RUNBOOK, SALVAGE_MAP, PLAYBOOK, DECISIONS log.
- [ ] Final Extraordinary-bar audit (Part I checklist) with evidence.
- [ ] Launch playbook for Priyam (Appendix F) ready: demo link, vertical landers, communities, dogfood campaign.

---

## APPENDIX A — Human tasks summary (Priyam)

1. Oracle account + ARM VM (Phase 1; card verification ~$1 hold; pick home region permanently; PAYG upgrade recommended later).
2. Domain purchase (or accept free-subdomain tradeoff) + Cloudflare account + nameservers + Tunnel token.
3. Cashfree KYC/credentials (Phase 4/5 payments live).
4. Gmail account + app password for system auth emails.
5. Groq API key (free tier) for the global fallback.
6. Decisions in Appendix E.
7. Review legal page templates.

## APPENDIX B — Environment variables (document all in `.env.example`)

`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `ACCESS_TOKEN_MINUTES=15`, `REFRESH_TOKEN_DAYS=30`, `SMTP_HOST/PORT/USER/PASSWORD` (auth emails), `MAIL_FROM`, `GROQ_API_KEY`, `GOOGLE_MAPS_API_KEY?`, `APOLLO_API_KEY?`, `ENABLE_SELENIUM_SOURCES=false`, `ENABLE_BACKGROUND_WORKER=true`, `CASHFREE_APP_ID/SECRET/ENV/WEBHOOK_SECRET`, `APP_URL=https://app.<domain>`, `NEXT_PUBLIC_APP_URL`, `API_INTERNAL_URL=http://api:8000`, `UMAMI_*?`, `BACKUP_REMOTE?`, `ALERT_EMAIL`.

## APPENDIX C — Runbook quick commands (flesh out in docs/RUNBOOK.md)

deploy `./infra/deploy.sh` · logs `docker compose -f compose.prod.yml logs -f api` · db shell `docker compose exec db psql -U reachflow` · migrate `docker compose exec api alembic upgrade head` · backup `./infra/backup-now.sh` · restore `./infra/restore.sh <file>` · worker health `docker compose exec worker celery -A app.workers.celery_app inspect ping`.

## APPENDIX D — Per-screen acceptance checklist (every page, before "done")

No console errors/CLS · skeleton + designed empty state · friendly error handling (toast, never blank) · correct at 360/390/768/1024/1280/1536 · all actions real, primary action obvious · keyboard navigable, visible focus, modal focus-trap · built from `components/ui` + tokens only · zero fabricated data · tenant-scoped, accurate data · ≥44px taps.

## APPENDIX E — Decisions Priyam owns (answer early; defaults in bold)

1. Domain name + buy vs free subdomain (**buy a cheap .in/.com**).
2. Oracle home region: Mumbai/Hyderabad latency vs larger-region capacity (**Mumbai, retry; PAYG if scarce**).
3. "Continue with Google" OAuth (**later**, after launch).
4. Dark mode (**later**; light-only first).
5. Pricing numbers per plan/vertical (current backend values vs revised).
6. Migrate V1 users vs fresh start (**fresh start if <10 real users**).
7. Founder byline on site ("built by…") (**README yes, product footer optional**).
8. Chart approach: Recharts vs hand-rolled SVG (**hand-rolled on tokens** — lighter).
9. Keep selenium/LinkedIn source available behind flag (**yes, off by default**).

## APPENDIX F — First-customers playbook (post-launch, for Priyam — not Claude Code)

Dogfood: run ReachFlow's own outreach through ReachFlow (agencies + recruiters verticals are the natural first buyers). Share `/demo` everywhere the verticals live (recruiting/agency communities, relevant subreddits/Discords — honestly, as the builder). The five `/for/*` pages are the SEO engine — keep them sharp. Put the demo link in your job applications too: the product now sells itself *and* you. Collect every reply into the changelog/testimonials **only when real and permissioned**.

---

### Kickoff instruction for Claude Code

> Read `REACHFLOW_V2_MASTER_PLAN.md` fully. Execute Phase 0 now: read the entire existing codebase, produce `docs/SALVAGE_MAP.md` and the new repo skeleton on branch `v2/phase-0-foundation`, verify `compose.dev.yml` boots, then stop and present your salvage decisions and top findings before Phase 1.
