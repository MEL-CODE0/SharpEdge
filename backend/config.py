from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = "changeme-use-a-long-random-string-in-production"
    odds_api_key: str
    odds_api_base: str = "https://api.the-odds-api.com/v4"

    # Football, Basketball, Tennis only
    sports: str = (
        # Football / Soccer
        "soccer_epl,soccer_uefa_champs_league,soccer_uefa_europa_league,"
        "soccer_germany_bundesliga,soccer_spain_la_liga,soccer_france_ligue_one,"
        "soccer_italy_serie_a,soccer_netherlands_eredivisie,soccer_portugal_primeira_liga,"
        # Basketball
        "basketball_nba,basketball_euroleague,"
        # Tennis
        "tennis_atp_barcelona_open,tennis_atp_munich,tennis_wta_stuttgart_open"
    )

    # Bookmakers (eu region — betway & onexbet are priority)
    bookmakers: str = "betway,onexbet,marathonbet,pinnacle,betfair_ex_eu"

    # Increased to 300s (5 min) to conserve API quota across more sports
    poll_interval_seconds: int = 300

    # Value bet settings
    min_ev_pct: float = 2.0
    # Arbitrage settings
    min_profit_pct: float = 0.5
    # Low quota warning threshold
    quota_warning_threshold: int = 100

    class Config:
        env_file = ".env"

settings = Settings()
