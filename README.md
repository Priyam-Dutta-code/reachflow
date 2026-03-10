# ReachFlow

AI-powered cold outreach automation. Generates leads, writes personalised emails, sends them and follows up — automatically.

**Live demo setup:** Deploy in ~20 minutes → share `https://reachflow.vercel.app` with anyone.

---

## Auth

Uses **custom JWT** stored in httpOnly cookies. Sessions last **30 days**. No Supabase, no third-party auth service, no token expiry surprises.

---

## Quick Start (local)

```bash
cp .env.example .env       # fill in your values (5 min)
python start.py --check    # validate all keys
python start.py            # start backend + worker

cd frontend
npm install
npm run dev                # → http://localhost:3000
```

---

## Deploy to Production (get a public URL)

### Step 1 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → sign up free
2. New Project → Deploy from GitHub → select your repo → select `backend/` folder
3. Add a **Redis** service to the same project (click +, search Redis)
4. In the backend service → **Variables** tab, add every key from your `.env`:

```
DATABASE_URL        = <your postgres URL>
JWT_SECRET          = <run: python -c "import secrets; print(secrets.token_hex(32))">
GROQ_API_KEY        = gsk_...
SENDER_EMAIL        = you@gmail.com
GMAIL_PASSWORD      = xxxx xxxx xxxx xxxx
SENDER_NAME         = Your Name
SENDER_ROLE         = Software Engineer
CASHFREE_APP_ID     = ...
CASHFREE_SECRET_KEY = ...
CASHFREE_ENV        = TEST
FRONTEND_URL        = https://reachflow.vercel.app   ← set AFTER step 2
```

5. Railway will give you a URL like `https://reachflow-api-production.railway.app`
6. Copy that URL — you'll need it in step 2.

---

### Step 2 — Deploy Frontend to Vercel (free .vercel.app domain)

1. Go to [vercel.com](https://vercel.com) → sign up free with GitHub
2. New Project → import your repo → set **Root Directory** to `frontend`
3. Framework: **Next.js** (auto-detected)
4. Add these **Environment Variables**:

```
NEXT_PUBLIC_API_URL = https://reachflow-api-production.railway.app
```

5. Deploy → Vercel gives you: **`https://reachflow.vercel.app`** 🎉

That's your shareable link. Works on mobile, on Google, anywhere.

---

### Step 3 — Connect them

Go back to Railway → backend service → Variables → update:
```
FRONTEND_URL = https://reachflow.vercel.app
API_URL      = https://reachflow-api-production.railway.app
```
Redeploy backend (click Deploy in Railway).

---

### Step 4 — Custom domain (optional, ~₹150/year)

Want `reachflow.xyz` instead of `reachflow.vercel.app`?

1. Buy domain at [namecheap.com](https://namecheap.com) (~₹150/year for `.xyz`)
2. In Vercel → your project → Domains → Add Domain → type `reachflow.xyz`
3. Vercel shows you 2 DNS records → add them in Namecheap → DNS → Advanced DNS
4. Done in ~10 minutes. HTTPS is automatic.

---

## Environment Variables Reference

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `DATABASE_URL` | [supabase.com](https://supabase.com) → Settings → Database → URI | ✓ |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_hex(32))"` | ✓ |
| `REDIS_URL` | Auto-set by Railway Redis service | ✓ |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys | ✓ |
| `SENDER_EMAIL` | Your Gmail address | ✓ |
| `GMAIL_PASSWORD` | [Google App Password](https://myaccount.google.com/apppasswords) | ✓ |
| `CASHFREE_APP_ID` | [merchant.cashfree.com](https://merchant.cashfree.com) → Developers | optional |
| `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | optional |
| `APOLLO_API_KEY` | [apollo.io](https://app.apollo.io) → Settings → API | optional |

---

## File Structure

```
reachflow/
├── .env.example              ← copy to .env and fill in
├── start.py                  ← local dev: validate + start everything
├── docker-compose.yml        ← alternative to Railway
│
├── backend/
│   ├── config.py             ← all env vars, single source of truth
│   ├── database.py           ← SQLAlchemy models
│   ├── main.py               ← FastAPI app
│   ├── tasks.py              ← Celery background workers
│   ├── railway.json          ← Railway deployment config
│   ├── Procfile              ← process definitions
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py           ← register/login/logout — custom JWT, 30-day sessions
│   │   ├── leads.py
│   │   ├── campaigns.py
│   │   ├── emails.py
│   │   ├── analytics.py
│   │   └── payments.py       ← Cashfree (UPI, cards, net banking)
│   └── services/
│       ├── ai_service.py     ← Groq email generation
│       └── lead_gen_service.py
│
└── frontend/
    ├── vercel.json           ← Vercel deployment config
    ├── middleware.ts         ← route protection (server-side)
    ├── lib/
    │   ├── api.ts            ← fetch wrapper (cookie-based, no tokens)
    │   └── auth.tsx          ← AuthContext (calls /api/auth/me)
    ├── app/
    │   ├── page.tsx          ← landing page
    │   ├── login/page.tsx    ← login form
    │   ├── signup/page.tsx   ← 2-step signup
    │   ├── dashboard/page.tsx
    │   ├── leads/page.tsx
    │   ├── campaigns/page.tsx
    │   ├── analytics/page.tsx
    │   └── pricing/page.tsx
    └── components/Shell.tsx  ← sidebar layout
```

---

## How Auth Works (no expiry issues)

```
User logs in → backend creates JWT (30-day) → set as httpOnly cookie
↓
Every page load → browser sends cookie automatically → backend verifies
↓  
User stays logged in for 30 days without doing anything
↓
After 30 days → just log in again (< 10 seconds)
```

No Supabase. No refresh tokens. No expiry surprises.

---

## Costs

| Service | Free tier | What you get |
|---------|-----------|-------------|
| Vercel | Free forever | Frontend hosting + `yourapp.vercel.app` |
| Railway | $5 credit/month | Backend + Redis (enough for ~200hrs) |
| Supabase | 500MB free | PostgreSQL database |
| Groq | Free tier | ~14,400 requests/day |
| Cashfree | Free | Accept INR payments |
| Domain | ~₹150/year | Optional custom domain |

**Total: ₹0–150/month** to run a full production SaaS.
