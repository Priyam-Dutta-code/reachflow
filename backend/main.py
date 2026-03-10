"""main.py — ReachFlow FastAPI App"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import FRONTEND_URL
from database import engine, Base
from routers import auth, leads, campaigns, emails, analytics, payments

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReachFlow API", version="1.0.0", docs_url="/docs")

# Build allowed origins list
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
    FRONTEND_URL,
]
# Also allow all *.vercel.app subdomains for preview deployments
if FRONTEND_URL:
    ALLOWED_ORIGINS.append(FRONTEND_URL.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # any Vercel preview URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(leads.router,     prefix="/api/leads",     tags=["Leads"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(emails.router,    prefix="/api/emails",    tags=["Emails"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(payments.router,  prefix="/api/payments",  tags=["Payments"])

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "ReachFlow API v1.0"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
