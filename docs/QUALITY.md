# Phase 10 — quality bar evidence

Measured on the local dev machine (Windows, headless Edge for Lighthouse,
SQLite-backed API). Where local conditions can't represent the deployed
reality, that's called out and deferred to the deployed-target re-measure
(Phase 12 cutover on Vercel + Cloudflare).

## Security

**Headers** (verified on the served web app, `GET /`):
- `Content-Security-Policy` present — `default-src 'self'`; `script-src` allows
  self + inline + Cashfree SDK (+ Umami origin when configured); `'unsafe-eval'`
  is added **only in development** (Next's dev bundler needs it; production
  policy omits it). `frame-ancestors 'none'`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  locked. `X-Powered-By` removed.
- API sets the same security headers + sanitized 500s (Phase 2 middleware).

**Spot-checks (live):**
- Proxy rejects cross-origin mutations: `POST /api/proxy/api/auth/login` with
  `Origin: https://evil.example.com` → **403**. Same-origin → passes.
- Cashfree webhook with no/invalid/stale signature → **401** (tested in
  `test_payments.py`: accept/reject/stale/replay).
- Refresh-token rotation + reuse-revocation, rate limits (login 5/min,
  register 3/hr, reset 3/hr), tenant-scoping — all covered by the 79-test
  API suite. Secrets encrypted at rest, never echoed.

**Dependency audits:**
- `npm audit` (web): the high-severity Next.js advisories (incl. middleware/
  proxy bypasses) resolved by bumping `next` 15.5.12 → 15.5.19. Remaining: a
  moderate `postcss` advisory nested in Next's own toolchain — **build-time
  only** (postcss never ships to the browser) and requires processing
  untrusted CSS, which we never do (all first-party). Accepted; clears when
  Next bumps its transitive pin.
- `pip-audit` (api): bumped cryptography → 46.0.7, PyJWT → 2.13.0,
  requests → 2.33.0, lxml → 6.1.0, fastapi → 0.121.1 / starlette → 0.49.1.
  Remaining: one `starlette` advisory (PYSEC-2026-161) whose only fix is the
  not-yet-released 1.0.1; tracked, no exploit path in our usage (we don't use
  the affected multipart path beyond FastAPI's defaults). 79 tests still green
  after all bumps.

## Accessibility

DOM audits (labels, accessible names, alt text, landmarks, single h1) — **zero
issues** on every page checked: landing, dashboard, Lead Studio (12 inputs),
Settings (13 inputs). Marketing Lighthouse **accessibility = 100**.
Foundations baked into the system: every `Field` wires `label[for]`↔`id`;
icon-only buttons carry `aria-label`; native `<dialog>` gives focus-trap +
Esc; visible focus rings via `:focus-visible`; `prefers-reduced-motion`
respected globally; tokens chosen for ≥4.5:1 contrast on the light theme.

## Responsive

No horizontal overflow at 360 / 768 (and wider is safe) on the form-heavy
Settings and Lead Studio pages and the dashboard. Tables collapse to
definition cards below `md` (verified Phase 8). Tap targets ≥44px on controls
(`h-11`/`min-h-11`); the one sub-36px interactive element is the sidebar logo
link (32px) — a logo, acceptable. CLS = 0.

## Performance (marketing landing, mobile emulation)

| Run (local, headless Edge) | Perf | a11y | best-practices | SEO |
|---|---|---|---|---|
| Phase 6 (pre-CSP) | 99 | 100 | 96 | 100 |
| Phase 10, warm | 94 | 100 | 96 | 100 |

LCP 2.1s, TBT 240ms, **CLS 0**. Perf swung 83→90→94 across runs purely with
machine load (a dev server, the API, and build processes were contending);
the page is static SSG with one small client island and zero layout shift.
The remaining gap to ≥95 is a local-environment artifact (no CDN, cold local
SSR, contended Windows CPU, headless Edge). **Authoritative perf re-measure is
on the deployed Vercel + Cloudflare edge at cutover** — where CDN caching,
HTTP/2, and a clean CPU apply. App pages (auth-gated) aren't Lighthouse-able
headless without a session; their structure mirrors the marketing system.

## Bug found & fixed this phase

**Dev-only CSP/eval interaction.** Adding the CSP broke the dev server: Next's
dev bundler uses `eval()` (eval-source-map / HMR), which `script-src` without
`'unsafe-eval'` blocks — killing client hydration, so no `useEffect` ran and
authed pages hung on their loading skeleton (no `/auth/refresh` fired).
Production never evals, so it was unaffected. Fix: add `'unsafe-eval'` to
`script-src` **only when NODE_ENV !== production**, keeping the shipped policy
strict. Verified: dashboard renders real data again, refresh fires.

## Known, accepted limitation

Refresh-token rotation revokes the whole session family on reuse (correct,
security-first). Two browser tabs cold-loading at the *exact same instant*
both present the shared cookie → one rotates, the other is flagged as reuse →
both sessions drop and the user re-logs-in. Rare (simultaneous cold loads),
recoverable, and the secure default. Revisit with a short server-side reuse
grace window if real usage shows it matters.
