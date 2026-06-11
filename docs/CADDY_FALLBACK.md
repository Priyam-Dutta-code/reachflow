# Caddy fallback — running ReachFlow without Cloudflare

The 30-minute portability invariant must hold on hosts where Cloudflare
Tunnel isn't wanted or possible. This swaps `cloudflared` for **Caddy**
(automatic HTTPS via Let's Encrypt). Everything else in the stack is
unchanged.

Trade-off vs the tunnel: ports **80/443 must be open** on the host firewall
(and any cloud security list), and you lose Cloudflare's CDN/DDoS layer.

## 1. DNS

Point two records at the server's public IP at any DNS provider:

```
A  app.yourdomain.in    → <SERVER_IP>
A  stats.yourdomain.in  → <SERVER_IP>   # optional (Umami)
```

## 2. Caddyfile (`infra/caddy/Caddyfile`)

```caddyfile
app.yourdomain.in {
    encode gzip

    # The ONLY publicly exposed API path (Cashfree webhook)
    handle /api/payments/webhook* {
        reverse_proxy api:8000
    }

    handle {
        reverse_proxy web:3000
    }
}

# Optional, Phase 9:
# stats.yourdomain.in {
#     reverse_proxy umami:3000
# }
```

Caddy obtains and renews Let's Encrypt certificates automatically — no
certbot, no cron.

> Variant — staying on Cloudflare DNS (orange cloud) but without the tunnel:
> use a **Cloudflare Origin Certificate** (SSL/TLS → Origin Server → Create)
> instead of Let's Encrypt, save the cert+key under `infra/caddy/certs/`, and
> replace automatic HTTPS with `tls /certs/origin.pem /certs/origin-key.pem`
> in each site block. Keep SSL mode "Full (strict)".

## 3. Compose override (`compose.caddy.yml`)

```yaml
services:
  caddy:
    image: caddy:2-alpine            # arm64 ✓
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api

  cloudflared:
    deploy:
      replicas: 0                    # disable the tunnel

volumes:
  caddy_data:
  caddy_config:
```

## 4. Run

```bash
# open the firewall first (this host only — the Oracle/tunnel design stays 22-only)
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
# plus the cloud provider's security list/group if applicable

docker compose -f compose.prod.yml -f compose.caddy.yml up -d
curl -sI https://app.yourdomain.in | head -3
```

Security headers, rate limits, and CORS all live in the app layer
(FastAPI/Next), so nothing else needs reconfiguring.
