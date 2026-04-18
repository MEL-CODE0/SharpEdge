"""
Thin async wrapper around The Odds API v4.
Docs: https://the-odds-api.com/liveapi/guides/v4/
"""
import httpx
from datetime import datetime, timedelta, timezone
from typing import Any

BASE = "https://api.the-odds-api.com/v4"


class OddsAPIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client: httpx.AsyncClient | None = None

    async def _get(self, path: str, **params) -> tuple[Any, dict]:
        """Returns (json_body, quota_headers)."""
        params["apiKey"] = self.api_key
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(f"{BASE}{path}", params=params)
            r.raise_for_status()
            quota = {
                "requests_used": int(r.headers.get("x-requests-used", 0)),
                "requests_remaining": int(r.headers.get("x-requests-remaining", 0)),
            }
            return r.json(), quota

    async def get_sports(self, all_sports: bool = False) -> list[dict]:
        data, _ = await self._get("/sports", all=str(all_sports).lower())
        return data

    async def get_odds(
        self,
        sport: str,
        regions: str = "eu",
        markets: str = "h2h",
        bookmakers: str | None = None,
        odds_format: str = "decimal",
        days_ahead: int = 7,
    ) -> tuple[list[dict], dict]:
        params = dict(regions=regions, markets=markets, oddsFormat=odds_format)
        if bookmakers:
            params["bookmakers"] = bookmakers
        # Only fetch events starting within the next N days
        cutoff = datetime.now(timezone.utc) + timedelta(days=days_ahead)
        params["commenceTimeTo"] = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")
        data, quota = await self._get(f"/sports/{sport}/odds", **params)
        return data, quota
