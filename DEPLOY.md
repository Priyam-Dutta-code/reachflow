# ReachFlow Deployment Guide

This project is set up for:

- Frontend on Vercel
- Backend API on Render
- Database/Auth on Supabase

Free-mode deployment:

- no Render worker required
- no Redis required
- background jobs run inside the web service

Later upgrade path:

- set `ENABLE_BACKGROUND_WORKER=true`
- add Render Key Value / Redis
- add a dedicated Render worker

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
ENABLE_BACKGROUND_WORKER=false
APP_ENCRYPTION_KEY=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
FRONTEND_URL=
API_URL=
```

Optional in free mode:

```env
REDIS_URL=
GROQ_API_KEY=
SENDER_EMAIL=
GMAIL_PASSWORD=
GOOGLE_MAPS_API_KEY=
APOLLO_API_KEY=
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_ENV=PROD
```

## 3. How Free Mode Works

When `ENABLE_BACKGROUND_WORKER=false`:

- lead generation jobs run in-process
- campaign send jobs run in-process
- reply-check jobs run in-process when triggered manually

Tradeoff:

- jobs are less reliable than a dedicated worker
- long-running jobs should be kept small for now
- fully automatic scheduled follow-ups should be considered a later upgrade

## 4. Supabase

Collect:

- project URL
- publishable key
- database connection string

Use the project URL in both frontend and backend envs.

## 5. Later Upgrade Path

When clients start paying:

1. Add Render Key Value
2. Set `REDIS_URL`
3. Set `ENABLE_BACKGROUND_WORKER=true` on the backend
4. Add a Render worker with:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: celery -A tasks worker --loglevel=info --concurrency=2
```

## 6. Optional Client-Owned Credentials

These can be added later and do not block the base deploy:

- `GROQ_API_KEY`
- `SENDER_EMAIL`
- `GMAIL_PASSWORD`
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`

## 7. Post-Deploy Checks

- backend `/health` returns `200`
- frontend loads on desktop and mobile
- sign up and login work
- dashboard, leads, campaigns, analytics, and settings pages load
- lead generation endpoint responds
- campaign send endpoint responds

## 8. Important Safety Note

Do not commit:

- `.env`
- `frontend/.env.local`

Only the example env files should stay in git.
