#!/usr/bin/env bash
# deploy.sh — pull, build, migrate, restart, verify. With rollback.
#
# Run ON THE SERVER as the reachflow user:
#   ./infra/deploy.sh                  # deploy latest origin/<current branch>
#   ./infra/deploy.sh <ref>            # deploy a specific tag/branch/commit
#   ./infra/deploy.sh rollback         # redeploy the previously recorded good ref
#   ./infra/deploy.sh rollback <ref>   # redeploy an explicit ref
#
# Rollback model: every successful deploy records its commit in
# .last-good-deploy. `rollback` checks that (or the given ref) out and runs
# the same build→migrate→up→verify pipeline. DB migrations are forward-only —
# if a bad migration must be undone, restore last night's dump first
# (docs/RUNBOOK.md → Restore).

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"   # seconds to wait for healthy containers
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_FILE="$REPO_DIR/.last-good-deploy"

cd "$REPO_DIR"

log()  { echo -e "\033[1;32m[deploy]\033[0m $*"; }
fail() { echo -e "\033[1;31m[deploy]\033[0m $*" >&2; exit 1; }

[[ -f .env ]] || fail ".env missing — cp .env.example .env and fill it in."

current_commit() { git rev-parse --short=12 HEAD; }

verify_health() {
  log "waiting for containers to report healthy (timeout ${HEALTH_TIMEOUT}s)"
  local deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
  while true; do
    local unhealthy
    unhealthy=$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Service}} {{.Health}}' \
                | awk '$2 != "" && $2 != "healthy" {print $1"("$2")"}' | tr '\n' ' ')
    if [[ -z "$unhealthy" ]]; then
      log "all containers healthy"
      break
    fi
    if (( $(date +%s) > deadline )); then
      docker compose -f "$COMPOSE_FILE" ps
      fail "unhealthy after ${HEALTH_TIMEOUT}s: $unhealthy — see logs, then './infra/deploy.sh rollback'"
    fi
    sleep 5
  done

  # End-to-end check from inside the network: api /health must be 'ok'
  if docker compose -f "$COMPOSE_FILE" ps --services | grep -qx api; then
    local body
    body=$(docker compose -f "$COMPOSE_FILE" exec -T api \
      python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/health',timeout=5).read().decode())" \
      2>/dev/null) || fail "api /health unreachable"
    echo "$body" | grep -q '"status": *"ok"' || fail "api /health degraded: $body"
    log "api /health ok"
  fi
}

run_pipeline() {
  local ref="$1"
  log "deploying ref: $ref (was $(current_commit))"

  git fetch --all --tags --prune
  git checkout -q "$ref" 2>/dev/null || fail "unknown ref '$ref'"
  # if ref is a branch, fast-forward to its remote tip
  if git symbolic-ref -q HEAD >/dev/null; then
    git pull --ff-only
  fi
  log "now at $(current_commit) — $(git log -1 --format=%s)"

  log "building images"
  docker compose -f "$COMPOSE_FILE" build --pull

  # Migrations (no-op until Phase 2 introduces Alembic)
  if [[ -f apps/api/alembic.ini ]]; then
    log "running migrations"
    docker compose -f "$COMPOSE_FILE" run --rm api alembic upgrade head
  else
    log "no alembic.ini yet — skipping migrations (expected before Phase 2)"
  fi

  log "starting stack"
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

  verify_health

  current_commit > "$STATE_FILE"
  log "deploy OK — recorded $(cat "$STATE_FILE") as last good deploy"
}

case "${1:-}" in
  rollback)
    target="${2:-}"
    if [[ -z "$target" ]]; then
      [[ -f "$STATE_FILE" ]] || fail "no .last-good-deploy recorded; use: rollback <ref>"
      target=$(cat "$STATE_FILE")
    fi
    log "ROLLBACK to $target"
    run_pipeline "$target"
    ;;
  "")
    branch=$(git symbolic-ref --short -q HEAD || true)
    [[ -n "$branch" ]] || fail "detached HEAD — pass a ref explicitly"
    run_pipeline "$branch"
    ;;
  *)
    run_pipeline "$1"
    ;;
esac
