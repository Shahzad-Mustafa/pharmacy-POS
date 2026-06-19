import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.api.v1.router import api_router
from app.api.v1.websockets import ws_router
from app.core.redis import get_redis, close_redis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    if settings.ASYNC_DATABASE_URL:
        try:
            await init_db()
            logger.info("Database initialised")
        except Exception as e:
            logger.error(f"Database init failed: {e}")
    await get_redis()
    # Start in-process background notification checker (no Celery/Redis needed)
    from app.tasks import notification_check_loop
    bg_task = asyncio.create_task(notification_check_loop())
    yield
    bg_task.cancel()
    try:
        await bg_task
    except asyncio.CancelledError:
        pass
    await close_redis()
    logger.info("Shutting down")


BASE_PATH = os.environ.get("BASE_PATH", "/api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Pharmacy POS — Dual-Mode (Retail + Hospital) — FastAPI Backend",
    docs_url=f"{BASE_PATH}/docs",
    redoc_url=f"{BASE_PATH}/redoc",
    openapi_url=f"{BASE_PATH}/openapi.json",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred", "status": 500}})


app.include_router(api_router, prefix=f"{BASE_PATH}")
app.include_router(ws_router)


@app.get(f"{BASE_PATH}/healthz", tags=["Health"], summary="Health check")
async def healthz():
    redis_status = "not_configured"
    try:
        from app.core.redis import get_redis
        r = await get_redis()
        if r:
            await r.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "error"
    return {
        "status": "healthy",
        "database": "connected",
        "redis": redis_status,
        "celery": "not_running",
        "version": settings.VERSION,
    }


@app.get(f"{BASE_PATH}/health", tags=["Health"], summary="Detailed health check")
async def health():
    return await healthz()
