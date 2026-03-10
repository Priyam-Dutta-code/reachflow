# Deploy ReachFlow — Complete Guide

## What you'll end up with
- **Frontend**: `https://reachflow-yourname.vercel.app` (free, shareable, works on phone)
- **Backend**: running on your own server (self-hosted)
- **Auth**: Supabase — sessions last 60 days, auto-refresh, never breaks

---

## Part 1 — Supabase setup (5 min, free)

1. Go to **https://supabase.com** → Sign up → New Project
   - Name: `reachflow`
   - Set a strong database password
   - Region: closest to you (Singapore for India)
   - Wait ~1 min to spin up

2. Go to **Settings → API** → copy three values:
   ```
   Project URL       → SUPABASE_URL      (https://xxxx.supabase.co)
   anon public key   → SUPABASE_ANON_KEY (eyJ...)
   JWT Secret        → SUPABASE_JWT_SECRET (under "JWT Settings")
   ```

3. Go to **Settings → Database → Connection String → URI**
   Copy the URI → replace `[YOUR-PASSWORD]` with your DB password → this is `DATABASE_URL`

4. *(Optional but recommended)* Go to **Authentication → URL Configuration**:
   - Site URL: `https://reachflow-yourname.vercel.app`
   - Add to Redirect URLs: `https://reachflow-yourname.vercel.app/**`

---

## Part 2 — Self-host the backend on your server

### Requirements
- A server with Docker installed (Ubuntu 20.04+ recommended)
- Can be a VPS, your home server, or a cloud VM
- Minimum: 1 CPU, 512MB RAM, 5GB disk

### 2a — Get your server's IP

You need to know your server's public IP address.
- **Home server**: go to whatismyip.com from your server
- **VPS (DigitalOcean, AWS, etc.)**: shown in your dashboard

### 2b — Install Docker (if not already)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2c — Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/reachflow.git
cd reachflow
cp .env.example .env
nano .env   # fill in all values (see Part 1 for Supabase values)
```

### 2d — Edit nginx.conf for your server

Open `nginx/nginx.conf`. At the top of the HTTPS server block:
```nginx
server_name api.yourdomain.com;   ← replace with YOUR_SERVER_IP or domain
```

**If you don't have a domain yet**, use the HTTP-only fallback:
- Comment out the entire HTTPS `server` block
- Uncomment the HTTP-only block at the bottom of the file
- This gives you `http://YOUR_SERVER_IP:80`

### 2e — Start the stack

```bash
docker compose up -d
```

This starts: FastAPI backend + Celery worker + Celery beat + Redis + Nginx

Check it's working:
```bash
curl http://YOUR_SERVER_IP/health
# → {"status":"ok","service":"ReachFlow API v1.0"}
```

### 2f — Free HTTPS with Let's Encrypt (optional, needs a domain)

If you have a domain pointing to your server's IP:
```bash
# First, make sure nginx.conf has your domain name set correctly, then:
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d api.yourdomain.com \
  --email you@gmail.com \
  --agree-tos

docker compose restart nginx
```
SSL is now active. Your backend URL is `https://api.yourdomain.com`

---

## Part 3 — Deploy frontend to Vercel (5 min, free forever)

### 3a — Push code to GitHub

```bash
cd reachflow
git init
git add .
git commit -m "ReachFlow v1"
```

Go to **https://github.com/new** → create repo → then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/reachflow.git
git push -u origin main
```

### 3b — Deploy on Vercel

1. Go to **https://vercel.com** → Sign up with GitHub (free)
2. Click **Add New Project** → Import `reachflow` repo
3. **Root Directory**: set to `frontend`
4. Framework preset: **Next.js** (auto-detected ✓)
5. **Environment Variables** — add all three:

```
NEXT_PUBLIC_SUPABASE_URL      = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
NEXT_PUBLIC_API_URL           = http://YOUR_SERVER_IP:8000
                                (or https://api.yourdomain.com if you have SSL)
```

6. Click **Deploy** → wait ~2 minutes

🎉 **Your URL: `https://reachflow-yourname.vercel.app`**

Share this link. Works on any phone, on Google, anywhere.

---

## Part 4 — Connect them (1 min)

In your `.env` on the server, update:
```
FRONTEND_URL=https://reachflow-yourname.vercel.app
```

Then restart the backend:
```bash
docker compose restart backend worker beat
```

---

## Part 5 — Update Supabase redirect URLs

Go back to **Supabase → Authentication → URL Configuration**:
- Site URL: `https://reachflow-yourname.vercel.app`
- Redirect URLs: add `https://reachflow-yourname.vercel.app/**`

---

## Test checklist

- [ ] `http://YOUR_SERVER_IP/health` → `{"status":"ok"}`
- [ ] `https://reachflow-yourname.vercel.app` → landing page loads
- [ ] Sign up with email → verify email (Supabase sends it) → dashboard loads
- [ ] Close browser, reopen `https://reachflow-yourname.vercel.app/dashboard` → still logged in
- [ ] Wait 1 hour → still logged in (auto-refresh working ✓)
- [ ] Open on phone → works
- [ ] Share link with a friend → they can sign up

---

## Useful server commands

```bash
# View live logs
docker compose logs -f backend

# Restart everything
docker compose restart

# Update after code changes
git pull
docker compose up -d --build

# Check what's running
docker compose ps
```

---

## How Supabase auth works (why it never expires)

```
User signs in → Supabase issues two tokens:
  • Access token  — valid 1 hour  (sent to backend to verify)
  • Refresh token — valid 60 days (stored in browser cookies by @supabase/ssr)

@supabase/ssr watches the access token.
~10 minutes before it expires, it silently fetches a new one using the refresh token.
The user never sees this happen.

After 60 days, the user needs to log in again (once every 2 months).
```

No polling. No manual refresh. Zero auth surprises.

---

## Costs

| What | Service | Cost |
|------|---------|------|
| Frontend hosting | Vercel | **Free forever** |
| Auth + Database | Supabase | **Free** (500MB, 50K users) |
| Backend | Your server | Whatever you already pay |
| HTTPS cert | Let's Encrypt | **Free** |
| Domain (optional) | Namecheap .xyz | **~₹150/year** |

**Total: ₹0 forever** (unless you buy a domain)
