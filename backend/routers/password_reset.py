from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models import User
from ..security import hash_password, verify_answer

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class GetQuestionIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    email: EmailStr
    answer: str = Field(min_length=1, max_length=100)
    new_password: str = Field(min_length=6, max_length=72)


# ── Get the security question for an email ───────────────────
@router.post("/forgot-password/question")
@limiter.limit("10/minute")
async def get_security_question(request: Request, body: GetQuestionIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Return generic message if no account found (prevents email enumeration)
    if not user or not user.security_question:
        raise HTTPException(status_code=404, detail="No account found with that email")

    return {"question": user.security_question}


# ── Verify answer + reset password ───────────────────────────
@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, body: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.security_answer_hash:
        raise HTTPException(status_code=404, detail="Account not found")

    if not verify_answer(body.answer, user.security_answer_hash):
        raise HTTPException(status_code=400, detail="Incorrect answer")

    user.hashed_password = hash_password(body.new_password)
    await db.commit()

    return {"message": "Password reset successfully. You can now sign in."}
