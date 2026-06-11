"""Test fixtures. Environment is pinned BEFORE app modules import settings.

`Base.metadata.create_all` is allowed here (tests only) — production schema
is owned by Alembic.
"""
import os

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite://")  # in-memory; engine fixture overrides
os.environ.setdefault("REDIS_URL", "")
os.environ.setdefault("JWT_SECRET", "test_jwt_secret")
os.environ.setdefault("APP_ENCRYPTION_KEY", "test_encryption_key")
os.environ.setdefault("CRON_SECRET", "test_cron_secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.models  # noqa: F401
from app.db.base import Base


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = factory()
    yield session
    session.close()


@pytest.fixture()
def client(engine, monkeypatch):
    """App test client with the db wired to the test engine."""
    import app.db.session as db_session

    monkeypatch.setattr(db_session, "_engine", engine)
    monkeypatch.setattr(db_session, "_session_factory", None)

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _fresh_rate_limiter(monkeypatch):
    """Each test gets its own in-memory limiter (register is 3/hr/IP)."""
    import app.core.rate_limit as rl

    monkeypatch.setattr(rl, "_limiter", None)


@pytest.fixture()
def mailbox(monkeypatch):
    """Capture auth emails (and their raw tokens) instead of sending."""
    from app.services import mailer

    sent: dict[str, list] = {"verify": [], "reset": [], "notice": []}
    monkeypatch.setattr(
        mailer, "send_verification_email",
        lambda email, name, token: sent["verify"].append((email, token)) or True,
    )
    monkeypatch.setattr(
        mailer, "send_reset_email",
        lambda email, name, token: sent["reset"].append((email, token)) or True,
    )
    monkeypatch.setattr(
        mailer, "send_password_changed_notice",
        lambda email, name: sent["notice"].append(email) or True,
    )
    return sent


def register_user(client, email="user@example.com", password="correct-horse-9", name="Test User",
                  vertical="business_growth"):
    response = client.post("/api/auth/register", json={
        "name": name, "email": email, "password": password, "vertical": vertical,
    })
    assert response.status_code == 201, response.text
    return response
