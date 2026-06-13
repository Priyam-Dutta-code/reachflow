# ReachFlow — API Map (V1, historical)

> ⚠️ **Superseded.** This maps the **V1** Supabase-auth API. The current V2 API
> reference is [`API.md`](API.md). Kept only for the salvage/orientation record.

> Generated during Phase 0 orientation. Source of truth: `backend/main.py` + `backend/routers/*`.
> All paths are mounted under the FastAPI app. The frontend never calls the backend directly —
> it goes through the Next proxy at `/api/proxy/[...path]` (`frontend/app/api/proxy/[...path]/route.ts`),
> which forwards to `NEXT_PUBLIC_API_URL`. `frontend/lib/api.ts#apiFetch` attaches the Supabase
> `Authorization: Bearer <access_token>` header.

## Request spine

```
Browser (Supabase session)
  → apiFetch() attaches Bearer token         (lib/api.ts)
  → /api/proxy/<path>                         (Next route handler, runtime=nodejs)
  → fetch NEXT_PUBLIC_API_URL/<path>          (forwards auth/content-type/cashfree headers)
  → FastAPI router                            (verify_token → get_current_user)
```

## Auth model

- `get_current_user` (in `routers/auth.py`) is the dependency used by every protected route.
- It verifies the Supabase JWT via JWKS (preferred) or `SUPABASE_JWT_SECRET` (legacy fallback).
- It **auto-creates** a `User` row on first authenticated request (lazy provisioning — there is no
  explicit "register user in our DB" endpoint), migrates plaintext secrets to encrypted, and
  normalizes the vertical/plan.
- Multi-tenant scoping: every query filters on `current_user.id`.

Legend: 🔒 = requires `Authorization: Bearer` · 🌐 = public · ⏱ = rate limited

---

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | 🌐 | `{status, service, version}` |

## Auth — `/api/auth`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/auth/me` | 🔒 | – | `_user_dict`: id, email, name, vertical, vertical_config, plan, plan_key, plan_name, credits, leads_quota, leads_used, emails_sent, sender_*, onboarded, has_gmail_password, has_groq_api_key, missing_setup[], entitlements |
| POST | `/api/auth/onboard` | 🔒 ⏱8/60s | `OnboardRequest` (name, vertical, sender_name, sender_email required; sender_phone/linkedin/profile/role, gmail_password, groq_api_key optional) | `{message, user}` |
| PATCH | `/api/auth/profile` | 🔒 ⏱20/60s | `ProfileUpdate` (all optional; changing `vertical` remaps plan/quota/credits) | `{message, user}` |

Secrets (`gmail_password`, `groq_api_key`) are encrypted via `secret_manager.encrypt` before storage and **never** returned in plaintext (only `has_*` booleans).

## Leads — `/api/leads`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/leads/generate` | 🔒 ⏱6/60s | `LeadGenRequest` (source=auto, query req, location, industry, audience, offer, goal, method, portal, max≤200, campaign_id) | If worker enabled: `{message, status:"running", max_results}`. Else synchronous: `{...result, message, max_results}` (added, duplicates_skipped, source_used, resources_used, warning). 402 if quota exhausted. |
| GET | `/api/leads/` | 🔒 | query: page≥1, per_page≤100, status, campaign_id | `{total, page, per_page, leads[]}` |
| PATCH | `/api/leads/{id}` | 🔒 | `LeadUpdate` (name, email, company, title, notes, status, campaign_id) | `_lead_dict` |
| DELETE | `/api/leads/{id}` | 🔒 | – | `{deleted:true}` |

Quota: `remaining = leads_quota - leads_used`; generation is capped to remaining. Enforced server-side.

## Campaigns — `/api/campaigns`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/campaigns/` | 🔒 | `CampaignCreate` (name req, description, emails_per_day 1-1000, send_time HH:MM, follow_up_days 1-30) | `_camp_dict`. 402 over campaign_slots; 400 over daily_send_cap. |
| GET | `/api/campaigns/` | 🔒 | – | `[_camp_dict]` (recomputes stats each call) |
| PATCH | `/api/campaigns/{id}` | 🔒 | `CampaignUpdate` (+ status) | `_camp_dict` |
| POST | `/api/campaigns/{id}/send-now` | 🔒 ⏱4/60s | – | `{message, eligible_leads}`. 402 no credits; 400 no sender/Gmail or no eligible leads. Queues background batch. |
| DELETE | `/api/campaigns/{id}` | 🔒 | – | `{deleted:true}` |

`_camp_dict`: id, name, description, status, emails_per_day, send_time, follow_up_days, total_leads, total_sent, total_replied, total_bounced, eligible_leads, daily_cap, created_at.

## Emails — `/api/emails`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/emails/preview` | 🔒 ⏱15/60s | `{lead_id}` | `{subject, body, to, company}` (AI-generated, vertical-aware) |
| POST | `/api/emails/check-replies` | 🔒 ⏱4/300s | – | `{message}`. 402 unless `reply_checks` entitlement. Runs IMAP reply scan in background. |

## Analytics — `/api/analytics`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/analytics/overview` | 🔒 | vertical, plan, plan_key, plan_name, entitlements, total_leads, with_email, sent, replied, bounced, follow_ups, pending, ready_to_send, campaigns_count, active_campaigns, draft_campaigns, reply_rate, credits_left, leads_quota, leads_used, sources[], industries[], daily_sends[], funnel[] |

This single endpoint feeds **both** the dashboard and the analytics page.

## Payments — `/api/payments`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/payments/create-order` | 🔒 ⏱8/300s | `{plan}` (plan or topup id) | `{order_id, payment_session_id, amount, plan_name, vertical, cashfree_env}`. 500 if Cashfree not configured. |
| POST | `/api/payments/verify` | 🔒 ⏱20/300s | `{order_id, plan}` | `{success, plan, vertical}`. Verifies order PAID with Cashfree, then upgrades. |
| POST | `/api/payments/webhook` | 🌐 (HMAC) | Cashfree payload + `x-webhook-signature`/`x-webhook-timestamp` | `{received:true}`. 401 on bad signature (±900s window). |
| GET | `/api/payments/plans` | 🌐 | query: vertical | `{vertical, vertical_config, plans[], credits(topup)}` |

---

## Background jobs (`backend/tasks.py`)

In-process (`ENABLE_BACKGROUND_WORKER=false`) via FastAPI `BackgroundTasks`, or Celery/Redis when enabled.

| Job | Trigger | Effect |
|---|---|---|
| `run_lead_gen_task` | POST /leads/generate (worker mode) | scrape + enrich + dedupe + insert leads, bump `leads_used` |
| `run_campaign_batch` | POST /campaigns/{id}/send-now | generate+send per pending lead, write `EmailLog`, decrement credits, `time.sleep(60)` between sends |
| `run_followup_check` | POST /emails/check-replies + Celery beat (daily) | IMAP reply scan + send follow-ups after `follow_up_days` |

## Notable behaviors / gotchas (carry into Phase 1)

- **Lead generation runs synchronously in free mode** and `scrape_*` functions can take a long time
  (multiple HTTP fetches per lead, `time.sleep` calls). The HTTP request blocks until done.
- `send-now` always uses `background_tasks` even in worker-disabled mode, and sleeps 60s between sends
  → a campaign send holds a worker thread for minutes.
- `LeadGenSource` enum in the router (`auto/google_maps/linkedin/apollo/job_portal/web_search`) differs
  from the DB `LeadSource` enum (`google_maps/linkedin_selenium/apollo/naukri/indeed/linkedin_jobs/web_search/manual`).
- Analytics `daily_sends` uses `func.date(...)` — fine on Postgres/SQLite.
- No dedicated endpoints yet for: unsubscribe, CSV export, campaign detail (per-lead list), payment history,
  account deletion, password reset — these are introduced in later phases.
