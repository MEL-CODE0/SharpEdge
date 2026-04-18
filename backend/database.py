import re
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings


def _build_engine():
    url = settings.database_url

    # asyncpg does NOT accept sslmode/ssl/channel_binding as URL query params.
    # Strip them all out and pass SSL via connect_args instead.
    url = re.sub(r'[?&]sslmode=[^&]*', '', url)
    url = re.sub(r'[?&]ssl=[^&]*', '', url)
    url = re.sub(r'[?&]channel_binding=[^&]*', '', url)
    url = re.sub(r'[?&]$', '', url)  # clean trailing ? or &

    # Ensure asyncpg dialect prefix
    if url.startswith('postgresql://'):
        url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    elif url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql+asyncpg://', 1)

    ssl_ctx = ssl.create_default_context()
    return create_async_engine(
        url,
        connect_args={"ssl": ssl_ctx},
        echo=False,
    )


engine = _build_engine()
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        from . import models  # noqa
        await conn.run_sync(Base.metadata.create_all)
