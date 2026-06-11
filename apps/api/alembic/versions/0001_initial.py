"""Initial schema — generated from the ported V1 models (plus V2 additions:
password_hash, email_verified_at, hot-query indexes).

Uses metadata.create_all for revision 0001 so the schema is exactly the
models. All later revisions are normal incremental Alembic operations.

Revision ID: 0001
Revises:
Create Date: 2026-06-11
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.db.base import Base
    import app.db.models  # noqa: F401

    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    from app.db.base import Base
    import app.db.models  # noqa: F401

    Base.metadata.drop_all(bind=op.get_bind())
