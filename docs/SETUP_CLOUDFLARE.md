# Cloudflare setup — click-by-click runbook [HUMAN: Priyam]

Goal: a domain on Cloudflare DNS + a **Cloudflare Tunnel** carrying all web
traffic to the server with **zero open web ports**. Time: ~25 min once you
own a domain.

> Terms verified 2026-06-11: Cloudflare Tunnel is free with no usage caps;
> the Zero Trust free plan covers 50 users / 1,000 tunnels — far beyond our
> needs. No credit card required.

---

## 1. Get a domain (the one recommended spend, ~₹100–900/yr)

Pick one (Appendix E decision #1 — default **buy a cheap .in/.com**):

- **Buy:** Cloudflare Registrar sells at cost but **cannot register .in** —
  for `.in` use GoDaddy/Hostinger/BigRock (₹100–500 first year; check renewal
  price!) and for `.com`, Cloudflare Registrar (after the zone is added) or
  Porkbun (~$10/yr) are the no-games options.
- **Free fallback (dev-grade, weak for selling):** a DuckDNS / afraid.org
  subdomain, or a temporary `*.trycloudflare.com` quick tunnel. The runbook
  below assumes a real domain; the free-subdomain path skips §2–3 and uses
  `cloudflared tunnel --url http://web:3000` (no account needed, URL changes
  every restart — demo only).

Suggested: `reachflow.in` or `getreachflow.com` — short, brandable, cheap.

## 2. Add the domain to Cloudflare

1. <https://dash.cloudflare.com> → Sign up (free plan).
2. **Add a domain** → enter `yourdomain.in` → select the **Free** plan.
3. Cloudflare shows two nameservers (e.g. `ada.ns.cloudflare.com`,
   `bob.ns.cloudflare.com`).
4. At your registrar: domain management → Nameservers → **replace** the
   defaults with those two. Propagation: minutes to ~24 h (usually < 1 h).
5. Wait for the "domain is active" email / dashboard banner.

### Recommended zone settings (dashboard, 2 min)

- SSL/TLS → Overview → mode **Full (strict)** (harmless with a tunnel; safe
  default if you ever add an origin).
- SSL/TLS → Edge Certificates → **Always Use HTTPS: On**, Minimum TLS 1.2.
- Speed → Optimization → leave defaults (Brotli on).

## 3. Create the Tunnel

1. Dashboard → **Zero Trust** (left nav) → first visit asks for a team name —
   anything (`reachflow`), pick the **Free** plan.
2. **Networks → Tunnels → Create a tunnel** → connector type **Cloudflared**.
3. Name: `reachflow-prod` → **Save tunnel**.
4. The next screen shows install commands containing a long **token**
   (`eyJ...`). **Copy the token only** — we run cloudflared via Docker, not
   the package install. Put it on the server in `.env`:
   `CLOUDFLARE_TUNNEL_TOKEN=eyJ...`
5. Don't close the wizard yet — add the public hostnames (next section), or
   add them later under the tunnel's **Public Hostname** tab.

## 4. Public hostnames (ingress rules) — order matters

Tunnel → **Public Hostname** tab → *Add a public hostname*, creating these
**in this order** (first match wins):

| # | Subdomain | Domain | Path | Service |
|---|---|---|---|---|
| 1 | `app` | yourdomain.in | `api/payments/webhook*` | `http://api:8000` |
| 2 | `app` | yourdomain.in | *(empty)* | `http://web:3000` |
| 3 (optional, Phase 9) | `stats` | yourdomain.in | *(empty)* | `http://umami:3000` |

Notes:

- `api:8000` / `web:3000` resolve because the `cloudflared` container runs on
  the same Docker network as the stack (`compose.prod.yml`).
- Rule 1 is the **only** path where the API is publicly reachable — exactly
  what the Cashfree webhook needs. Everything else hits the Next.js app,
  which talks to the API internally via the proxy route.
- Creating a hostname auto-creates the proxied DNS record (orange cloud).
  Don't create A/CNAME records for `app` manually.
- Marketing on the apex (`yourdomain.in` → web) can be added the same way
  later; the plan's canonical entry point is `app.<domain>`.

## 5. Bring the tunnel up on the server

```bash
cd ~/reachflow
cp .env.example .env && nano .env     # set CLOUDFLARE_TUNNEL_TOKEN=... (+ POSTGRES_PASSWORD)
docker compose -f compose.prod.yml up -d --build
docker compose -f compose.prod.yml logs cloudflared --tail 20
# expect: "Registered tunnel connection" ×4
```

The Zero Trust dashboard shows the tunnel **HEALTHY** (green).

## 6. Verify (the Phase 1 acceptance checks)

From any machine:

```bash
# 1. App over HTTPS through Cloudflare
curl -sI https://app.yourdomain.in | head -5          # HTTP/2 200, server: cloudflare

# 2. Webhook path reaches the API...
curl -s https://app.yourdomain.in/api/payments/webhook -X POST   # api responds (405/422 — fine, it's FastAPI)

# 3. ...but no other API route is exposed
curl -s https://app.yourdomain.in/health               # served by WEB (stub JSON), not the api
curl -s https://app.yourdomain.in/api/auth/me          # 404 from web — api unreachable ✓

# 4. Zero open web ports on the origin
nmap -p 80,443,8000,3000 <SERVER_PUBLIC_IP>            # all filtered/closed; only 22 open
```

## 7. Operational notes

- **Token rotation:** Tunnel → ⋯ → Rotate token → update `.env` → 
  `docker compose -f compose.prod.yml up -d cloudflared`.
- **Tunnel delete/recreate** is cheap; ingress rules live in the dashboard,
  nothing on disk except the token.
- **Portability:** the tunnel is the only Cloudflare-coupled piece. For any
  non-Cloudflare host, swap the `cloudflared` service for Caddy per
  `docs/CADDY_FALLBACK.md` — nothing else in the stack changes.

## Done when

- [ ] Domain active on Cloudflare, nameservers switched
- [ ] Tunnel HEALTHY with the two `app.` hostname rules (webhook → api, rest → web)
- [ ] All four §6 checks pass
- [ ] `CLOUDFLARE_TUNNEL_TOKEN` lives only in the server's `.env` (never in git)
