from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Integer, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ArbitrageOpportunity(Base):
    __tablename__ = "arbitrage_opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sport_key: Mapped[str] = mapped_column(String(80))
    sport_title: Mapped[str] = mapped_column(String(120))
    match_name: Mapped[str] = mapped_column(String(200))
    commence_time: Mapped[datetime] = mapped_column(DateTime)
    market: Mapped[str] = mapped_column(String(20), default="h2h")
    profit_pct: Mapped[float] = mapped_column(Float)
    # legs: list of {bookmaker, outcome, odds, stake_pct}
    legs: Mapped[dict] = mapped_column(JSON)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ValueBet(Base):
    __tablename__ = "value_bets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sport_key: Mapped[str] = mapped_column(String(80))
    sport_title: Mapped[str] = mapped_column(String(120))
    match_name: Mapped[str] = mapped_column(String(200))
    commence_time: Mapped[datetime] = mapped_column(DateTime)
    market: Mapped[str] = mapped_column(String(20), default="h2h")
    outcome: Mapped[str] = mapped_column(String(100))
    bookmaker: Mapped[str] = mapped_column(String(80))
    odds: Mapped[float] = mapped_column(Float)
    true_prob: Mapped[float] = mapped_column(Float)
    ev_pct: Mapped[float] = mapped_column(Float)
    kelly_fraction: Mapped[float] = mapped_column(Float)
    sharp_books_agree: Mapped[int] = mapped_column(Integer, default=0)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ScannerRun(Base):
    __tablename__ = "scanner_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ran_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sports_scanned: Mapped[int] = mapped_column(Integer, default=0)
    events_scanned: Mapped[int] = mapped_column(Integer, default=0)
    arb_found: Mapped[int] = mapped_column(Integer, default=0)
    value_found: Mapped[int] = mapped_column(Integer, default=0)
    requests_used: Mapped[int] = mapped_column(Integer, default=0)
    requests_remaining: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
