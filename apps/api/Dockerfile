# ReachFlow V2 API (arm64 + amd64). Non-root, migrate-on-start.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini entrypoint.sh ./
RUN chmod +x entrypoint.sh \
    && useradd --create-home --uid 10001 reachflow
USER reachflow

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; r=urllib.request.urlopen('http://localhost:8000/health', timeout=4); sys.exit(0 if r.status==200 else 1)"

CMD ["./entrypoint.sh"]
