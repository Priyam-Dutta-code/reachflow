#!/usr/bin/env python3
"""
ReachFlow — Start Script
Usage:
  python start.py           → validate keys + start backend + Celery worker
  python start.py --check   → validate keys only
  python start.py --backend → start API server only
  python start.py --worker  → start Celery worker only
"""

import os, sys, subprocess, threading
from pathlib import Path

ROOT = Path(__file__).parent
ENV  = ROOT / ".env"

REQUIRED_KEYS = [
    ("DATABASE_URL",        "Supabase DB URL",       "supabase.com → Settings → Database → URI"),
    ("SUPABASE_JWT_SECRET", "Supabase JWT secret",   "supabase.com → Settings → API → JWT Settings"),
    ("GROQ_API_KEY",        "Groq API key",          "console.groq.com → API Keys (free)"),
    ("SENDER_EMAIL",        "Your Gmail address",    "the Gmail you'll send from"),
    ("GMAIL_PASSWORD",      "Gmail app password",    "Google Account → Security → App Passwords"),
]

OPTIONAL_KEYS = [
    ("GOOGLE_MAPS_API_KEY", "Google Maps API (optional)"),
    ("APOLLO_API_KEY",      "Apollo.io API (optional)"),
    ("CASHFREE_APP_ID",     "Cashfree payments (optional)"),
    ("SUPABASE_URL",        "Supabase URL (optional for frontend)"),
]

RED   = "\033[91m"
GREEN = "\033[92m"
YELL  = "\033[93m"
BOLD  = "\033[1m"
RESET = "\033[0m"
DIM   = "\033[2m"


def load_env():
    if not ENV.exists():
        print(f"{RED}✗ .env file not found.{RESET}")
        print(f"  Run: {BOLD}cp .env.example .env{RESET}  then fill in your keys.\n")
        sys.exit(1)
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())


def mask(val: str) -> str:
    if len(val) <= 10:
        return "***"
    return val[:6] + "..." + val[-4:]


def validate() -> bool:
    print(f"\n{BOLD}ReachFlow — Key Validation{RESET}")
    print("─" * 46)
    ok = True
    for key, label, hint in REQUIRED_KEYS:
        val = os.environ.get(key, "")
        if val:
            print(f"  {GREEN}✓{RESET}  {label:<28} {DIM}{mask(val)}{RESET}")
        else:
            print(f"  {RED}✗{RESET}  {label:<28} {RED}MISSING{RESET}  → {DIM}{hint}{RESET}")
            ok = False
    for key, label in OPTIONAL_KEYS:
        val = os.environ.get(key, "")
        if val:
            print(f"  {GREEN}✓{RESET}  {label:<28} {DIM}{mask(val)}{RESET}")
        else:
            print(f"  {YELL}○{RESET}  {label:<28} {DIM}not set (skipped){RESET}")
    print()
    return ok


def start_backend():
    print(f"{GREEN}▶  Starting FastAPI backend on :8000 …{RESET}")
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=ROOT / "backend"
    )


def start_worker():
    print(f"{GREEN}▶  Starting Celery worker …{RESET}")
    subprocess.run(
        [sys.executable, "-m", "celery", "-A", "tasks", "worker", "--loglevel=info", "--concurrency=2"],
        cwd=ROOT / "backend"
    )


def install_deps():
    req = ROOT / "backend" / "requirements.txt"
    print(f"{DIM}Installing backend dependencies …{RESET}")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req), "-q"])


def main():
    args = sys.argv[1:]
    load_env()

    if "--check" in args:
        valid = validate()
        sys.exit(0 if valid else 1)

    valid = validate()
    if not valid:
        print(f"{RED}Fix missing keys in .env before starting.{RESET}\n")
        sys.exit(1)

    install_deps()

    if "--backend" in args:
        start_backend(); return
    if "--worker" in args:
        start_worker(); return

    # Start both in parallel threads
    print(f"\n{BOLD}Starting ReachFlow …{RESET}")
    t1 = threading.Thread(target=start_backend, daemon=True)
    t2 = threading.Thread(target=start_worker,  daemon=True)
    t1.start(); t2.start()

    print(f"""
  {GREEN}✓ Backend  →  http://localhost:8000{RESET}
  {GREEN}✓ API Docs →  http://localhost:8000/docs{RESET}
  {DIM}Worker running in background{RESET}

  {BOLD}Start frontend:{RESET}
    cd frontend && npm install && npm run dev
    → http://localhost:3000

  Press Ctrl+C to stop.
""")
    try:
        t1.join()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
