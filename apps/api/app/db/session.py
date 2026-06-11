"""Lazy engine/session factory so tests can configure the environment first.

Schema is owned by Alembic (`alembic upgrade head`); `Base.metadata.create_all`
is allowed in tests only.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import get_settings

_engine: Engine | None = None
_session_factory: sessionmaker | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = get_settings().database_url
        kwargs: dict = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            kwargs = {"connect_args": {"check_same_thread": False}}
        _engine = create_engine(url, **kwargs)
    return _engine


def get_session_factory() -> sessionmaker:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(), autocommit=False, autoflush=False
        )
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
