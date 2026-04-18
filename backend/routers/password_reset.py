from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models import User, OTPToken
from ..security import hash_password
from ..email_service import generate_otp, send_otp_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

OTP_EXPIRY_MINUTES = 10


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6, max_length=72)


# ── Forgot password — sends OTP to email ─────────────────────
@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, body: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return success to avoid email enumeration
    if not user:
        return {"message": "If that email exists, a reset code has been sent."}

    # Invalidate old reset OTPs for this email
    old_otps = await db.execute(
        select(OTPToken).where(
            OTPToken.email == body.email,
            OTPToken.purpose == "reset_password",
            OTPToken.used == False,
        )
    )
    for otp in old_otps.scalars().all():
        otp.used = True

    otp_code = generate_otp()
    otp_token = OTPToken(
        email=body.email,
        code=otp_code,
        purpose="reset_password",
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )
    db.add(otp_token)
    await db.commit()

    await send_otp_email(body.email, otp_code, "reset_password")
    return {"message": "If that email exists, a reset code has been sent."}


# ── Reset password — verify OTP + set new password ───────────
@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, body: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OTPToken).where(
            OTPToken.email == body.email,
            OTPToken.code == body.code,
            OTPToken.purpose == "reset_password",
            OTPToken.used == False,
        )
    )
    otp = result.scalar_one_or_none()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="Code has expired — request a new one")

    otp.used = True

    user_result = await db.execute(select(User).where(User.email == body.email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    user.hashed_password = hash_password(body.new_password)
    await db.commit()

    return {"message": "Password reset successfully. You can now sign in."}
