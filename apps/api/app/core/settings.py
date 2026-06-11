"""Environment-driven configuration, validated at boot (pydantic-settings)."""
from functools import lru_cache
from typing import Literal

from pydantic import computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDERS = {"", "replace_me", "changeme", "change_me"}


def _normalize_db_url(url: str) -> str:
    """Accept postgres:// (Render/Supabase) and postgresql:// forms; pin the
    psycopg3 driver. SQLite URLs pass through untouched (tests)."""
    url = (url or "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── Core ────────────────────────────────────────────────────────
    app_env: Literal["development", "test", "production"] = "development"
    app_url: str = "http://localhost:3000"
    api_internal_url: str = "http://localhost:8000"

    # ── Data stores ─────────────────────────────────────────────────
    database_url: str = "postgresql://reachflow:reachflow_dev@localhost:5432/reachflow"
    redis_url: str = ""  # empty = disabled (Render free mode); set in compose

    # ── Secrets ─────────────────────────────────────────────────────
    jwt_secret: str = ""
    app_encryption_key: str = ""
    cron_secret: str = ""  # protects /internal/cron/* tick endpoints

    # ── Auth tuning (Phase 3) ───────────────────────────────────────
    access_token_minutes: int = 15
    refresh_token_days: int = 30

    # ── Auth email (Phase 3) ────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = ""

    # ── Integrations ────────────────────────────────────────────────
    groq_api_key: str = ""
    google_maps_api_key: str = ""
    apollo_api_key: str = ""
    cashfree_app_id: str = ""
    cashfree_secret_key: str = ""
    cashfree_env: Literal["TEST", "PROD"] = "TEST"
    cashfree_webhook_secret: str = ""

    # ── Behavior flags ──────────────────────────────────────────────
    enable_background_worker: bool = False  # true in compose; false on Render
    enable_selenium_sources: bool = False
    allow_docs: bool | None = None  # default: docs only outside production

    @field_validator("database_url")
    @classmethod
    def _v_db(cls, v: str) -> str:
        return _normalize_db_url(v)

    @field_validator("cashfree_env", mode="before")
    @classmethod
    def _v_cf_env(cls, v: str) -> str:
        return (v or "TEST").strip().upper()

    # ── Derived ─────────────────────────────────────────────────────
    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def docs_enabled(self) -> bool:
        return self.allow_docs if self.allow_docs is not None else not self.is_production

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cashfree_base_url(self) -> str:
        return (
            "https://sandbox.cashfree.com/pg"
            if self.cashfree_env == "TEST"
            else "https://api.cashfree.com/pg"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        origins = {"http://localhost:3000", "http://127.0.0.1:3000"}
        app_url = self.app_url.strip().rstrip("/")
        if app_url:
            origins.add(app_url)
        return sorted(origins)

    def boot_problems(self) -> list[str]:
        """Hard requirements in production; warnings elsewhere."""
        problems: list[str] = []
        if self.app_encryption_key.strip().lower() in PLACEHOLDERS:
            problems.append("APP_ENCRYPTION_KEY is not set")
        if self.jwt_secret.strip().lower() in PLACEHOLDERS:
            problems.append("JWT_SECRET is not set")
        return problems


@lru_cache
def get_settings() -> Settings:
    return Settings()
