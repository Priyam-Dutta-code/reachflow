# ReachFlow Deployment Guide

This project is set up for:

- Frontend on Vercel
- Backend API on Render
- Celery worker on Render
- Database/Auth on Supabase
- Redis via Render Key Value

## 1. Frontend on Vercel

Root directory:

```text
frontend
```

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=
```

## 2. Backend API on Render

Use the web service from [`render.yaml`](./render.yaml).

Required environment variables:

```env
APP_ENV=production
APP_ENCRYPTION_KEY=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
REDIS_URL=
FRONTEND_URL=
API_URL=
```

Optional for full product behavior:

```env
GROQ_API_KEY=
SENDER_EMAIL=
GMAIL_PASSWORD=
GOOGLE_MAPS_API_KEY=
APOLLO_API_KEY=
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_ENV=PROD
```

## 3. Render Worker

The worker is required. Without it, lead generation and campaign jobs will queue but not run.

Use the worker service from [`render.yaml`](./render.yaml):

```text
celery -A tasks worker --loglevel=info --concurrency=2
```

It must use the same environment variables as the backend API.

## 4. Supabase

Collect:

- project URL
- publishable key
- database connection string

Use the project URL in both frontend and backend envs.

## 5. Render Key Value

Create a Render Key Value instance in the same region as the backend.

Copy the internal connection string into:

```env
REDIS_URL=
```

Recommended eviction policy: `noeviction`

## 6. Optional Client-Owned Credentials

These can be added later by the client and do not block the base deploy:

- `GROQ_API_KEY`
- `SENDER_EMAIL`
- `GMAIL_PASSWORD`
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`

## 7. Post-Deploy Checks

- Backend health URL returns `200`
- Frontend loads on desktop and mobile
- Sign up and login work
- Dashboard, leads, campaigns, analytics, and settings pages load
- Worker is online in Render
- Lead generation tasks move through Redis/worker when optional source credentials are present

## 8. Important Safety Note

Do not commit:

- `.env`
- `frontend/.env.local`

Only the example env files should stay in git.
