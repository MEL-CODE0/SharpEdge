import re
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

log = logging.getLogger("sharpedge.db")


def _build_engine():
    url = settings.database_url

    # Strip SSL/channel_binding params — asyncpg rejects them in the URL
    url = re.sub(r'[?&]sslmode=[^&]*', '', url)
    url = re.sub(r'[?&]ssl=[^&]*', '', url)
    url = re.sub(r'[?&]channel_binding=[^&]*', '', url)
    url = re.sub(r'[?&]$', '', url)

    # Ensure asyncpg dialect
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql+asyncpg://', 1)
    elif url.startswith('postgresql://') and '+asyncpg' not in url:
        url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)

    return create_async_engine(
        url,
        connect_args={"ssl": True},
        echo=False,
        pool_pre_ping=True,
    )


engine = _build_engine()
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    log.info("init_db: creating tables and applying migrations…")
    try:
        async with engine.begin() as conn:
            from . import models  # noqa
            await conn.run_sync(Base.metadata.create_all)

            # Safe column migrations — ADD COLUMN IF NOT EXISTS
            migrations = [
                "ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS signal VARCHAR(10) DEFAULT 'caution'",
                "ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE",
                "ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE",
                "ALTER TABLE value_bets ADD COLUMN IF NOT EXISTS signal VARCHAR(10) DEFAULT 'caution'",
                "ALTER TABLE value_bets ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE",
                "ALTER TABLE value_bets ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE",
                # Existing users are treated as already verified so they don't get locked out
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE",
            ]
            from sqlalchemy import text
            for sql in migrations:
                await conn.execute(text(sql))

        log.info("init_db: done")
    except Exception as e:
        log.error(f"init_db failed (app will still start): {e}")
