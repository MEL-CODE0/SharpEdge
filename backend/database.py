import re
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

log = logging.getLogger("sharpedge.db")


def _build_engine():
    url = settings.database_url
    log.info(f"Original DATABASE_URL scheme: {url.split('://')[0]}")

    # Strip SSL/channel_binding params — asyncpg does NOT accept them in the URL
    url = re.sub(r'[?&]sslmode=[^&]*', '', url)
    url = re.sub(r'[?&]ssl=[^&]*', '', url)
    url = re.sub(r'[?&]channel_binding=[^&]*', '', url)
    url = re.sub(r'[?&]$', '', url)   # clean trailing ? or &

    # Ensure asyncpg dialect
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql+asyncpg://', 1)
    elif url.startswith('postgresql://') and '+asyncpg' not in url:
        url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)

    log.info("Engine URL built (credentials hidden)")

    return create_async_engine(
        url,
        connect_args={
            # ssl=True → encrypted but no certificate verification (works with Neon)
            "ssl": True,
            # Disable prepared statement cache for PgBouncer (Neon pooler) compatibility
            "statement_cache_size": 0,
        },
        echo=False,
        pool_pre_ping=True,   # reconnect on stale connections
    )


engine = _build_engine()
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    log.info("Running init_db — creating tables if needed…")
    try:
        async with engine.begin() as conn:
            from . import models  # noqa
            await conn.run_sync(Base.metadata.create_all)
        log.info("init_db complete — all tables ready")
    except Exception as e:
        log.error(f"init_db FAILED: {e}")
        raise
