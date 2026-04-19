from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = "changeme-use-a-long-random-string-in-production"
    odds_api_key: str
    odds_api_base: str = "https://api.the-odds-api.com/v4"

    # Top 5 sports — best arb yield, fits within 500 requests/month at 8h interval
    sports: str = (
        "soccer_epl,"
        "soccer_uefa_champs_league,"
        "soccer_spain_la_liga,"
        "soccer_germany_bundesliga,"
        "basketball_nba"
    )

    # Bookmakers (eu region — betway & onexbet are priority)
    bookmakers: str = "betway,onexbet,marathonbet,pinnacle,betfair_ex_eu"

    # 8 hours — 5 sports × 3 scans/day = 15 calls/day = ~450/month (fits 500 quota)
    poll_interval_seconds: int = 28800

    # Value bet settings
    min_ev_pct: float = 2.0
    # Arbitrage settings
    min_profit_pct: float = 0.5
    # Low quota warning threshold
    quota_warning_threshold: int = 100

    class Config:
        env_file = ".env"

settings = Settings()
