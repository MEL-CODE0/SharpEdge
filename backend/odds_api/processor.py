"""
Core arbitrage and value-bet detection logic.
Works on raw event dicts returned by The Odds API.
"""
from datetime import datetime
from typing import Any


# Sharp books used to derive true probability
SHARP_BOOKS = {"pinnacle", "betfair_ex_eu", "betfair_ex_uk", "marathonbet"}


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)


# ──────────────────────────────────────────────
#  ARBITRAGE
# ──────────────────────────────────────────────

def find_arbitrage(events: list[dict], min_profit_pct: float = 0.5) -> list[dict]:
    """
    For each event, find the best (highest) odds for each outcome across all
    bookmakers. If 1/sum_of_best_odds < 1 → arbitrage exists.
    Returns list of opportunity dicts ready to insert into DB.
    """
    opportunities = []

    for event in events:
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            continue

        # Collect best odds per outcome across all books
        # outcome_name → {odds, bookmaker}
        best: dict[str, dict] = {}

        for bm in bookmakers:
            for market in bm.get("markets", []):
                if market["key"] != "h2h":
                    continue
                for outcome in market.get("outcomes", []):
                    name = outcome["name"]
                    price = float(outcome["price"])
                    if name not in best or price > best[name]["odds"]:
                        best[name] = {"odds": price, "bookmaker": bm["key"]}

        if len(best) < 2:
            continue

        implied = sum(1.0 / v["odds"] for v in best.values())
        if implied >= 1.0:
            continue  # no arb

        profit_pct = round((1.0 / implied - 1.0) * 100, 3)
        if profit_pct < min_profit_pct:
            continue

        # Calculate optimal stakes (Kelly-style percentage for each leg)
        legs = []
        for outcome_name, info in best.items():
            stake_pct = round((1.0 / info["odds"]) / implied * 100, 2)
            legs.append({
                "outcome": outcome_name,
                "bookmaker": info["bookmaker"],
                "odds": info["odds"],
                "stake_pct": stake_pct,
            })

        home, away = _split_teams(event)
        opportunities.append({
            "sport_key": event["sport_key"],
            "sport_title": event["sport_title"],
            "match_name": f"{home} vs {away}",
            "commence_time": _parse_dt(event["commence_time"]),
            "market": "h2h",
            "profit_pct": profit_pct,
            "legs": legs,
        })

    return opportunities


# ──────────────────────────────────────────────
#  VALUE BETS
# ──────────────────────────────────────────────

def find_value_bets(events: list[dict], min_ev_pct: float = 2.0) -> list[dict]:
    """
    Use sharp book consensus to derive true probability.
    If a soft book offers odds implying lower probability than true → value bet.
    """
    value_bets = []

    for event in events:
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            continue

        # Build sharp consensus probabilities (margin-removed)
        sharp_probs = _get_sharp_probs(bookmakers)
        if not sharp_probs:
            continue

        home, away = _split_teams(event)
        match_name = f"{home} vs {away}"

        for bm in bookmakers:
            if bm["key"] in SHARP_BOOKS:
                continue  # only look for value in soft books
            for market in bm.get("markets", []):
                if market["key"] != "h2h":
                    continue
                for outcome in market.get("outcomes", []):
                    name = outcome["name"]
                    if name not in sharp_probs:
                        continue
                    price = float(outcome["price"])
                    true_prob = sharp_probs[name]
                    ev_pct = round((price * true_prob - 1.0) * 100, 2)
                    if ev_pct < min_ev_pct:
                        continue
                    # Kelly fraction (full Kelly)
                    kelly = round((price * true_prob - 1.0) / (price - 1.0), 4)
                    # How many sharp books agree (back this outcome at >= these odds)
                    agree = sum(
                        1 for b in bookmakers
                        if b["key"] in SHARP_BOOKS
                        and _best_price(b, name) is not None
                        and _best_price(b, name) >= price * 0.99  # within 1%
                    )
                    value_bets.append({
                        "sport_key": event["sport_key"],
                        "sport_title": event["sport_title"],
                        "match_name": match_name,
                        "commence_time": _parse_dt(event["commence_time"]),
                        "market": "h2h",
                        "outcome": name,
                        "bookmaker": bm["key"],
                        "odds": price,
                        "true_prob": round(true_prob, 4),
                        "ev_pct": ev_pct,
                        "kelly_fraction": kelly,
                        "sharp_books_agree": agree,
                    })

    # Sort best first
    value_bets.sort(key=lambda x: x["ev_pct"], reverse=True)
    return value_bets


# ──────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────

def _get_sharp_probs(bookmakers: list[dict]) -> dict[str, float]:
    """Average margin-free probability from sharp books."""
    outcome_sums: dict[str, float] = {}
    outcome_counts: dict[str, int] = {}

    for bm in bookmakers:
        if bm["key"] not in SHARP_BOOKS:
            continue
        for market in bm.get("markets", []):
            if market["key"] != "h2h":
                continue
            outcomes = market.get("outcomes", [])
            if not outcomes:
                continue
            # Remove bookmaker margin (Shin method approximation: just normalise)
            raw = {o["name"]: 1.0 / float(o["price"]) for o in outcomes}
            total = sum(raw.values())
            for name, imp in raw.items():
                true_p = imp / total  # margin removed
                outcome_sums[name] = outcome_sums.get(name, 0) + true_p
                outcome_counts[name] = outcome_counts.get(name, 0) + 1

    if not outcome_sums:
        return {}
    return {k: outcome_sums[k] / outcome_counts[k] for k in outcome_sums}


def _best_price(bookmaker: dict, outcome_name: str) -> float | None:
    for market in bookmaker.get("markets", []):
        if market["key"] != "h2h":
            continue
        for o in market.get("outcomes", []):
            if o["name"] == outcome_name:
                return float(o["price"])
    return None


def _split_teams(event: dict) -> tuple[str, str]:
    home = event.get("home_team", "Home")
    away = event.get("away_team", "Away")
    return home, away
