"""
MoneyMan – Personal Finance Tracker API
"""
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Search upward from this file: app/ → backend/ → project root
_here = Path(__file__).resolve().parent
for _candidate in [_here / ".env", _here.parent / ".env", _here.parent.parent / ".env"]:
    if _candidate.exists():
        load_dotenv(_candidate)
        break

from .database import engine, Base
from . import models  # noqa: F401 – ensure models are registered
from .routers import accounts, categories, transactions, analytics, ai

import os

_default_upload = str(Path(__file__).parent.parent / "uploads")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", _default_upload))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    # Seed default categories if none exist
    from .database import SessionLocal
    from .models import Category, Account, AccountType
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            defaults = [
                {"name": "food", "color": "#f97316", "icon": "utensils"},
                {"name": "protein", "color": "#22c55e", "icon": "dumbbell"},
                {"name": "transport", "color": "#3b82f6", "icon": "car"},
                {"name": "scooty", "color": "#fb923c", "icon": "bike"},
                {"name": "utilities", "color": "#8b5cf6", "icon": "zap"},
                {"name": "entertainment", "color": "#ec4899", "icon": "tv"},
                {"name": "health", "color": "#14b8a6", "icon": "heart"},
                {"name": "shopping", "color": "#f59e0b", "icon": "shopping-bag"},
                {"name": "dates", "color": "#e11d48", "icon": "heart"},
                {"name": "misc", "color": "#6b7280", "icon": "tag"},
                {"name": "salary", "color": "#10b981", "icon": "briefcase"},
                {"name": "freelance", "color": "#06b6d4", "icon": "code"},
                {"name": "investment", "color": "#6366f1", "icon": "trending-up"},
            ]
            for d in defaults:
                db.add(Category(**d))
        else:
            # Migration: add scooty category if it doesn't exist yet
            if not db.query(Category).filter(Category.name == "scooty").first():
                db.add(Category(name="scooty", color="#fb923c", icon="bike"))

        if db.query(Account).count() == 0:
            starter_accounts = [
                {"name": "Daily Funds", "account_type": AccountType.daily, "color": "#6366f1", "balance": 0.0},
                {"name": "Savings", "account_type": AccountType.savings, "color": "#10b981", "balance": 0.0},
            ]
            for a in starter_accounts:
                db.add(Account(**a))

        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="MoneyMan API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:7312,http://127.0.0.1:3000,http://127.0.0.1:7312",
        ).split(",")
        if o.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Serve uploaded bills
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok"}
