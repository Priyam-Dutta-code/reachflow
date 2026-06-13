# ReachFlow — Phase 0 Baseline Audit

> Static + boot-level audit performed during Phase 0. A full click-through against live data
> still requires real credentials (see "Local run status"). Findings below come from a complete
> read of the codebase, a clean frontend production build, and a successful backend boot.

## Local run status

| Check | Result |
|---|---|
| `npm install` (frontend) | ✅ clean |
| `npm run build` (frontend) | ✅ **passes**, TypeScript types valid, 13 routes, ~200 kB First Load JS on app pages |
| `npm run lint` (frontend) | ⚠️ **not configured** — no ESLint config; `next lint` drops into an interactive setup prompt (no baseline lint) |
| Backend `py_compile` (all files) | ✅ clean |
| Backend pip install (venv) | ✅ clean |
| Backend app import/boot | ✅ boots; all 19 `/api/*` routes register (tested against temp SQLite) |
| Full UI click-through | ⏸️ **blocked** — needs a live Supabase project + DATABASE_URL (Postgres) + a Groq key for lead-gen/preview. Documented below. |

**To do a real end-to-end run, you need:** a Supabase project (URL + publishable key + JWT/JWKS, DB connection string),
`APP_ENCRYPTION_KEY`, and a `GROQ_API_KEY` (for email previews). Google Maps/Apollo/Cashfree/Gmail are optional.
Frontend `.env.local` and backend `.env` were created from the examples (placeholders) for the build only.

## Architecture summary

**Shape:** multi-tenant, vertical-aware outbound SaaS. Next.js 15 (App Router) frontend on Vercel →
Next proxy route → FastAPI on Render → Supabase Postgres + Supabase Auth. Optional Celery/Redis worker.

- **Request spine:** Supabase session → `apiFetch` attaches Bearer → `/api/proxy/[...path]` forwards to
  `NEXT_PUBLIC_API_URL` → FastAPI `get_current_user` verifies the Supabase JWT (JWKS, with legacy secret fallback).
- **Lazy user provisioning:** there's no "create profile" endpoint; `get_current_user` auto-creates the `User`
  row on first authenticated request, migrates plaintext secrets to encrypted, and normalizes vertical/plan.
- **Verticals are the core differentiator:** `job_seeker / recruiter / agency / business_growth / partnerships`.
  Defined in both `backend/verticals.py` (plans, entitlements, lead-gen strategy) and `frontend/lib/verticals.ts`
  (all UI copy/labels). Landing, pricing, dashboard, lead-gen labels, and AI prompts all reshape per vertical.
- **Data model (`backend/database.py`):** `User`, `Lead`, `Campaign`, `EmailLog`, `Payment` + enums
  `PlanType / LeadStatus / CampaignStatus / LeadSource`.
- **Lead generation (`services/lead_gen_service.py`):** "auto" runs a vertical strategy that scrapes job portals
  (Naukri/Indeed/LinkedIn Jobs), the open web (Bing RSS), Google Maps, Apollo, then enriches with a public-email
  finder. Only the `auto` source is exposed in the UI today.
- **AI (`services/ai_service.py`):** Groq `llama-3.3-70b-versatile`, per-vertical prompts, in-memory cache, with
  deterministic fallback templates if the LLM fails.
- **Security (preserve — Guardrails):** CSP + security headers (Next + FastAPI), CORS allow-list + Vercel preview
  regex, Fernet secret encryption, JWKS issuer/host pinning, in-memory/Redis rate limiting, HMAC-verified Cashfree
  webhook with a ±900s timestamp window. This layer is solid; keep it equivalent-or-stronger.

## Data flow (signup → analytics)

1. **Signup** (`/signup`): Supabase `signUp` with `{name, vertical}` metadata → auto sign-in → step 2 calls
   `POST /api/auth/onboard` (creates/updates the backend `User`). "Skip for now" jumps straight to dashboard.
2. **Dashboard** (`/dashboard`): `GET /api/analytics/overview` + `GET /api/auth/me`, renders a vertical-specific layout.
3. **Lead Studio** (`/leads`): `POST /api/leads/generate {source:"auto", ...}` → synchronous scrape+enrich (free mode) →
   leads inserted, `leads_used` bumped → list re-fetched. Per-lead `POST /api/emails/preview` shows an AI draft.
   Leads can be assigned to a campaign inline (`PATCH /api/leads/{id}`).
4. **Campaigns** (`/campaigns`): create/list/pause/resume/delete; `POST /{id}/send-now` queues an in-process batch
   that generates + SMTP-sends per pending lead (60s apart), writes `EmailLog`, decrements credits.
5. **Analytics** (`/analytics`): same `overview` endpoint — KPI tiles, daily-send bars, source/industry/funnel.
6. **Billing** (`/pricing`): `GET /api/payments/plans` → Cashfree checkout (`create-order` → SDK → `verify`/webhook).

---

## Top 15 issues (priority order)

### Critical — breaks a primary flow

1. **Creating a campaign with default values fails on free plans.** The UI default `emails_per_day` is **40**
   (`campaigns/page.tsx`), but free-plan `daily_send_cap` is 25–35. `POST /api/campaigns/` returns **400**
   "plan supports up to N emails per day". A brand-new free user hits an error on the most basic action.
   → Phase 1 (clamp default to the plan cap / surface the cap in the form).

2. **No unsubscribe / suppression / compliance anywhere.** Cold email is sent with no unsubscribe link, no
   suppression list, and no sender-identity footer. The `LeadStatus.unsubscribed` enum value exists but nothing
   ever sets it or filters on it. This is a legal/deliverability blocker (Guardrails call it non-optional).
   → Phase 11 (but flag now).

3. **Lead generation blocks the HTTP request synchronously in free mode.** `run_lead_gen` makes many sequential
   network fetches + `time.sleep` per lead; a 40-lead run can take minutes and risks gateway/proxy timeouts.
   The UI only shows a static "Generating..." with no progress or partial-result feedback.
   → Phase 1/7 (timeouts, partial success, progress, consider bounding work).

### High — correctness / trust

4. **Bounce tracking is broken.** `_send_smtp` records `EmailLog.status = "failed"` on error but never sets
   `LeadStatus.bounced`; analytics computes `bounced` from `LeadStatus.bounced`, which is never written, so
   **bounce rate is always 0** and "failed" sends are invisible in the UI. → Phase 1/9/11.

5. **`check-replies` marks every inbox sender as "replied".** `_check_imap_replies` pulls the last 200 INBOX
   messages and flags **all** of their from-addresses as replies, with no thread/recipient matching. This will
   produce large false-positive reply counts. → Phase 11 (also gated behind paid `reply_checks`).

6. **Quota counter is lifetime, not current.** `leads_used` only ever increments (on generation); deleting leads
   doesn't decrement it. "X/quota" can mislead and lock users out earlier than expected. → Phase 1 (define and
   enforce a consistent quota model).

7. **README claims "preview before sending" for campaigns, but the campaigns page has no per-lead preview.**
   Only Lead Studio previews. `send-now` sends blind. Either build campaign preview (Phase 8) or fix the claim. → Phase 1/8.

8. **No app-router safety/loading files.** No `app/loading.tsx`, `app/error.tsx`, or custom `app/not-found.tsx`
   (build shows only the default `_not-found`). Data pages show plain "Loading…" text — no skeletons, layout shift,
   and an `apiFetch` throw on `/dashboard` leaves "Loading workspace…" on screen under the error banner. → Phase 1.

9. **Silent failure in the app shell.** `Shell.tsx` does `apiFetch("/api/auth/me").catch(() => setProfile(null))`,
   so a profile-load failure silently falls back to the default vertical with no user feedback. Inline `error`
   string pattern is used app-wide instead of a toast system. → Phase 1/3.

### Medium — UX / structure

10. **Vertical switch is destructive without confirmation.** Changing vertical in Settings remaps the plan, quota,
    and may reset credits (`_update_sensitive_fields`) with no confirm dialog. → Phase 1/10.

11. **Lead table gaps.** No search or source filter (only status), no bulk select/actions, preview drawer is
    read-only (not editable, no copy button), table is overflow-scroll rather than responsive→cards on mobile,
    and there's no "this will use N credits" pre-flight. → Phase 7 (some basics in Phase 1).

12. **Design tokens are not in Tailwind.** `tailwind.config.js` `theme.extend` is empty; tokens live only as CSS
    vars in `globals.css` and are consumed via arbitrary values (`bg-[rgba(...)]`, `var(--accent)`). Blocks a
    consistent component system. → Phase 2.

13. **Marketing pages are client components.** `app/page.tsx` and `app/pricing/page.tsx` are `"use client"`,
    hurting SEO; only the root layout sets metadata (no per-page metadata, OG image, robots.txt, or sitemap).
    No legal pages (Privacy/Terms/AUP) and the landing has no footer with legal links. → Phase 4/12.

14. **Lead-gen reliability is fragile and opaque.** Web discovery relies on Bing RSS + public-page scraping and the
    `selenium` path needs Chrome (won't run on free Render). Failures degrade to "no leads found" with little
    transparency about which sources ran. Confirm Selenium paths fail gracefully (they return `[]`, which is OK).
    → Phase 1/7.

15. **No tests, no CI, no error tracking, and lint is unconfigured.** There is no `pytest`/Vitest suite, no GitHub
    Actions, no Sentry, and `next lint` isn't set up. No automated safety net for the revamp. → Phase 13 (lint
    config worth fixing earlier so each phase can lint).

## Security note (do not regress)

The security posture is genuinely good for this stage and must be preserved per Guardrails: Fernet-encrypted
secrets that never echo back, JWKS issuer host-pinning, HMAC webhook verification with replay window, CORS
allow-list + preview regex, CSP, and rate limits on the sensitive endpoints. No weakening during the revamp.

## Decisions to surface to Priyam (Appendix B — relevant now)

- Dark-only vs light mode (default dark-only) — affects Phase 2 token structure.
- Demo/sandbox `/demo` scope — Phase 5.
- Charting library (Recharts?) — Phase 9.
- Exact pricing/quotas per tier — Phase 4/10 (current numbers are placeholders in `verticals.py`).
- Keep live email + payments disabled-by-default on the public deploy — recommended yes.

---

# Part 2 — Final Extraordinary-bar audit (Phase 13)

> The Phase 0 baseline above was V1. This part audits the rebuilt **V2** against
> the acceptance bar in Part I of the master plan, **as amended by D-001** (old
> stack) — see `docs/PLAN_AMENDMENT_OLD_STACK.md` for the honest restatement of
> the cold-start line. Evidence is cited, not asserted. Items that can only be
> proven on the deployed stack or need Docker are marked **deploy-gated** /
> **drill-gated** rather than ticked — per the honesty rule.

| # | Acceptance criterion (amended) | Status | Evidence |
|---|---|---|---|
| 1 | Marketing Lighthouse ≥95 perf / ≥95 a11y; app pages ≥90 | ✅ **met locally** | Marketing (prod build, Edge headless): perf **99** / a11y **100** / BP 96 / SEO 100. App pages: perf **94** local, a11y **100**. `docs/QUALITY.md`. Authoritative re-measure happens on the deployed CDN (env-bound locally). |
| 2 | API stays warm; first response after deploy/restart 30–60 s; steady-state <1 s (D-001 restatement of "zero cold starts") | ⏳ **deploy-gated** | Mechanism in place: one always-on Render service + UptimeRobot 5-min `/health` keep-alive (also prevents Supabase 7-day pause). Verified on deploy per `CUTOVER.md` checklist. The original "zero cold starts" was an Oracle-VM promise; D-001 trades it knowingly. |
| 3 | Flawless 360px → 1536px+; tables→cards on mobile; taps ≥44px | ✅ **met** | Responsive sweep at 360/390/768/1024/1280/1536 (Phase 10); tables collapse to cards; live walkthroughs at 360 + 1280 clean. `docs/QUALITY.md`. |
| 4 | Zero console errors; every button real; skeleton + designed empty state; friendly API-failure messages | ✅ **met** | Verified live across all five app surfaces + marketing (Phases 6–10): zero console errors, toast error system, skeletons + empty states, no fabricated data. |
| 5 | Signup → first generated leads < 2 min | ✅ **met** | Live E2E (Phase 7): real lead-gen imported real open-web leads in under the 2-min target; quota math exact. |
| 6 | A stranger can clone + run the whole platform with `docker compose up` | ⏳ **drill-gated** | `compose.prod.yml` + `compose.dev.yml` maintained; portability drill written as a runnable, recorded checklist (`docs/CUTOVER.md`). Timed run blocked locally: this box has Docker Desktop but **no WSL** (`machine-no-docker`). Encrypt/decrypt/gzip half of restore already verified byte-for-byte. |
| 7 | Monthly bill ₹0 (plus optional domain) | ✅ **met by design** | Vercel + Render + Supabase + GitHub Actions + UptimeRobot + Groq + Umami Cloud — all free tiers (D-001); no required paid service. Optional spend = a custom domain only. |
| 8 | Not one fabricated number, testimonial, or logo anywhere | ✅ **met** | Honesty rule enforced every phase; no invented metrics/logos/testimonials in any surface or doc. Real numbers appear only once they exist. |

**Engineering evidence backing the bar:** custom auth (argon2id, HS256 JWT,
rotating refresh w/ family reuse-revocation); Fernet-encrypted secrets; HMAC
Cashfree webhook; tenant-scoped queries everywhere; compliance layer
(unsubscribe/suppression/footer/send caps); 4 Alembic migrations; **79 API tests
green**, `ruff check app tests` clean; CI gate (ruff+pytest+migrations / web
typecheck+build); nightly encrypted backups + restore tooling; full RUNBOOK +
CUTOVER + setup docs.

**Open, honestly:** items 2 and 6 are verifiable only on a real deploy / Docker
host — both have ready checklists and mechanisms, neither is hand-waved. Nothing
has been pushed to GitHub yet (awaiting Priyam's approval), so the deployed-stack
measurements (Lighthouse on CDN, cold-start timing, the timed portability drill)
are the post-launch closeout.

## Verdict

V2 meets every criterion that can be proven without the live deploy, and has a
concrete, written path to close the remaining three the moment the stack is up
and a Docker host (WSL) is available. The V1→V2 arc — from the 15 issues above
to this bar — is the story this repo tells.
