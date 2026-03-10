import os
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL:        str = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/reachflow")
REDIS_URL:           str = os.environ.get("REDIS_URL",    "redis://localhost:6379/0")

# Supabase — only URL needed for JWKS token verification
SUPABASE_URL:        str = os.environ.get("SUPABASE_URL",         "")
SUPABASE_ANON_KEY:   str = os.environ.get("SUPABASE_ANON_KEY",    "")
SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET",  "")   # legacy fallback

GROQ_API_KEY:        str = os.environ.get("GROQ_API_KEY",         "")
CASHFREE_APP_ID:     str = os.environ.get("CASHFREE_APP_ID",      "")
CASHFREE_SECRET:     str = os.environ.get("CASHFREE_SECRET_KEY",  "")
CASHFREE_ENV:        str = os.environ.get("CASHFREE_ENV",         "TEST")
CASHFREE_BASE_URL:   str = ("https://sandbox.cashfree.com/pg" if os.environ.get("CASHFREE_ENV","TEST") == "TEST" else "https://api.cashfree.com/pg")
GOOGLE_MAPS_API_KEY: str = os.environ.get("GOOGLE_MAPS_API_KEY",  "")
APOLLO_API_KEY:      str = os.environ.get("APOLLO_API_KEY",       "")
SENDER_NAME:         str = os.environ.get("SENDER_NAME",          "")
SENDER_EMAIL:        str = os.environ.get("SENDER_EMAIL",         "")
SENDER_PHONE:        str = os.environ.get("SENDER_PHONE",         "")
SENDER_LINKEDIN:     str = os.environ.get("SENDER_LINKEDIN",      "")
SENDER_ROLE:         str = os.environ.get("SENDER_ROLE",          "Professional")
GMAIL_PASSWORD:      str = os.environ.get("GMAIL_PASSWORD",       "")
FRONTEND_URL:        str = os.environ.get("FRONTEND_URL",         "http://localhost:3000")
API_URL:             str = os.environ.get("API_URL",              "http://localhost:8000")
