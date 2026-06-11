# ReachFlow V2 API — Phase 0 stub image (arm64 + amd64).
# Phase 2 replaces this with the real multi-stage, non-root image.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request,sys; r=urllib.request.urlopen('http://localhost:8000/health', timeout=4); sys.exit(0 if r.status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
