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
