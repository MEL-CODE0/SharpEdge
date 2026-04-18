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
    log.info("init_db: creating tables…")
    # Never raise — let the app start even if DB is temporarily unreachable.
    # Tables will be created on first successful connection.
    try:
        async with engine.begin() as conn:
            from . import models  # noqa
            await conn.run_sync(Base.metadata.create_all)
        log.info("init_db: done")
    except Exception as e:
        log.error(f"init_db failed (app will still start): {e}")
