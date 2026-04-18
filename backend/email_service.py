"""
Async email sender using aiosmtplib (STARTTLS / Gmail).
If SMTP is not configured the OTP is printed to server logs (dev mode).
"""
import logging
import secrets
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from .config import settings

log = logging.getLogger("sharpedge.email")


def generate_otp() -> str:
    """Return a secure 6-digit OTP string."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def send_otp_email(to_email: str, otp: str, purpose: str) -> None:
    """
    Send an OTP email.
    purpose: 'verify_email' | 'reset_password'
    """
    if purpose == "verify_email":
        subject = "SharpEdge — Verify your email"
        action = "verify your account"
    else:
        subject = "SharpEdge — Password reset code"
        action = "reset your password"

    body = (
        f"Hi,\n\n"
        f"Your SharpEdge code to {action} is:\n\n"
        f"    {otp}\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone.\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"— SharpEdge"
    )

    if not settings.smtp_user or not settings.smtp_pass:
        # Dev fallback — log OTP so it can be used without email setup
        log.warning(f"[EMAIL NOT CONFIGURED] OTP for {to_email} ({purpose}): {otp}")
        return

    msg = MIMEMultipart()
    msg["From"] = settings.from_email or settings.smtp_user
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_pass,
            start_tls=True,
        )
        log.info(f"OTP email sent to {to_email} ({purpose})")
    except Exception as e:
        log.error(f"Failed to send OTP email to {to_email}: {e}")
        raise
