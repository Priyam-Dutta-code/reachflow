"""Feedback + newsletter signups (Phase 9 growth).

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feedback",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("email", sa.String()),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("page", sa.String()),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_index("ix_feedback_user_id", "feedback", ["user_id"])

    op.create_table(
        "newsletter_signups",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("source", sa.String()),
        sa.Column("created_at", sa.DateTime()),
        sa.UniqueConstraint("email", name="uq_newsletter_email"),
    )


def downgrade() -> None:
    op.drop_table("newsletter_signups")
    op.drop_table("feedback")
