"""
Core arbitrage and value-bet detection logic.
Works on raw event dicts returned by The Odds API.
"""
from datetime import datetime
from typing import Any

# Sharp books used to derive true probability
SHARP_BOOKS = {"pinnacle", "betfair_ex_eu", "betfair_ex_uk", "marathonbet"}

# Books the user has accounts with — arbs between these get priority
PRIORITY_BOOKS = {"betway", "onexbet"}


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)


def _hours_to_start(commence_time: datetime) -> float:
    return (commence_time - datetime.utcnow()).total_seconds() / 3600


# ─────────────────────────────────────────────────────────────
#  SIGNAL SCORING
# ─────────────────────────────────────────────────────────────

def _arb_signal(profit_pct: float, hours: float, legs: list) -> str:
    """Returns 'bet', 'caution', or 'skip'."""
    if hours < 0.5:          # under 30 min — too tight to place both bets
        return "skip"
    priority = sum(1 for l in legs if l["bookmaker"] in PRIORITY_BOOKS)
    if profit_pct >= 2.0 and hours >= 2.0:
        return "bet"
    if profit_pct >= 1.0 and hours >= 1.0:
        return "caution"
    # Boost priority books a bit
    if priority >= 2 and profit_pct >= 0.7 and hours >= 1.0:
        return "caution"
    if profit_pct < 0.7:
        return "skip"
    return "caution"


def _vb_signal(ev_pct: float, kelly: float, sharp_agree: int, hours: float) -> str:
    if hours < 0.5:
        return "skip"
    if ev_pct >= 5.0 and sharp_agree >= 2 and kelly >= 0.05:
        return "bet"
    if ev_pct >= 3.0 and sharp_agree >= 1:
        return "caution"
    if ev_pct < 2.0:
        return "skip"
    return "caution"


# ─────────────────────────────────────────────────────────────
#  ARBITRAGE
# ─────────────────────────────────────────────────────────────

def find_arbitrage(events: list[dict], min_profit_pct: float = 0.5) -> list[dict]:
    opportunities = []

    for event in events:
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            continue

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
            continue

        profit_pct = round((1.0 / implied - 1.0) * 100, 3)

        # Lower threshold for betway/onexbet arbs so we catch more
        priority_legs = sum(1 for v in best.values() if v["bookmaker"] in PRIORITY_BOOKS)
        effective_min = min_profit_pct * 0.6 if priority_legs >= 2 else min_profit_pct
        if profit_pct < effective_min:
            continue

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
        commence_time = _parse_dt(event["commence_time"])
        hours = _hours_to_start(commence_time)
        is_priority = priority_legs >= 2

        opportunities.append({
            "sport_key": event["sport_key"],
            "sport_title": event["sport_title"],
            "match_name": f"{home} vs {away}",
            "commence_time": commence_time,
            "market": "h2h",
            "profit_pct": profit_pct,
            "legs": legs,
            "signal": _arb_signal(profit_pct, hours, legs),
            "is_priority": is_priority,
        })

    # Sort: priority first, then by profit
    opportunities.sort(key=lambda x: (not x["is_priority"], -x["profit_pct"]))
    return opportunities


# ─────────────────────────────────────────────────────────────
#  VALUE BETS
# ─────────────────────────────────────────────────────────────

def find_value_bets(events: list[dict], min_ev_pct: float = 2.0) -> list[dict]:
    value_bets = []

    for event in events:
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            continue

        sharp_probs = _get_sharp_probs(bookmakers)
        if not sharp_probs:
            continue

        home, away = _split_teams(event)
        match_name = f"{home} vs {away}"
        commence_time = _parse_dt(event["commence_time"])
        hours = _hours_to_start(commence_time)

        for bm in bookmakers:
            if bm["key"] in SHARP_BOOKS:
                continue
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
                    kelly = round((price * true_prob - 1.0) / (price - 1.0), 4)
                    agree = sum(
                        1 for b in bookmakers
                        if b["key"] in SHARP_BOOKS
                        and _best_price(b, name) is not None
                        and _best_price(b, name) >= price * 0.99
                    )
                    is_priority = bm["key"] in PRIORITY_BOOKS
                    value_bets.append({
                        "sport_key": event["sport_key"],
                        "sport_title": event["sport_title"],
                        "match_name": match_name,
                        "commence_time": commence_time,
                        "market": "h2h",
                        "outcome": name,
                        "bookmaker": bm["key"],
                        "odds": price,
                        "true_prob": round(true_prob, 4),
                        "ev_pct": ev_pct,
                        "kelly_fraction": kelly,
                        "sharp_books_agree": agree,
                        "signal": _vb_signal(ev_pct, kelly, agree, hours),
                        "is_priority": is_priority,
                    })

    # Sort: priority first, then by EV
    value_bets.sort(key=lambda x: (not x["is_priority"], -x["ev_pct"]))
    return value_bets


# ─────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────

def _get_sharp_probs(bookmakers: list[dict]) -> dict[str, float]:
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
            raw = {o["name"]: 1.0 / float(o["price"]) for o in outcomes}
            total = sum(raw.values())
            for name, imp in raw.items():
                true_p = imp / total
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
    return event.get("home_team", "Home"), event.get("away_team", "Away")
