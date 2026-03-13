import os
from dotenv import load_dotenv

load_dotenv()


def _get_env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _get_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


APP_ENV: str = _get_env("APP_ENV", "development").lower()
IS_PRODUCTION: bool = APP_ENV == "production"
ALLOW_DOCS: bool = _get_bool("ALLOW_DOCS", not IS_PRODUCTION)

DATABASE_URL: str = _get_env(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/reachflow",
)
REDIS_URL: str = _get_env("REDIS_URL", "redis://localhost:6379/0")

SUPABASE_URL: str = _get_env("SUPABASE_URL")
SUPABASE_ANON_KEY: str = _get_env("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET: str = _get_env("SUPABASE_JWT_SECRET")

GROQ_API_KEY: str = _get_env("GROQ_API_KEY")
CASHFREE_APP_ID: str = _get_env("CASHFREE_APP_ID")
CASHFREE_SECRET: str = _get_env("CASHFREE_SECRET_KEY")
CASHFREE_ENV: str = _get_env("CASHFREE_ENV", "TEST").upper()
CASHFREE_BASE_URL: str = (
    "https://sandbox.cashfree.com/pg"
    if CASHFREE_ENV == "TEST"
    else "https://api.cashfree.com/pg"
)
GOOGLE_MAPS_API_KEY: str = _get_env("GOOGLE_MAPS_API_KEY")
APOLLO_API_KEY: str = _get_env("APOLLO_API_KEY")
SENDER_NAME: str = _get_env("SENDER_NAME")
SENDER_EMAIL: str = _get_env("SENDER_EMAIL")
SENDER_PHONE: str = _get_env("SENDER_PHONE")
SENDER_LINKEDIN: str = _get_env("SENDER_LINKEDIN")
SENDER_ROLE: str = _get_env("SENDER_ROLE", "Professional")
GMAIL_PASSWORD: str = _get_env("GMAIL_PASSWORD")

FRONTEND_URL: str = _get_env("FRONTEND_URL", "http://localhost:3000")
FRONTEND_PREVIEW_REGEX: str = _get_env("FRONTEND_PREVIEW_REGEX")
API_URL: str = _get_env("API_URL", "http://localhost:8000")
APP_ENCRYPTION_KEY: str = _get_env("APP_ENCRYPTION_KEY")
