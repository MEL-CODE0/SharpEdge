from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = "changeme-use-a-long-random-string-in-production"
    odds_api_key: str
    odds_api_base: str = "https://api.the-odds-api.com/v4"
    # Sports to monitor — add/remove as needed
    sports: str = "soccer_epl,soccer_uefa_champs_league,soccer_germany_bundesliga,soccer_spain_la_liga,soccer_france_ligue_one,soccer_italy_serie_a"
    # Bookmakers available to your region (eu region covers betway, onexbet, etc.)
    bookmakers: str = "betway,onexbet,marathonbet,pinnacle,betfair_ex_eu"
    poll_interval_seconds: int = 60
    # Value bet settings
    min_ev_pct: float = 2.0
    # Arbitrage settings
    min_profit_pct: float = 0.5

    class Config:
        env_file = ".env"

settings = Settings()
