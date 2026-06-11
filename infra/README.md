# infra/

Server and edge tooling for the sovereign stack (master plan Part II).

| File | Purpose |
|---|---|
| `server-setup.sh` | Idempotent VM hardening + Docker install (run once as root; see `docs/SETUP_ORACLE.md` §4) |
| `deploy.sh` | `git pull → build → migrate → up -d → health-verify`, plus `rollback` (see `docs/RUNBOOK.md`) |
| `oracle-retry.sh` | Retries A1.Flex creation across availability domains when Oracle is out of capacity |

Related docs: `docs/SETUP_ORACLE.md`, `docs/SETUP_CLOUDFLARE.md`,
`docs/CADDY_FALLBACK.md` (non-Cloudflare portability), `docs/RUNBOOK.md`.

Lands here in Phase 11: `backup-now.sh`, `restore.sh`, disk/RAM alert cron.
