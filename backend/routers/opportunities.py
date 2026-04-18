from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from ..database import get_db
from ..models import ArbitrageOpportunity
from ..security import get_current_user, User

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


@router.get("")
async def list_opportunities(
    sport: str | None = None,
    live: bool | None = None,
    priority: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(ArbitrageOpportunity).where(ArbitrageOpportunity.is_active == True)
    if sport:
        q = q.where(ArbitrageOpportunity.sport_key == sport)
    if live is not None:
        q = q.where(ArbitrageOpportunity.is_live == live)
    if priority:
        q = q.where(ArbitrageOpportunity.is_priority == True)
    q = q.order_by(ArbitrageOpportunity.is_priority.desc(), desc(ArbitrageOpportunity.profit_pct))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar()

    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    items = [
        {
            "id": r.id,
            "sport_key": r.sport_key,
            "sport_title": r.sport_title,
            "match_name": r.match_name,
            "commence_time": r.commence_time.isoformat(),
            "market": r.market,
            "profit_pct": r.profit_pct,
            "legs": r.legs,
            "signal": getattr(r, "signal", "caution"),
            "is_priority": getattr(r, "is_priority", False),
            "is_live": getattr(r, "is_live", False),
            "detected_at": r.detected_at.isoformat(),
        }
        for r in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/sports")
async def list_sports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ArbitrageOpportunity.sport_key, ArbitrageOpportunity.sport_title)
        .where(ArbitrageOpportunity.is_active == True)
        .distinct()
    )
    return [{"key": row[0], "title": row[1]} for row in result.all()]
