"""
Background polling loop — fetches odds from The Odds API every N seconds,
runs arbitrage + value bet detection, persists results to PostgreSQL.
"""
import asyncio
import logging
from datetime import datetime

from ..config import settings
from ..database import AsyncSessionLocal
from ..models import ArbitrageOpportunity, ValueBet, ScannerRun
from .client import OddsAPIClient
from .processor import find_arbitrage, find_value_bets, find_ou_arbitrage

log = logging.getLogger("sharpedge.scheduler")

_running = False
_paused = False
_last_run: dict = {
    "ran_at": None,
    "sports_scanned": 0,
    "events_scanned": 0,
    "arb_found": 0,
    "value_found": 0,
    "requests_used": 0,
    "requests_remaining": 0,
    "error": None,
    "status": "idle",
    "paused": False,
}


def get_status() -> dict:
    return dict(_last_run)


def pause_loop():
    global _paused
    _paused = True
    _last_run["paused"] = True
    _last_run["status"] = "paused"
    log.info("Scanner paused")


def resume_loop():
    global _paused
    _paused = False
    _last_run["paused"] = False
    _last_run["status"] = "running"
    log.info("Scanner resumed")


async def run_once():
    global _last_run
    client = OddsAPIClient(settings.odds_api_key)
    sports = [s.strip() for s in settings.sports.split(",") if s.strip()]
    bookmakers = settings.bookmakers

    all_arbs: list[dict] = []
    all_vbs: list[dict] = []
    total_events = 0
    total_requests_used = 0
    total_requests_remaining = 0
    error_msg = None

    # Sports that also get Over/Under totals market (EPL + UCL)
    totals_sports = set(s.strip() for s in settings.totals_sports.split(",") if s.strip())

    for sport in sports:
        # H2H scan for all sports
        try:
            events, quota = await client.get_odds(
                sport=sport,
                regions="eu",
                markets="h2h",
                bookmakers=bookmakers,
            )
            total_events += len(events)
            total_requests_used += quota["requests_used"]
            total_requests_remaining = quota["requests_remaining"]

            arbs = find_arbitrage(events, min_profit_pct=settings.min_profit_pct)
            vbs = find_value_bets(events, min_ev_pct=settings.min_ev_pct)
            all_arbs.extend(arbs)
            all_vbs.extend(vbs)

            log.info(f"[{sport}] h2h: {len(events)} events → {len(arbs)} arbs, {len(vbs)} vbs")
        except Exception as e:
            log.warning(f"[{sport}] h2h fetch failed: {e}")
            error_msg = str(e)

        # Over/Under totals scan for EPL + UCL only
        if sport in totals_sports:
            try:
                ou_events, ou_quota = await client.get_odds(
                    sport=sport,
                    regions="eu",
                    markets="totals",
                    bookmakers=bookmakers,
                )
                total_requests_used += ou_quota["requests_used"]
                total_requests_remaining = ou_quota["requests_remaining"]

                ou_arbs = find_ou_arbitrage(ou_events, min_profit_pct=settings.min_profit_pct)
                all_arbs.extend(ou_arbs)

                log.info(f"[{sport}] totals: {len(ou_events)} events → {len(ou_arbs)} O/U arbs")
            except Exception as e:
                log.warning(f"[{sport}] totals fetch failed: {e}")
                error_msg = str(e)

    async with AsyncSessionLocal() as db:
        try:
            from sqlalchemy import update
            await db.execute(
                update(ArbitrageOpportunity).where(ArbitrageOpportunity.is_active == True)
                .values(is_active=False)
            )
            await db.execute(
                update(ValueBet).where(ValueBet.is_active == True)
                .values(is_active=False)
            )
            for arb in all_arbs:
                db.add(ArbitrageOpportunity(**arb))
            for vb in all_vbs:
                db.add(ValueBet(**vb))
            run_log = ScannerRun(
                sports_scanned=len(sports),
                events_scanned=total_events,
                arb_found=len(all_arbs),
                value_found=len(all_vbs),
                requests_used=total_requests_used,
                requests_remaining=total_requests_remaining,
                error=error_msg,
            )
            db.add(run_log)
            await db.commit()
        except Exception as e:
            log.error(f"DB write failed: {e}")
            await db.rollback()
            error_msg = str(e)

    _last_run.update({
        "ran_at": datetime.utcnow().isoformat(),
        "sports_scanned": len(sports),
        "events_scanned": total_events,
        "arb_found": len(all_arbs),
        "value_found": len(all_vbs),
        "requests_used": total_requests_used,
        "requests_remaining": total_requests_remaining,
        "error": error_msg,
        "status": "paused" if _paused else ("error" if error_msg else "running"),
        "paused": _paused,
    })
    log.info(f"Scan complete: {len(all_arbs)} arbs, {len(all_vbs)} value bets | quota remaining: {total_requests_remaining}")


async def polling_loop():
    global _running
    _running = True
    _last_run["status"] = "starting"
    log.info(f"Polling loop started (interval={settings.poll_interval_seconds}s)")
    while _running:
        if not _paused:
            try:
                await run_once()
            except Exception as e:
                log.error(f"Polling loop error: {e}")
                _last_run["error"] = str(e)
                _last_run["status"] = "error"
        await asyncio.sleep(settings.poll_interval_seconds)


def start_background_loop():
    asyncio.create_task(polling_loop())


def stop_background_loop():
    global _running
    _running = False
