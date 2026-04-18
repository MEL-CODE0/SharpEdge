from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models import User, OTPToken
from ..security import hash_password, verify_password, create_access_token
from ..email_service import generate_otp, send_otp_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

OTP_EXPIRY_MINUTES = 10


class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class VerifyEmailIn(BaseModel):
    email: EmailStr
    code: str


class LoginIn(BaseModel):
    username: str
    password: str


# ── Register — creates unverified account, sends OTP ─────────
@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already taken")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        is_verified=False,
    )
    db.add(user)

    # Invalidate any old OTPs for this email
    old_otps = await db.execute(
        select(OTPToken).where(
            OTPToken.email == body.email,
            OTPToken.purpose == "verify_email",
            OTPToken.used == False,
        )
    )
    for otp in old_otps.scalars().all():
        otp.used = True

    otp_code = generate_otp()
    otp_token = OTPToken(
        email=body.email,
        code=otp_code,
        purpose="verify_email",
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )
    db.add(otp_token)
    await db.commit()

    await send_otp_email(body.email, otp_code, "verify_email")

    return {"message": "Check your email for a 6-digit verification code.", "email": body.email}


# ── Verify email OTP → returns JWT ───────────────────────────
@router.post("/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, body: VerifyEmailIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OTPToken).where(
            OTPToken.email == body.email,
            OTPToken.code == body.code,
            OTPToken.purpose == "verify_email",
            OTPToken.used == False,
        )
    )
    otp = result.scalar_one_or_none()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="Code has expired — please register again")

    otp.used = True

    user_result = await db.execute(select(User).where(User.email == body.email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    user.is_verified = True
    await db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }


# ── Login ─────────────────────────────────────────────────────
@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Check your inbox for the verification code.")

    token = create_access_token({"sub": str(user.id)})
    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }


@router.get("/me")
async def me():
    return {"ok": True}
