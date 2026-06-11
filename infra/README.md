# infra/

Server and edge tooling for the sovereign stack (master plan Part II).

Lands here in Phase 1:

- `server-setup.sh` — idempotent Oracle VM hardening (non-root sudo user, SSH
  key-only, ufw allow 22 only, fail2ban, unattended-upgrades, Docker Engine +
  compose plugin, log rotation, timezone).
- `deploy.sh` — `git pull → build → migrate → up -d → health-verify`, with rollback.
- `oracle-retry.sh` — periodic retry for "Out of capacity" instance creation.
- cloudflared ingress notes + the Caddy fallback config for non-Cloudflare hosts.

Lands here in Phase 11:

- `backup-now.sh`, `restore.sh` (nightly pg_dump + offsite rclone, tested restore).
- disk/RAM threshold alert cron script.
