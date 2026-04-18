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
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    security_question: Mapped[str | None] = mapped_column(String(200), nullable=True)
    security_answer_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)


class OTPToken(Base):
    __tablename__ = "otp_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    purpose: Mapped[str] = mapped_column(String(30), nullable=False)  # verify_email | reset_password
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
    signal: Mapped[str] = mapped_column(String(10), default="caution")
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    is_live: Mapped[bool] = mapped_column(Boolean, default=False)
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
    signal: Mapped[str] = mapped_column(String(10), default="caution")
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    is_live: Mapped[bool] = mapped_column(Boolean, default=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class BetLog(Base):
    __tablename__ = "bet_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    match_name: Mapped[str] = mapped_column(String(200))
    sport: Mapped[str | None] = mapped_column(String(80), nullable=True)
    bookmaker: Mapped[str | None] = mapped_column(String(80), nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bet_type: Mapped[str] = mapped_column(String(20), default="manual")  # arb / value / manual
    odds: Mapped[float] = mapped_column(Float)
    stake: Mapped[float] = mapped_column(Float)
    result: Mapped[str] = mapped_column(String(10), default="pending")   # pending / win / loss / void
    profit: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    placed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
