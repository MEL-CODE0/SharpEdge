from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = "changeme-use-a-long-random-string-in-production"
    odds_api_key: str
    odds_api_base: str = "https://api.the-odds-api.com/v4"

    # Top 5 sports — best arb yield
    sports: str = (
        "soccer_epl,"
        "soccer_uefa_champs_league,"
        "soccer_spain_la_liga,"
        "soccer_germany_bundesliga,"
        "basketball_nba"
    )

    # These sports also fetch Over/Under totals (costs 1 extra credit each per scan)
    # EPL + UCL have the most O/U arb opportunities for Ghana bookmakers
    totals_sports: str = "soccer_epl,soccer_uefa_champs_league"

    # Bookmakers (eu region — betway & onexbet are priority)
    bookmakers: str = "betway,onexbet,marathonbet,pinnacle,betfair_ex_eu"

    # 12 hours — 7 credits/scan × 2 scans/day × 30 = 420/month (fits 500 quota)
    # Breakdown: EPL(h2h+totals=2) + UCL(h2h+totals=2) + LaLiga(1) + Bundesliga(1) + NBA(1) = 7
    poll_interval_seconds: int = 43200

    # Value bet settings
    min_ev_pct: float = 2.0
    # Arbitrage settings
    min_profit_pct: float = 0.5
    # Low quota warning threshold
    quota_warning_threshold: int = 100

    class Config:
        env_file = ".env"

settings = Settings()
