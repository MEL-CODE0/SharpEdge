from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import User, ArbitrageOpportunity, ValueBet, ScannerRun
from ..security import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=72)


@router.put("/password")
async def change_password(
    body: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Delete all user data, then the user
    await db.execute(delete(User).where(User.id == current_user.id))
    await db.commit()
    return {"message": "Account deleted"}
