from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from ..database import get_db
from ..models import ArbitrageOpportunity, ValueBet, User
from ..security import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
async def get_history(
    type: str = "all",          # all | arb | value
    sport: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    arbs = []
    vbs = []

    if type in ("all", "arb"):
        q = select(ArbitrageOpportunity).where(ArbitrageOpportunity.is_active == False)
        if sport:
            q = q.where(ArbitrageOpportunity.sport_key.startswith(sport))
        q = q.order_by(ArbitrageOpportunity.detected_at.desc())
        arbs = (await db.execute(q)).scalars().all()

    if type in ("all", "value"):
        q = select(ValueBet).where(ValueBet.is_active == False)
        if sport:
            q = q.where(ValueBet.sport_key.startswith(sport))
        q = q.order_by(ValueBet.detected_at.desc())
        vbs = (await db.execute(q)).scalars().all()

    # Merge and sort by detected_at descending
    combined = []
    for a in arbs:
        combined.append({
            "id": a.id,
            "type": "arb",
            "match_name": a.match_name,
            "sport_title": a.sport_title,
            "sport_key": a.sport_key,
            "commence_time": a.commence_time.isoformat() if a.commence_time else None,
            "detected_at": a.detected_at.isoformat() if a.detected_at else None,
            "profit_pct": a.profit_pct,
            "signal": a.signal,
            "is_priority": a.is_priority,
            "legs": a.legs,
        })
    for v in vbs:
        combined.append({
            "id": v.id,
            "type": "value",
            "match_name": v.match_name,
            "sport_title": v.sport_title,
            "sport_key": v.sport_key,
            "commence_time": v.commence_time.isoformat() if v.commence_time else None,
            "detected_at": v.detected_at.isoformat() if v.detected_at else None,
            "ev_pct": v.ev_pct,
            "odds": v.odds,
            "bookmaker": v.bookmaker,
            "outcome": v.outcome,
            "signal": v.signal,
            "is_priority": v.is_priority,
        })

    combined.sort(key=lambda x: x["detected_at"] or "", reverse=True)
    total = len(combined)
    start = (page - 1) * page_size
    items = combined[start: start + page_size]

    return {"items": items, "total": total}
