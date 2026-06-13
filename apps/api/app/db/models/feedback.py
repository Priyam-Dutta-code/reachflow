"""In-app feedback + newsletter capture (Phase 9 growth).

No third-party ESP — newsletter signups land in our own table (master plan
Phase 9). Feedback rows are emailed to the operator when SMTP is configured.
"""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint

from app.db.base import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id         = Column(String, primary_key=True, default=lambda: uuid4().hex)
    user_id    = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    email      = Column(String)            # captured even for logged-out senders
    message    = Column(Text, nullable=False)
    page       = Column(String)            # where it was sent from
    created_at = Column(DateTime, default=datetime.utcnow)


class NewsletterSignup(Base):
    __tablename__ = "newsletter_signups"
    __table_args__ = (UniqueConstraint("email", name="uq_newsletter_email"),)

    id         = Column(String, primary_key=True, default=lambda: uuid4().hex)
    email      = Column(String, nullable=False)   # stored lowercase
    source     = Column(String, default="landing")
    created_at = Column(DateTime, default=datetime.utcnow)
