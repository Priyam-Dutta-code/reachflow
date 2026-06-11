#!/bin/sh
# Migrate, then serve. Used by the Docker image and by Render's start command.
set -e

echo "[entrypoint] alembic upgrade head"
alembic upgrade head

echo "[entrypoint] starting uvicorn on :${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
