from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import BetLog, User
from ..security import get_current_user

router = APIRouter(prefix="/api/bets", tags=["bets"])


class BetIn(BaseModel):
    match_name: str = Field(min_length=1, max_length=200)
    sport: Optional[str] = None
    bookmaker: Optional[str] = None
    outcome: Optional[str] = None
    bet_type: str = "manual"
    odds: float = Field(gt=1)
    stake: float = Field(gt=0)
    notes: Optional[str] = None


class BetUpdate(BaseModel):
    result: str   # win / loss / void / pending


def _calc_profit(stake: float, odds: float, result: str) -> Optional[float]:
    if result == "win":
        return round(stake * (odds - 1), 2)
    if result == "loss":
        return round(-stake, 2)
    if result == "void":
        return 0.0
    return None   # pending


# ── Create bet ────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_bet(
    body: BetIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bet = BetLog(
        user_id=current_user.id,
        match_name=body.match_name,
        sport=body.sport,
        bookmaker=body.bookmaker,
        outcome=body.outcome,
        bet_type=body.bet_type,
        odds=body.odds,
        stake=body.stake,
        result="pending",
        profit=None,
        notes=body.notes,
    )
    db.add(bet)
    await db.commit()
    await db.refresh(bet)
    return bet


# ── List bets ─────────────────────────────────────────────────
@router.get("")
async def list_bets(
    page: int = 1,
    page_size: int = 20,
    result: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(BetLog).where(BetLog.user_id == current_user.id)
    if result:
        q = q.where(BetLog.result == result)
    q = q.order_by(BetLog.placed_at.desc())

    total_q = select(func.count()).select_from(
        select(BetLog).where(BetLog.user_id == current_user.id).subquery()
    )
    total = (await db.execute(total_q)).scalar_one()

    rows = (await db.execute(q.offset((page - 1) * page_size).limit(page_size))).scalars().all()
    return {"items": rows, "total": total}


# ── Update result ─────────────────────────────────────────────
@router.patch("/{bet_id}")
async def update_bet(
    bet_id: int,
    body: BetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BetLog).where(BetLog.id == bet_id, BetLog.user_id == current_user.id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    valid = {"win", "loss", "void", "pending"}
    if body.result not in valid:
        raise HTTPException(status_code=400, detail=f"result must be one of {valid}")

    bet.result = body.result
    bet.profit = _calc_profit(bet.stake, bet.odds, body.result)
    await db.commit()
    await db.refresh(bet)
    return bet


# ── Delete bet ────────────────────────────────────────────────
@router.delete("/{bet_id}", status_code=204)
async def delete_bet(
    bet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BetLog).where(BetLog.id == bet_id, BetLog.user_id == current_user.id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")
    await db.delete(bet)
    await db.commit()


# ── Stats summary ─────────────────────────────────────────────
@router.get("/stats")
async def bet_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(BetLog).where(BetLog.user_id == current_user.id)
    )).scalars().all()

    total = len(rows)
    wins = sum(1 for b in rows if b.result == "win")
    losses = sum(1 for b in rows if b.result == "loss")
    voids = sum(1 for b in rows if b.result == "void")
    pending = sum(1 for b in rows if b.result == "pending")
    total_stake = round(sum(b.stake for b in rows), 2)
    total_profit = round(sum(b.profit for b in rows if b.profit is not None), 2)
    settled = wins + losses + voids
    win_rate = round(wins / settled * 100, 1) if settled > 0 else 0
    roi = round(total_profit / total_stake * 100, 2) if total_stake > 0 else 0

    # Cumulative profit over time (settled bets sorted by date)
    settled_bets = sorted(
        [b for b in rows if b.profit is not None],
        key=lambda b: b.placed_at
    )
    cumulative = 0
    timeline = []
    for b in settled_bets:
        cumulative = round(cumulative + b.profit, 2)
        timeline.append({
            "date": b.placed_at.strftime("%Y-%m-%d"),
            "profit": b.profit,
            "cumulative": cumulative,
            "match": b.match_name,
        })

    # Bets by sport
    sport_counts: dict = {}
    for b in rows:
        key = b.sport or "Other"
        sport_counts[key] = sport_counts.get(key, 0) + 1
    by_sport = [{"sport": k, "count": v} for k, v in sport_counts.items()]

    # Bets by bookmaker
    bm_counts: dict = {}
    for b in rows:
        key = b.bookmaker or "Unknown"
        bm_counts[key] = bm_counts.get(key, 0) + 1
    by_bookmaker = [{"bookmaker": k, "count": v} for k, v in bm_counts.items()]

    return {
        "total": total, "wins": wins, "losses": losses,
        "voids": voids, "pending": pending,
        "win_rate": win_rate, "roi": roi,
        "total_stake": total_stake, "total_profit": total_profit,
        "timeline": timeline, "by_sport": by_sport, "by_bookmaker": by_bookmaker,
    }
