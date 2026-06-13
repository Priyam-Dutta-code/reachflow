"""ReachFlow V2 API — application factory and middleware stack."""
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware

from app.api.routers import (
    analytics,
    auth,
    campaigns,
    emails,
    growth,
    internal,
    leads,
    payments,
    system,
    unsubscribe,
)
from app.core.logging import Stopwatch, request_id_var, setup_logging
from app.core.security import get_secret_manager
from app.core.settings import get_settings

logger = logging.getLogger("reachflow")

API_VERSION = "2.0.0"


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        problems = settings.boot_problems()
        if problems:
            if settings.is_production:
                raise RuntimeError("Refusing to boot in production: " + "; ".join(problems))
            for problem in problems:
                logger.warning("boot check: %s (ok outside production)", problem)
        if not get_secret_manager().enabled:
            logger.warning("secret encryption DISABLED (no APP_ENCRYPTION_KEY)")
        logger.info("ReachFlow API %s up (env=%s)", API_VERSION, settings.app_env)
        yield

    app = FastAPI(
        title="ReachFlow API",
        version=API_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )

    app.add_middleware(GZipMiddleware, minimum_size=512)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Cron-Secret"],
    )

    @app.middleware("http")
    async def observability(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request_id_var.set(request_id)
        watch = Stopwatch()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        # security headers on every response
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-Frame-Options"] = "DENY"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
            response.headers["Cache-Control"] = "no-store"

        if request.url.path != "/health":  # keep keep-alive pings out of the logs
            logger.info(
                "request",
                extra={
                    "event": "http_request",
                    "method": request.method,
                    "route": request.url.path,
                    "status": response.status_code,
                    "duration_ms": watch.ms(),
                },
            )
        return response

    @app.exception_handler(Exception)
    async def global_exception_handler(_: Request, exc: Exception):
        logger.error("unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again or contact support."},
        )

    app.include_router(system.router, tags=["System"])
    app.include_router(internal.router, prefix="/internal", tags=["Internal"])
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
    app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
    app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])
    app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
    app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
    app.include_router(unsubscribe.router, prefix="/api", tags=["Compliance"])
    app.include_router(growth.router, prefix="/api", tags=["Growth"])

    return app


app = create_app()
