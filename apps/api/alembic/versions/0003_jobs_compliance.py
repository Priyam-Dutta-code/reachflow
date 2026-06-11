"""Jobs table, unsubscribes suppression table, email_logs idempotency guard.

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-11
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("queued", "running", "completed", "failed", name="jobstatus"),
            nullable=False,
        ),
        sa.Column("progress", sa.Integer()),
        sa.Column("params", sa.JSON()),
        sa.Column("result", sa.JSON()),
        sa.Column("error", sa.String()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("finished_at", sa.DateTime()),
    )
    op.create_index("ix_jobs_user_created", "jobs", ["user_id", "created_at"])
    op.create_index("ix_jobs_status", "jobs", ["status"])

    op.create_table(
        "unsubscribes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("source", sa.String()),
        sa.Column("created_at", sa.DateTime()),
        sa.UniqueConstraint("user_id", "email", name="uq_unsubscribes_user_email"),
    )
    op.create_index("ix_unsubscribes_user_id", "unsubscribes", ["user_id"])
    op.create_index("ix_unsubscribes_email", "unsubscribes", ["email"])

    # if_not_exists: revision 0001 builds tables from live model metadata, so
    # this index may already exist on fresh databases (model __table_args__).
    op.create_index(
        "uq_email_logs_send_once",
        "email_logs",
        ["lead_id", "campaign_id", "is_followup"],
        unique=True,
        postgresql_where=sa.text("status = 'sent'"),
        sqlite_where=sa.text("status = 'sent'"),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("uq_email_logs_send_once", table_name="email_logs")
    op.drop_table("unsubscribes")
    op.drop_table("jobs")
    sa.Enum(name="jobstatus").drop(op.get_bind(), checkfirst=True)
