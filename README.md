# ReachFlow

ReachFlow is an AI-assisted outreach SaaS for lead discovery, campaign setup, email personalization, and performance tracking.

## Stack

- Frontend: Next.js 15, Supabase browser auth, responsive app shell
- Backend: FastAPI, SQLAlchemy, Celery, Redis
- Hosting: Vercel + Render + Supabase

## What Changed

- Hardened API behavior with stricter headers, origin controls, rate limits, and sanitized server errors
- Encrypted stored Gmail/Groq secrets with `APP_ENCRYPTION_KEY`
- Verified Cashfree webhooks before plan upgrades
- Added server-side Supabase middleware protection for app routes
- Reworked the UI for mobile responsiveness, motion, and a more premium landing/app experience
- Connected the product flow so leads can be assigned to campaigns and previewed before sending

## Local Setup

1. Copy `.env.example` to `.env`
2. Copy `frontend/.env.local.example` to `.env.local`
3. Install backend and frontend dependencies
4. Run the frontend and backend separately

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

## Production Notes

- Render needs both a `web` service and a `worker` service
- Render Key Value is required for Redis-backed background jobs
- Vercel needs the frontend env vars from `frontend/.env.local`
- Payments stay disabled until Cashfree credentials are added
- Live sending stays disabled until the client adds Gmail app-password credentials

See `DEPLOY.md` for the deployment checklist.
