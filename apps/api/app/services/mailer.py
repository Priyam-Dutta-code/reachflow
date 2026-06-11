"""Auth emails over SMTP — plain-text-first, on-brand (mono aesthetic).

Disabled-safe: without SMTP credentials nothing is sent; outside production
the action link is logged so the flow stays testable end-to-end in dev.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from app.core.settings import get_settings

logger = logging.getLogger("reachflow.mailer")


def _send(to_email: str, subject: str, body: str) -> bool:
    settings = get_settings()
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP not configured — '%s' to %s not sent", subject, to_email)
        return False
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["From"] = settings.mail_from or settings.smtp_user
        msg["To"] = to_email
        msg["Subject"] = subject

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(msg["From"], to_email, msg.as_string())
        return True
    except Exception as exc:
        logger.error("SMTP send failed to %s: %s", to_email, type(exc).__name__)
        return False


def _log_link_in_dev(kind: str, url: str) -> None:
    settings = get_settings()
    if not settings.is_production:
        logger.info("[dev] %s link: %s", kind, url)


def send_verification_email(to_email: str, name: str, token: str) -> bool:
    settings = get_settings()
    url = f"{settings.app_url.rstrip('/')}/verify-email?token={token}"
    _log_link_in_dev("verify-email", url)
    body = f"""Hi {name or "there"},

Confirm this email address to unlock sending in ReachFlow:

    {url}

The link works once and expires in 60 minutes. If you didn't create a
ReachFlow account, ignore this email.

— ReachFlow
"""
    return _send(to_email, "Confirm your ReachFlow email", body)


def send_reset_email(to_email: str, name: str, token: str) -> bool:
    settings = get_settings()
    url = f"{settings.app_url.rstrip('/')}/reset-password?token={token}"
    _log_link_in_dev("reset-password", url)
    body = f"""Hi {name or "there"},

Someone asked to reset the password for this ReachFlow account. If that was
you, set a new password here:

    {url}

The link works once and expires in 30 minutes. If you didn't ask for this,
ignore this email — your password is unchanged.

— ReachFlow
"""
    return _send(to_email, "Reset your ReachFlow password", body)


def send_password_changed_notice(to_email: str, name: str) -> bool:
    settings = get_settings()
    body = f"""Hi {name or "there"},

Your ReachFlow password was just changed and all other sessions were signed
out. If this was you, no action is needed.

If it wasn't, reset your password immediately:

    {settings.app_url.rstrip('/')}/forgot-password

— ReachFlow
"""
    return _send(to_email, "Your ReachFlow password was changed", body)
