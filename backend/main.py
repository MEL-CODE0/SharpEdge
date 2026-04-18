from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from .database import init_db
from .odds_api.scheduler import start_background_loop, stop_background_loop
from .routers import auth, opportunities, value_bets, scanner, profile, password_reset

logging.basicConfig(level=logging.INFO)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_background_loop()
    yield
    stop_background_loop()


app = FastAPI(title="SharpEdge API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
    return response


# API routes
app.include_router(auth.router)
app.include_router(opportunities.router)
app.include_router(value_bets.router)
app.include_router(scanner.router)
app.include_router(profile.router)
app.include_router(password_reset.router)


@app.get("/api/health")
async def health():
    from .database import engine
    from sqlalchemy import text
    db_ok = False
    db_error = None
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_error = str(e)
    return {"status": "ok", "db": "connected" if db_ok else "error", "db_error": db_error}


# Serve React frontend in production
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
