from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from ..database import get_db
from ..models import ValueBet
from ..security import get_current_user, User

router = APIRouter(prefix="/api/value-bets", tags=["value_bets"])


@router.get("")
async def list_value_bets(
    sport: str | None = None,
    bookmaker: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(ValueBet).where(ValueBet.is_active == True)
    if sport:
        q = q.where(ValueBet.sport_key == sport)
    if bookmaker:
        q = q.where(ValueBet.bookmaker == bookmaker)
    q = q.order_by(desc(ValueBet.ev_pct))

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
            "outcome": r.outcome,
            "bookmaker": r.bookmaker,
            "odds": r.odds,
            "true_prob": r.true_prob,
            "ev_pct": r.ev_pct,
            "kelly_fraction": r.kelly_fraction,
            "sharp_books_agree": r.sharp_books_agree,
            "detected_at": r.detected_at.isoformat(),
        }
        for r in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}
