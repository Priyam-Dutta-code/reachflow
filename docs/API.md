# API reference (V2)

The ReachFlow V2 HTTP API. FastAPI app under `apps/api`; interactive schema at
`/docs` (Swagger) and `/openapi.json` when the API is running. This file is the
human-readable map. (The older `API_MAP.md` describes the *V1* Supabase-auth
API and is kept only for the salvage record — V2 superseded it.)

## Request spine

```
Browser ──► Next proxy /api/proxy/[...path] ──► FastAPI (apps/api)
            (apps/web, Origin-checked,         (verifies our own JWT,
             attaches/forwards cookies)          tenant-scopes every query)
```

The web app **never** calls the API host directly — it goes through the
same-origin Next proxy (`apps/web/app/api/proxy/[...path]/route.ts`), which
checks `Origin` on mutations, forwards the access token, and passes auth cookies
through. The API is our own service (no Supabase Auth): access = short-lived
**HS256 JWT** (15 min); refresh = an opaque, rotating, SHA-256-hashed token in
an HttpOnly cookie with **family reuse-revocation**.

Legend: 🔒 requires access token · 🌐 public · 🔑 signed (`X-Cron-Secret`) ·
⏱ rate-limited.

## Auth — `/api/auth`

| Method | Path | | Purpose |
|---|---|---|---|
| POST | `/register` | 🌐⏱ | Create account (argon2id), send verification email |
| POST | `/login` | 🌐⏱ | Email+password → access token + refresh cookie |
| POST | `/refresh` | 🌐 | Rotate refresh cookie → new access token |
| POST | `/logout` | 🔒 | Revoke the current session |
| POST | `/logout-all` | 🔒 | Revoke every session in the family |
| POST | `/verify-email` | 🌐 | Consume one-time email-verification token |
| POST | `/resend-verification` | 🔒⏱ | Re-send verification email |
| POST | `/forgot-password` | 🌐⏱ | Send reset email (always 200 — no account enumeration) |
| POST | `/reset-password` | 🌐⏱ | Consume reset token, set new password |
| POST | `/change-password` | 🔒 | Change password (requires current) |
| POST | `/test-integrations` | 🔒 | Live-check the user's SMTP + Groq creds |
| DELETE | `/account` | 🔒 | Delete account + cascade (leads, campaigns, logs, payments, feedback) |
| GET | `/me` | 🔒 | Current user + vertical/plan/quota |
| POST | `/onboard` | 🔒 | Set vertical + sender identity during onboarding |
| PATCH | `/profile` | 🔒 | Update profile / sender identity / encrypted integration secrets |

## Leads — `/api/leads`

| Method | Path | | Purpose |
|---|---|---|---|
| POST | `/generate` | 🔒⏱ | Start a lead-gen job (vertical strategy); returns a `job_id` |
| GET | `/generate/{job_id}` | 🔒 | Poll job status/progress (bounded, idempotent, resumable) |
| GET | `/` | 🔒 | List leads — supports `q=` search, `source=`, `status=` filters |
| PATCH | `/{lead_id}` | 🔒 | Update a lead / assign to a campaign |
| DELETE | `/{lead_id}` | 🔒 | Delete a lead |

## Campaigns — `/api/campaigns`

| Method | Path | | Purpose |
|---|---|---|---|
| POST | `/` | 🔒 | Create campaign (daily cap clamped to plan) |
| GET | `/` | 🔒 | List campaigns |
| GET | `/{campaign_id}` | 🔒 | Campaign detail + per-lead send state |
| PATCH | `/{campaign_id}` | 🔒 | Edit / pause / resume |
| POST | `/{campaign_id}/send-now` | 🔒 | Queue a compliance-checked send batch |
| DELETE | `/{campaign_id}` | 🔒 | Delete campaign |

## Emails — `/api/emails`

| Method | Path | | Purpose |
|---|---|---|---|
| GET | `/log` | 🔒 | Sent/failed email log (per-tenant) |
| POST | `/preview` | 🔒 | AI-draft a personalized email for a lead (Groq, vertical prompt) |
| POST | `/check-replies` | 🔒 | IMAP reply check (gated; paid entitlement) |

## Analytics — `/api/analytics`

| Method | Path | | Purpose |
|---|---|---|---|
| GET | `/overview` | 🔒 | KPIs, funnel, daily sends, source/industry breakdowns |

## Payments — `/api/payments` (Cashfree; disabled-safe when unconfigured)

| Method | Path | | Purpose |
|---|---|---|---|
| GET | `/plans` | 🌐 | Plans + pricing for the caller's vertical |
| POST | `/create-order` | 🔒 | Create a Cashfree order for a plan upgrade |
| POST | `/verify` | 🔒 | Verify an order client-side after checkout |
| POST | `/webhook` | 🌐🔑 | Cashfree webhook — **HMAC-verified** before any plan change |
| GET | `/history` | 🔒 | This tenant's payment history |

## Compliance — `/api` (cold-email law is a feature)

| Method | Path | | Purpose |
|---|---|---|---|
| GET | `/unsubscribe` | 🌐 | One-click unsubscribe landing (signed token) |
| POST | `/unsubscribe` | 🌐 | Record the unsubscribe → suppression list |

## Growth — `/api`

| Method | Path | | Purpose |
|---|---|---|---|
| POST | `/feedback` | 🔒 | In-app feedback → own table + `ALERT_EMAIL` |
| POST | `/newsletter` | 🌐⏱ | Newsletter signup → own table (no third-party ESP) |

## System & internal

| Method | Path | | Purpose |
|---|---|---|---|
| GET | `/health` | 🌐 | Liveness + DB check → `{"status":"ok","db":"ok"}` (UptimeRobot target) |
| POST | `/internal/cron/tick` | 🔑 | Signed tick — drives due sends/follow-ups/lead-gen (GitHub Actions, D-001) |

---

**Cross-cutting guarantees** (see Part I guardrails + `docs/QUALITY.md`):
every protected query is filtered by the authenticated `user_id` (no exception);
stored integration secrets are Fernet-encrypted (`APP_ENCRYPTION_KEY`); sensitive
endpoints are rate-limited (Redis with in-memory fallback); CORS is an
allow-list; security headers + CSP are set; the Cashfree webhook is
HMAC-verified with a timestamp window.
