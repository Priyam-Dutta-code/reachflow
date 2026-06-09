# ReachFlow — Full Product Transformation Plan (for Claude Code)

> **Repo:** https://github.com/Priyam-Dutta-code/reachflow.git
> **Live:** https://reachflow-indol.vercel.app/
> **Goal:** Turn the existing solid foundation into a polished, premium, fully-functional, production-grade SaaS — without a rewrite. Refine and complete, don't replace.

---

## 0. HOW TO USE THIS PLAN (read this first, Claude Code)

You are working on an existing, deployed, multi-tenant AI SaaS. **Do not scaffold a new project.** Clone the repo, understand it, then execute the phases below **in order**.

**Operating protocol — follow strictly:**

1. **Orient before editing.** Read every file referenced in Phase 0 and build a mental model before touching anything.
2. **One phase at a time.** Finish a phase, satisfy its "Done when" checklist, then stop and summarise what changed before starting the next.
3. **Branch per phase.** `git checkout -b phaseN-short-name`. Keep diffs small and reviewable. Commit logically with clear messages.
4. **Never break the build.** After every phase run `npm run build` and `npm run lint` in `frontend/`, and confirm the FastAPI app imports/boots in `backend/`. Report results.
5. **Keep it deployable on the free tier at all times.** The app must keep running with only a Render `web` service, `ENABLE_BACKGROUND_WORKER=false`, payments disabled, and live email disabled. Never make a change that requires Redis/Celery/paid services just to render or navigate.
6. **You do not deploy and you do not push to `main` without explicit approval.** Priyam controls Vercel/Render/Supabase deploys. Prepare branches and PRs; let him merge.
7. **Surface product decisions, don't guess.** Where this plan says "confirm with Priyam," list the options and wait.
8. **Verify, don't assume.** Before marking any task done, actually exercise the flow (dev server, click through, hit the endpoint).

**Tech stack (confirmed from the codebase — don't change without reason):**

- **Frontend:** Next.js `15.5` (App Router), React 18, Tailwind CSS `3.4`, Framer Motion `11`, `lucide-react`, Supabase SSR auth (`@supabase/ssr`). Backend calls go through a Next proxy route (`app/api/proxy/[...path]/route.ts`) + `lib/api.ts`. Route protection via `middleware.ts` + `lib/supabase-middleware.ts`.
- **Backend:** FastAPI `0.110`, SQLAlchemy `2.0`, Celery + Redis (optional), Groq LLM, `requests`/`BeautifulSoup4`/`selenium` for lead scraping, `googlemaps`, Cashfree payments, Gmail app-password sending. Security headers + CORS + gzip in `main.py`, secret encryption in `security.py`.
- **Data model (`backend/database.py`):** `User` (vertical, plan, credits, quotas, sender identity, encrypted `gmail_password`/`groq_api_key`), `Lead`, `Campaign`, `EmailLog`, `Payment`.
- **Verticals (`frontend/lib/verticals.ts`, `backend/verticals.py`):** `job_seeker`, `recruiter`, `agency`, `business_growth`, `partnerships`. The whole product (landing, pricing, dashboard, lead-gen, copy) reshapes per vertical. **Preserve this — it's the core differentiator.**
- **Lead sources (enum):** `google_maps`, `linkedin_jobs`, `indeed`, `naukri`, `web_search`, `apollo`, `manual`.

---

## 1. GLOBAL GUARDRAILS (non-negotiable, apply to every phase)

- **Honesty rule (critical — this is a portfolio/credibility product).** Never fabricate social proof. No invented testimonials, fake customer logos, made-up "10,000+ users / 2M emails sent" counters, or unverifiable metrics anywhere in UI or copy. If a section needs numbers and none exist, either use honest framing ("built to handle…", "designed for…") or make it a clearly-labelled product capability, not a fake stat. Marketing claims must be defensible.
- **Preserve security.** Keep the security headers, CORS rules, origin checks, rate limits, Supabase server-side middleware protection, encrypted secret storage (`APP_ENCRYPTION_KEY`), and Cashfree webhook verification. Do not weaken any of these. If you refactor `security.py` or `main.py`, the protections must remain equivalent or stronger.
- **Never commit secrets.** `.env`, `.env.local`, API keys, Gmail passwords, Groq keys, Supabase service keys stay out of git. Confirm `.gitignore` still covers them. Use `.env.example` / `.env.local.example` for documentation only.
- **Don't break auth or the proxy.** Supabase session → `Authorization: Bearer` → Next proxy → FastAPI is the request spine. Test login/logout and at least one authed API call after any change near it.
- **Multi-tenant safety.** Every data query must remain scoped to the authenticated `user_id`. Never introduce an endpoint or query that could leak another tenant's leads/campaigns/emails.
- **Cold-email legality is a feature, not optional.** Anything that sends mail must respect unsubscribe + sender identity + rate limits (see Phase 11). This protects Priyam and real users.
- **Incremental & reversible.** Prefer additive changes. When deleting/replacing significant code, explain why first.
- **Aesthetic direction (updated by Priyam, supersedes the original dark look).** The frontend is being **fully redesigned** to be **light, minimal, clean, and editorial** with **warm-neutral (stone) surfaces and a single amber/orange accent**. Keep Fraunces (display serif) + Plus Jakarta Sans (body). Drop the dark glass/glow/gradient-noise maximalism. Every page must be flawless on **both phone and desktop**. Preserve all functional wiring (auth, proxy, `apiFetch`, the 5-vertical system, routing) — this is a visual overhaul, not a functional rewrite.

---

## 2. DESIGN NORTH STAR (the visual target) — REDESIGN (light / warm / minimal)

**Decision (confirmed with Priyam):** ship a **light, minimal, clean, editorial** theme — **warm-neutral (stone) surfaces with a single amber/orange accent.** This replaces the previous dark/glassy north star. The product should feel like a focused, premium outbound workspace — Linear / Notion / Vercel-light in restraint.

- **Mood:** light, airy, high-contrast on white/warm-paper. Generous whitespace, thin hairline borders, subtle shadows (no blur, no glow, no gradient mesh). Calm and confident, never busy.
- **Type:** keep **Fraunces** (display serif — carries the editorial warmth) + **Plus Jakarta Sans** (body). Lock one type scale (display / h1 / h2 / h3 / body / body-sm / caption) and use it everywhere.
- **Colour:** warm-neutral **stone** scale for surfaces/text/borders; **one amber/orange accent** for the single primary action + active state per screen. Success/danger used only for status. No multi-accent gradients.
- **Surfaces:** one card language (`.card`) — white surface, hairline border, soft shadow, consistent radius. Don't introduce five card styles.
- **Responsive (hard requirement):** every page verified on phone **and** desktop. Tables collapse to cards on mobile; tap targets ≥ 44px; no horizontal overflow.
- **Consistency over novelty:** every button, input, badge, card, empty state comes from the same token system + shared component library.

### Frontend redesign execution order (folded into the plan)

The redesign is delivered in coherent, build-green checkpoints. The **new light system is added alongside the old dark classes** so unconverted pages keep working (dark) until each is converted — no broken intermediate state.

- **R1 — Design foundation + core components + landing.** New light/warm tokens in `globals.css`, wired into `tailwind.config.js`; type scale; shared `components/ui/*` primitives; redesigned **landing** page as the proof. *(this checkpoint)*
- **R2 — Public surface.** Redesign **pricing, login, signup**, marketing nav + footer, and legal stub pages.
- **R3 — App shell + dashboard.** Redesign `components/Shell.tsx` and the dashboard to the light system.
- **R4 — App pages.** Redesign **leads, campaigns, analytics, settings**; remove the now-unused dark classes.
- Functional fixes from Phase 1 (e.g. campaign `emails_per_day` default vs plan cap, loading/empty states) are folded into each page as it is rebuilt.

---

## TABLE OF CONTENTS

- **Phase 0** — Orientation, local run, baseline audit
- **Phase 1** — Stabilise & fix (functional correctness pass)
- **Phase 2** — Design-system foundation (tokens → Tailwind theme)
- **Phase 3** — Shared UI component library
- **Phase 4** — Landing & marketing pages
- **Phase 5** — Auth, onboarding & demo mode
- **Phase 6** — App: Dashboard / Overview
- **Phase 7** — App: Lead Studio
- **Phase 8** — App: Campaigns
- **Phase 9** — App: Analytics
- **Phase 10** — App: Settings & Billing
- **Phase 11** — Email engine, deliverability & compliance
- **Phase 12** — Performance, SEO, accessibility, responsive QA
- **Phase 13** — Observability, testing, docs & launch checklist
- **Appendix A** — Per-screen acceptance checklist
- **Appendix B** — Decisions to confirm with Priyam

---

## PHASE 0 — Orientation, local run, baseline audit

**Goal:** Fully understand the system and get it running locally before changing anything.

**Tasks**
- [ ] Read: `README.md`, `DEPLOY.md`, `docker-compose.yml`, `render.yaml`, `start.py`, both `.env*.example` files.
- [ ] Frontend deep read: `app/layout.tsx`, `app/globals.css`, `tailwind.config.js`, `app/page.tsx`, every page under `app/`, `components/Shell.tsx`, `components/Reveal.tsx`, `lib/api.ts`, `lib/auth.tsx`, `lib/supabase.ts`, `lib/supabase-middleware.ts`, `lib/verticals.ts`, `middleware.ts`, `app/api/proxy/[...path]/route.ts`.
- [ ] Backend deep read: `main.py`, `config.py`, `database.py`, `security.py`, `tasks.py`, `verticals.py`, every file in `routers/` and `services/`.
- [ ] Map all API endpoints (method, path, auth requirement, request/response shape) into a short `docs/API_MAP.md`.
- [ ] Map all data flows: signup → vertical → dashboard → lead generation → campaign assignment → email send → analytics → billing.
- [ ] Get it running locally: install frontend (`npm install`) and backend deps; create local `.env`/`.env.local` from the examples; run backend (`uvicorn main:app --reload`) and frontend (`npm run dev`). Use a free/sandbox Supabase project and a Groq key if available; otherwise document exactly what's needed.
- [ ] Click through **every** page and **every** button as a real user. Record what works, what errors, what's a dead end, and what's visually rough in `docs/AUDIT.md`.
- [ ] Run `npm run build` and `npm run lint` to capture the baseline (warnings, type errors, dead code).

**Done when:** the app runs locally, `docs/API_MAP.md` and `docs/AUDIT.md` exist, and you can summarise the architecture and the top 15 issues in priority order. **Stop and present this summary before Phase 1.**

---

## PHASE 1 — Stabilise & fix (functional correctness pass)

**Goal:** Everything that exists should actually work, fail gracefully, and never show a broken/blank state. Fix before beautify.

**Tasks**
- [ ] Walk each flow end-to-end and fix every break found in Phase 0:
  - Auth: signup, email confirm (if enabled), login, logout, protected-route redirect, session refresh, `?next=` redirect.
  - Lead Studio: generate (each source + `auto`), pagination, status filter, preview, assign-to-campaign, quota/credit decrement.
  - Campaigns: create, edit, assign leads, status changes, preview-before-send.
  - Analytics: numbers render and reconcile with underlying data.
  - Settings: profile + sender identity save, Gmail/Groq key save (stays encrypted), plan display.
  - Pricing/Billing: plan selection, Cashfree path (keep disabled-safe if no creds).
- [ ] **Error handling everywhere:** every `apiFetch` call must handle failure with a visible, friendly message (not a thrown blank screen, not a raw stack). Network/500/401/403/422 all handled.
- [ ] **Loading states:** no flash of empty content. Add `app/loading.tsx`, and per-section loading where data fetches.
- [ ] **Empty states:** every list/table (leads, campaigns, analytics, email logs) needs a designed empty state with a clear next action — never a bare "no data".
- [ ] **Add app-router safety files:** `app/loading.tsx`, `app/not-found.tsx`, `app/error.tsx` (client error boundary), and a per-segment `error.tsx` for the app shell.
- [ ] Backend robustness: validate inputs with Pydantic models on every endpoint; return structured errors; make lead-scraping resilient (timeouts, try/except per source, partial-success responses, never hang the request). Confirm Selenium-based paths degrade gracefully when a browser isn't available (free tier) instead of 500-ing.
- [ ] Confirm quota/credit logic can't go negative and is enforced server-side (not just UI).
- [ ] Fix all TypeScript errors and meaningful lint warnings from the baseline.

**Done when:** you can complete every primary flow without hitting an unhandled error, every list has a real empty state, and `npm run build` is clean. Document anything intentionally left disabled (e.g. live send without Gmail creds).

---

## PHASE 2 — Design-system foundation (tokens → Tailwind theme)

**Goal:** Centralise the design language so the rest of the work is consistent and fast.

**Context:** `tailwind.config.js` currently has an empty `theme.extend` while real tokens live as CSS variables in `globals.css`. Unify them.

**Tasks**
- [ ] Define semantic design tokens (colour, surface, border, text, accent, danger/success, radius scale, shadow scale, spacing rhythm, z-index scale) **once**. Keep CSS variables as the source of truth and **map them into `tailwind.config.js` `theme.extend`** so you can use `bg-surface`, `text-muted`, `border-subtle`, `rounded-card`, `shadow-card`, etc. as utilities.
- [ ] Lock the **type scale** as Tailwind utilities/classes: `display`, `h1`, `h2`, `h3`, `body`, `body-sm`, `caption`. Wire Fraunces/Plus Jakarta cleanly (already loaded in `layout.tsx`).
- [ ] Define **motion tokens** (durations + easing curves) and standardise on them in Framer Motion variants; respect `prefers-reduced-motion`.
- [ ] Audit `globals.css`: keep the good component classes (`glass-card`, `shell-card`, `primary-button`, `field`, etc.), remove duplicates/unused, and ensure every component class uses the tokens.
- [ ] Decide and document the dark-only vs light-mode call from the Design North Star; if light mode is approved, structure tokens for theming (`data-theme` or `class` strategy) now so later phases inherit it.
- [ ] Create `docs/DESIGN_SYSTEM.md` documenting tokens, type scale, spacing, and component usage rules.

**Done when:** tokens exist in one place, are available as Tailwind utilities, and `docs/DESIGN_SYSTEM.md` documents them. No visual regressions on existing pages.

---

## PHASE 3 — Shared UI component library

**Goal:** A small, consistent set of reusable components so every screen looks unified. This is the biggest lever for "highly professional."

**Tasks** — build these as typed React components under `components/ui/`:
- [ ] `Button` (variants: primary, secondary, ghost, danger; sizes; loading state; icon support) — replace ad-hoc `primary-button`/`secondary-button` usages progressively.
- [ ] `Input`, `Textarea`, `Select`, `Label`, `FieldError`, `FormRow` — consistent focus/disabled/error states.
- [ ] `Card` / `Panel` (wraps the glass language) with header/body/footer slots.
- [ ] `Badge` / `StatusPill` (drive lead/campaign statuses from one place; reuse the existing status colour map).
- [ ] `Modal` / `Dialog` (focus-trapped, escape-to-close, scroll-locked, accessible) and `Drawer` for mobile.
- [ ] **`Toast`/notification system** (success/error/info) with a provider — **replace the current inline `error`/`message` string pattern** across pages.
- [ ] `Skeleton` loaders (text, card, table-row) for loading states.
- [ ] `EmptyState` (icon + title + description + action) used by every list.
- [ ] `Table` / `DataList` primitive (sortable header, row, pagination, sticky header, responsive → cards on mobile).
- [ ] `Tabs`, `Tooltip`, `Avatar`, `ProgressBar`/quota meter, `Stat`/metric tile, `PageHeader`.
- [ ] `ConfirmDialog` for destructive actions (delete lead/campaign).
- [ ] Optional: a lightweight Storybook-style `app/_kitchen-sink/page.tsx` (dev-only, not linked in nav) to view all components together.

**Done when:** the component library exists, is documented in `docs/DESIGN_SYSTEM.md`, and at least the toast + empty-state + skeleton + button primitives are adopted app-wide (kills inline error strings).

---

## PHASE 4 — Landing & marketing pages

**Goal:** A landing page that makes a stranger immediately get it and want to sign up. The current one is already good — elevate it and fill the gaps. **No fake social proof (see Guardrails).**

**Tasks**
- [ ] **Hero refinement:** sharpen the headline/subhead, strengthen the primary CTA hierarchy, and consider an honest product visual (a real screenshot of the dashboard/lead studio, or a tasteful animated mock of the actual UI) instead of abstract panels.
- [ ] **Keep & polish the vertical showcase** (job seeker / recruiter / agency / business growth / partnerships) — it's the differentiator. Make the desktop live-preview and mobile card switch buttery.
- [ ] **Add a real "Product / How it works" section** with actual screenshots or faithful UI mockups of: lead generation, the lead table, email draft preview, campaign view, analytics.
- [ ] **Add an honest "Why ReachFlow" / capabilities section** — multi-vertical, one-click generation, vertical-aware AI copy, owns the full discovery→send→track loop. Frame as capabilities, not invented metrics.
- [ ] **Add an FAQ section** (data sources, deliverability, pricing, whether they need their own Gmail/Groq keys, privacy).
- [ ] **Add a proper footer:** product links, pricing, login, and **legal links** (Privacy, Terms, Acceptable Use) — create stub pages for these now (filled in Phase 11).
- [ ] **Pricing page:** make plans (`free`, `pro`, `agency`, `lifetime` per the model) crisp, comparison-style, vertical-aware, with clear CTAs and an honest feature matrix. Wire to the real billing path.
- [ ] **Polish login/signup visuals** to match the elevated landing (functional fixes are in Phase 5).
- [ ] Add subtle, performant scroll/entry motion consistent with the motion tokens; respect reduced-motion.
- [ ] Add a sticky, condensing top nav with smooth in-page anchors.

**Done when:** the landing tells a complete, honest story (hero → verticals → product → how-it-works → FAQ → pricing → footer/legal), looks premium on mobile and desktop, every CTA routes correctly, and there is zero fabricated social proof.

---

## PHASE 5 — Auth, onboarding & demo mode

**Goal:** A first-run experience that gets users to value fast — and a public **demo mode** so the product can be experienced (and shown to recruiters/clients) without setup.

**Tasks**
- [ ] **Login/signup UX:** clean forms using the new components; inline validation; clear errors (wrong password, unconfirmed email, existing account); loading states; password visibility toggle; preserve the `?vertical=` and `?next=` params already in the flow.
- [ ] **Onboarding wizard** (first login, before/at first dashboard visit): (1) confirm/choose vertical, (2) set sender identity (`sender_name`, `sender_role`, `sender_email`, `sender_linkedin`, `sender_profile`), (3) optional Gmail/Groq keys with a clear "you can do this later" path, (4) a guided "generate your first leads" step. Persist progress so it's resumable.
- [ ] **Empty-but-guided dashboard** for brand-new users (checklist of next steps) instead of an empty shell.
- [ ] **Demo / sandbox mode (high value for a portfolio product):** a public route (e.g. `/demo`) that loads **clearly-labelled sample data** (sample leads, a sample campaign, sample analytics) into a read-mostly version of the real app UI — no signup, no real sending. Make it obvious it's a demo. This lets Priyam link it from his portfolio/applications and lets visitors feel the product instantly. Confirm scope with Priyam.
- [ ] Confirm Supabase email confirmation behaviour and document it; handle the "confirm your email" state gracefully.
- [ ] Add account basics: forgot-password flow (Supabase), and a friendly post-signup state.

**Done when:** a new user is guided from signup → vertical → sender identity → first leads without confusion, and `/demo` lets anyone explore the real UI with sample data and no setup.

---

## PHASE 6 — App: Dashboard / Overview

**Goal:** A dashboard that orients the user in 3 seconds and drives the next action. Vertical-aware (it already reads `vertical.dashboardTitle/Summary`).

**Tasks**
- [ ] Top: `PageHeader` + key `Stat` tiles driven by **real** data — leads generated, emails sent, replies, reply rate, credits/quota remaining (with a quota `ProgressBar`). No invented numbers.
- [ ] **Quota/credits widget** showing usage vs plan limit with an upgrade CTA.
- [ ] **Recent activity** feed (recent leads, recent sends, recent replies) from `EmailLog`/`Lead`.
- [ ] **Quick actions** matched to the vertical (Generate leads, New campaign, Connect sender).
- [ ] A small analytics preview (mini chart) linking to the full Analytics page.
- [ ] First-run checklist state (from Phase 5) when the account is empty.
- [ ] Full skeletons + empty states; fully responsive.

**Done when:** the dashboard shows accurate live metrics, adapts to the vertical, has real recent-activity, and gives obvious next actions — with skeletons and empty states.

---

## PHASE 7 — App: Lead Studio

**Goal:** Make lead generation feel powerful, fast, and trustworthy. This is the core action of the product.

**Tasks**
- [ ] **Generation form** (`query`, `location`, `industry`, `audience`, `offer`, `goal`, `max`, `campaign_id`): use vertical-aware labels (already in `verticals.ts`), good defaults, validation, and a clear primary "Generate" button with a real progress/loading state (generation can take time — show meaningful progress, not a frozen button).
- [ ] **Source transparency:** show which sources are used (`google_maps`, `web_search`, `linkedin_jobs`, `indeed`, `naukri`, `apollo`, `manual`) and label each lead's source with a badge. Handle partial results ("found 18 of 40, some sources returned nothing") gracefully.
- [ ] **Leads table** (new `Table` primitive): name, company, title, email, source, status, location; sortable; sticky header; responsive → cards on mobile; pagination already exists server-side — wire it cleanly.
- [ ] **Filters:** status filter (exists), plus search and source filter.
- [ ] **Lead detail / preview drawer:** full lead info + the AI-drafted email preview (the `preview` flow exists) with subject + body, editable, with a copy button.
- [ ] **Bulk selection + actions:** select multiple → assign to campaign, change status, delete (with `ConfirmDialog`).
- [ ] **Assign-to-campaign** inline and in bulk; reflect counts on the campaign.
- [ ] Show **quota impact** before generating (e.g. "this will use N credits") and block gracefully when over limit with an upgrade path.
- [ ] Empty state: a guided "generate your first leads" panel.

**Done when:** generation is reliable with clear progress and partial-result handling, the table is fast/sortable/responsive, previews and bulk actions work, and quota is enforced with clear messaging.

---

## PHASE 8 — App: Campaigns

**Goal:** A clean campaign workflow from creation → leads → preview → (scheduled) send → status.

**Tasks**
- [ ] **Campaign list:** cards/table with status (`draft`/`active`/`paused`/`complete`), lead count, sent/replied/bounced, created date; create button.
- [ ] **Create/edit campaign:** name, description, `emails_per_day`, `send_time`, `follow_up_days`, status. Validate sane ranges (tie `emails_per_day` to plan limits + deliverability caps from Phase 11).
- [ ] **Campaign detail:** assigned leads list, per-lead status, the email draft/preview, and counters (total/sent/replied/bounced).
- [ ] **Preview-before-send** for every lead in the campaign (the product already aims to support assign → preview → send — make it solid).
- [ ] **Send flow:** explicit confirm; respect the worker mode (in-process when `ENABLE_BACKGROUND_WORKER=false`, Celery when enabled); show progress and results; write `EmailLog` rows. If Gmail creds are absent, show a clear "connect sender to send" state instead of failing silently.
- [ ] **Follow-ups:** surface the `follow_up_days`/`follow_up_sent` logic in the UI; let users see/trigger follow-ups per the backend `tasks.py`.
- [ ] Status transitions (pause/resume/complete) with optimistic UI + toasts.
- [ ] Empty + loading states throughout.

**Done when:** a user can create a campaign, assign leads, preview each email, send (or see why they can't), and watch status/counters update — with follow-up logic visible and safe scheduling.

---

## PHASE 9 — App: Analytics

**Goal:** Trustworthy, readable performance reporting. (Current page is minimal — expand it.)

**Tasks**
- [ ] **Headline KPIs:** total leads, emails sent, delivered, replies, reply rate, bounce rate — computed from `EmailLog`/`Lead`, reconciling with the dashboard.
- [ ] **An outreach funnel** (leads → sent → replied) visual.
- [ ] **Trends over time** (sends/replies per day or week) with a charting lib (lightweight; e.g. Recharts) themed to the design tokens.
- [ ] **Per-campaign breakdown** table (sent/replied/bounced/reply-rate per campaign).
- [ ] **By-source performance** (which lead sources convert) — genuinely useful and unique.
- [ ] **Date-range filter** and an **export to CSV** of leads/email logs.
- [ ] Empty state for accounts with no activity yet; skeletons while loading.
- [ ] Ensure all analytics queries are tenant-scoped and reasonably efficient (add indexes if needed).

**Done when:** analytics are accurate, reconcile across pages, render readable themed charts, support date filtering + CSV export, and degrade gracefully when empty.

---

## PHASE 10 — App: Settings & Billing

**Goal:** A trustworthy settings area covering identity, integrations, plan, and security.

**Tasks**
- [ ] **Profile & sender identity:** edit `name`, `sender_name`, `sender_role`, `sender_email`, `sender_phone`, `sender_linkedin`, `sender_profile`; clear save + success toast.
- [ ] **Vertical switcher** (changing vertical reshapes the product — confirm the change, since it affects dashboard/lead-gen/copy).
- [ ] **Integrations:** Gmail app-password and Groq API key inputs that (a) stay **encrypted** server-side, (b) never echo the secret back in plaintext, (c) show connected/not-connected status, (d) offer a test/verify action.
- [ ] **Plan & billing:** current plan, quota usage, upgrade/downgrade via the real Cashfree path; payment history from the `Payment` model; keep everything disabled-safe when no Cashfree creds.
- [ ] **Security/account:** change password (Supabase), sign out everywhere if feasible, and a clearly-gated **delete account** (with confirm) that cascades per the model relationships.
- [ ] Validate all inputs; consistent forms using Phase-3 components.

**Done when:** every setting saves correctly, secrets remain encrypted and never re-displayed, billing reflects real plan state, and account/security actions are safe and gated.

---

## PHASE 11 — Email engine, deliverability & compliance

**Goal:** Make sending real, safe, and legal. This both protects Priyam/users and makes the product credibly "professional."

**Tasks**
- [ ] **Sending reliability:** robust Gmail send path with retries/backoff, per-recipient error capture, and accurate `EmailLog` status (`sent`/`bounced`/etc.). Respect `emails_per_day` and `send_time`. Verify both in-process and Celery worker modes.
- [ ] **Unsubscribe + compliance (required for cold email):** add a working unsubscribe mechanism (link/token + a public unsubscribe page + backend route that flags the lead `unsubscribed` and excludes them from future sends). Ensure outbound emails include a physical/sender identity footer. Implement suppression so unsubscribed/bounced contacts are never re-emailed.
- [ ] **Sending guardrails:** cap daily volume per plan, add basic warm-up-friendly throttling, and prevent duplicate sends to the same lead in a campaign.
- [ ] **Email content quality:** review `ai_service.py` prompts so vertical-aware drafts are genuinely strong; ensure the user's `sender_profile` and lead context are used; keep a deterministic cache where helpful (it already caches).
- [ ] **Legal pages (fill the Phase-4 stubs):** Privacy Policy, Terms of Service, Acceptable Use. Cover data sources, scraping/usage, email compliance expectations, and user responsibilities. (Flag to Priyam that these are templates to review, not legal advice.)
- [ ] **Consent/disclaimer in-app:** when enabling sending, a short acknowledgement that the user is responsible for compliant outreach.

**Done when:** sends are reliable and throttled, unsubscribes/bounces are honoured and suppressed, emails carry proper identity/unsubscribe, and Privacy/Terms/AUP pages exist and are linked.

---

## PHASE 12 — Performance, SEO, accessibility, responsive QA

**Goal:** Fast, discoverable, accessible, and flawless on every screen size.

**Tasks**
- [ ] **Performance:** code-split heavy client components, lazy-load the charting lib and below-the-fold landing sections, optimise images (`next/image`), audit Framer Motion usage for jank, and aim for strong Lighthouse scores on landing + app. Check bundle size.
- [ ] **SEO/metadata:** per-page `metadata` (title/description), Open Graph + Twitter cards with a real OG image, `robots.txt`, `sitemap.xml`, canonical URLs, and JSON-LD for the product/pricing where sensible. (Marketing pages should be server components where possible for SEO.)
- [ ] **Accessibility:** semantic landmarks, labelled form controls, visible focus rings, keyboard navigability (modals/drawers/menus trap & restore focus), adequate colour contrast on the dark theme, `prefers-reduced-motion` honoured, alt text. Run an a11y checker and fix issues.
- [ ] **Responsive QA:** verify every page at 360 / 390 / 768 / 1024 / 1280 / 1536 widths. Tables → cards on mobile, the app shell drawer works, no overflow, tap targets ≥ 44px.
- [ ] **Cross-browser:** sanity-check Chrome, Safari, Firefox (incl. iOS Safari quirks).
- [ ] Confirm `app/icon.svg`/favicon and any PWA basics render correctly.

**Done when:** Lighthouse is strong on landing and key app pages, metadata/OG/sitemap/robots are in place, no critical a11y violations remain, and every page is verified across the breakpoint set.

---

## PHASE 13 — Observability, testing, docs & launch checklist

**Goal:** Make it maintainable, monitorable, and provably working.

**Tasks**
- [ ] **Error tracking:** integrate a tool like Sentry on both frontend and backend (env-gated; free tier). Replace silent failures with captured errors. (Confirm provider with Priyam.)
- [ ] **Structured logging** in the backend (request IDs, lead-gen source outcomes, send results) without logging secrets/PII.
- [ ] **Health & status:** keep `/health`; consider a lightweight in-app status surface for integration connectivity (Groq/Gmail/DB).
- [ ] **Tests:** backend — `pytest` covering auth/scoping, lead-gen service (mock network), email send (mock SMTP), quota enforcement, payments webhook verification, analytics math. Frontend — component tests for the UI primitives and a couple of critical flows (auth guard, lead generation happy path) with Vitest/RTL; optionally Playwright E2E for signup → generate → campaign → send (mocked).
- [ ] **CI:** a GitHub Actions workflow running lint + typecheck + build + tests on PRs.
- [ ] **Docs:** rewrite `README.md` (clear value prop, screenshots, architecture diagram, full local setup, env var table, scripts), update `DEPLOY.md`, and add `CONTRIBUTING.md` + `docs/DESIGN_SYSTEM.md` + `docs/API_MAP.md`.
- [ ] **Deploy readiness:** verify Vercel (frontend env) + Render (backend, free `web` mode) + Supabase config; confirm the free-tier path works end-to-end; document the upgrade path (Redis + worker, Cashfree, Gmail).
- [ ] **Final QA pass** against Appendix A on the deployed preview before Priyam merges to `main`.

**Done when:** errors are tracked, core tests pass in CI, docs are accurate and screenshot-rich, and a clean deploy of the revamped app passes the Appendix A checklist on a preview URL.

---

## APPENDIX A — Per-screen acceptance checklist (run before "done")

For **every** page (landing, pricing, login, signup, onboarding, demo, dashboard, leads, campaigns, analytics, settings, legal):
- [ ] Loads with no console errors and no layout shift.
- [ ] Has a loading (skeleton) state and a designed empty state where applicable.
- [ ] Handles API errors with a friendly toast/message (never a blank/broken screen).
- [ ] Looks correct at 360 / 768 / 1024 / 1280 / 1536 px.
- [ ] All buttons/links go somewhere real; no dead ends; primary action is obvious.
- [ ] Keyboard-navigable; visible focus; modals/drawers trap focus.
- [ ] Uses the shared component library + design tokens (no one-off styles).
- [ ] Contains zero fabricated metrics/testimonials/logos.
- [ ] Data shown is tenant-scoped and accurate.

---

## APPENDIX B — Decisions to confirm with Priyam (surface early)

1. **Light mode** in addition to the current dark theme, or **dark-only**? (Default: dark-only.)
2. **Demo/sandbox mode** scope — fully read-only sample app at `/demo`, or also allow limited sandbox actions? (Recommended: read-mostly with sample data.)
3. **Charting library** for analytics (Recharts vs alternative).
4. **Error-tracking provider** (Sentry vs other) and analytics/product-analytics tool, if any.
5. **Pricing specifics** — exact tier prices, quotas, and which features sit in `free` / `pro` / `agency` / `lifetime`.
6. **Live email + payments** — keep disabled-by-default for the public/demo deployment and only enable with his own credentials? (Recommended: yes.)
7. **Domain/branding** — custom domain, final logo/wordmark, brand colours locked?
8. **Scope of legal pages** — confirm he'll have the generated Privacy/Terms/AUP reviewed before relying on them.

---

### Suggested execution summary for Claude Code
Work Phase 0 → 13 in order, one branch per phase, build+lint after each, no pushes to `main` without approval, never fabricate data, never weaken security, keep the free-tier deploy working at every step, and confirm Appendix B decisions before they block a phase.
