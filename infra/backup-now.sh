#!/usr/bin/env bash
# backup-now.sh — encrypted Postgres dump + offsite copy. Run on demand or
# from cron; the GitHub Actions backup.yml uses the same dump/encrypt format,
# so restore.sh reads either.
#
# Env (or .env in repo root):
#   DATABASE_URL        Postgres connection string (required)
#   BACKUP_PASSPHRASE   encryption passphrase (required — needed to restore)
#   BACKUP_REMOTE       rclone remote, e.g. r2:reachflow-backups (optional;
#                       local-only if unset)
#   BACKUP_DIR          local dir for dumps (default ./backups)
#   BACKUP_KEEP_DAYS    local retention (default 14)
#
# Usage: ./infra/backup-now.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$REPO_DIR/.env" ]] && set -a && . "$REPO_DIR/.env" && set +a || true

: "${DATABASE_URL:?set DATABASE_URL}"
: "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE (you need it to restore)}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$BACKUP_DIR/reachflow-${stamp}.sql.gz.enc"

echo "[backup] dumping → $file"
pg_dump "$DATABASE_URL" --no-owner --no-privileges \
  | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE \
  > "$file"
echo "[backup] size: $(du -h "$file" | cut -f1)"

if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  echo "[backup] pushing → $BACKUP_REMOTE"
  rclone copy "$file" "$BACKUP_REMOTE/" --no-traverse
  rclone delete "$BACKUP_REMOTE/" --min-age "${BACKUP_KEEP_DAYS}d" --include "reachflow-*.sql.gz.enc" || true
fi

# local retention
find "$BACKUP_DIR" -name "reachflow-*.sql.gz.enc" -mtime "+${BACKUP_KEEP_DAYS}" -delete 2>/dev/null || true
echo "[backup] done."
