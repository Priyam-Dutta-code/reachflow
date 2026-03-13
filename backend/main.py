"""main.py - ReachFlow FastAPI App."""
import os
import traceback

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from config import ALLOW_DOCS, API_URL, FRONTEND_PREVIEW_REGEX, FRONTEND_URL, IS_PRODUCTION
from database import Base, engine
from routers import analytics, auth, campaigns, emails, leads, payments
from security import build_allowed_hosts, build_allowed_origins, build_preview_origin_regex

Base.metadata.create_all(bind=engine)

docs_url = "/docs" if ALLOW_DOCS else None
openapi_url = "/openapi.json" if ALLOW_DOCS else None

app = FastAPI(
    title="ReachFlow API",
    version="1.1.0",
    docs_url=docs_url,
    openapi_url=openapi_url,
)

allowed_origins = build_allowed_origins(FRONTEND_URL)
preview_regex = build_preview_origin_regex(FRONTEND_URL, FRONTEND_PREVIEW_REGEX)

app.add_middleware(GZipMiddleware, minimum_size=512)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=build_allowed_hosts(API_URL))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=preview_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Cashfree-Signature", "X-Cashfree-Timestamp"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-Frame-Options"] = "DENY"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "ReachFlow API", "version": "1.1.0"}


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    traceback.print_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again or contact support."},
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
