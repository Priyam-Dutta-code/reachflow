from app.core.settings import Settings, _normalize_db_url


def test_db_url_normalization():
    assert _normalize_db_url("postgres://u:p@h:5432/db") == "postgresql+psycopg://u:p@h:5432/db"
    assert _normalize_db_url("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert _normalize_db_url("postgresql+psycopg://u@h/db") == "postgresql+psycopg://u@h/db"
    assert _normalize_db_url("sqlite:///x.db") == "sqlite:///x.db"


def test_boot_problems_flag_placeholders():
    s = Settings(app_encryption_key="replace_me", jwt_secret="")
    problems = s.boot_problems()
    assert any("APP_ENCRYPTION_KEY" in p for p in problems)
    assert any("JWT_SECRET" in p for p in problems)

    s = Settings(app_encryption_key="real-key", jwt_secret="real-secret")
    assert s.boot_problems() == []


def test_derived_fields():
    s = Settings(app_env="production", cashfree_env="prod", app_url="https://app.example.com/")
    assert s.is_production
    assert not s.docs_enabled
    assert s.cashfree_base_url.startswith("https://api.cashfree.com")
    assert "https://app.example.com" in s.cors_origins
