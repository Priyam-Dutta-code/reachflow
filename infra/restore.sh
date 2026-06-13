#!/usr/bin/env bash
# restore.sh — decrypt + restore a backup produced by backup-now.sh or the
# backup.yml Action. DESTRUCTIVE: it restores into TARGET_DATABASE_URL.
#
# Usage:
#   ./infra/restore.sh <file.sql.gz.enc>          # restore into TARGET_DATABASE_URL
#   ./infra/restore.sh <file> --drill             # restore into a scratch DB and
#                                                   verify row counts, then drop it
# Env:
#   BACKUP_PASSPHRASE       decryption passphrase (required)
#   TARGET_DATABASE_URL     where to restore (required unless --drill provides one)
#   DRILL_DATABASE_URL      scratch DB for --drill (required with --drill)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$REPO_DIR/.env" ]] && set -a && . "$REPO_DIR/.env" && set +a || true

FILE="${1:?usage: restore.sh <file.sql.gz.enc> [--drill]}"
MODE="${2:-restore}"
: "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE}"
[[ -f "$FILE" ]] || { echo "no such file: $FILE" >&2; exit 1; }

if [[ "$MODE" == "--drill" ]]; then
  TARGET="${DRILL_DATABASE_URL:?set DRILL_DATABASE_URL for a drill (a scratch DB)}"
  echo "[restore] DRILL into $TARGET"
else
  TARGET="${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL}"
  echo "[restore] !! restoring into $TARGET (destructive)"
  read -r -p "Type 'restore' to confirm: " ok
  [[ "$ok" == "restore" ]] || { echo "aborted."; exit 1; }
fi

echo "[restore] decrypting + loading…"
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$FILE" \
  | gunzip \
  | psql "$TARGET" -v ON_ERROR_STOP=1 -q

if [[ "$MODE" == "--drill" ]]; then
  users=$(psql "$TARGET" -tAc "SELECT count(*) FROM users" 2>/dev/null || echo "?")
  leads=$(psql "$TARGET" -tAc "SELECT count(*) FROM leads" 2>/dev/null || echo "?")
  echo "[restore] drill OK — users=$users leads=$leads (verify these look right)"
  echo "[restore] remember to drop/recreate the scratch DB afterwards."
else
  echo "[restore] complete. Run: alembic upgrade head (in case the dump predates a migration)."
fi
