"""Analytics endpoints – aggregated data for charts and spending limits."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, Category, Transaction, TransactionType

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def summary(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
):
    """Total income, expense, and net for a given month (defaults to current)."""
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month

    base = db.query(Transaction).filter(
        extract("year", Transaction.date) == year,
        extract("month", Transaction.date) == month,
    )

    income = base.filter(Transaction.type == TransactionType.income).with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()

    expense = base.filter(Transaction.type == TransactionType.expense).with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()

    return {
        "year": year,
        "month": month,
        "total_income": float(income),
        "total_expense": float(expense),
        "net": float(income) - float(expense),
    }


@router.get("/by-category")
def by_category(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
):
    """Expense breakdown by category for a given month."""
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month

    rows = (
        db.query(
            Category.id,
            Category.name,
            Category.color,
            Category.icon,
            Category.monthly_budget,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .outerjoin(
            Transaction,
            (Transaction.category_id == Category.id)
            & (Transaction.type == TransactionType.expense)
            & (extract("year", Transaction.date) == year)
            & (extract("month", Transaction.date) == month),
        )
        .group_by(Category.id)
        .all()
    )

    return [
        {
            "id": r.id,
            "name": r.name,
            "color": r.color,
            "icon": r.icon,
            "monthly_budget": r.monthly_budget,
            "total": float(r.total),
            "percent_used": round(float(r.total) / r.monthly_budget * 100, 1)
            if r.monthly_budget
            else None,
        }
        for r in rows
    ]


@router.get("/monthly-trend")
def monthly_trend(months: int = Query(default=6, le=24), db: Session = Depends(get_db)):
    """Income vs expense for the last N months."""
    now = datetime.utcnow()
    result = []
    for i in range(months - 1, -1, -1):
        # Go back i months
        target = now.replace(day=1) - timedelta(days=i * 28)
        y, m = target.year, target.month
        base = db.query(Transaction).filter(
            extract("year", Transaction.date) == y,
            extract("month", Transaction.date) == m,
        )
        income = float(
            base.filter(Transaction.type == TransactionType.income)
            .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
            .scalar()
        )
        expense = float(
            base.filter(Transaction.type == TransactionType.expense)
            .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
            .scalar()
        )
        result.append(
            {
                "year": y,
                "month": m,
                "label": target.strftime("%b %Y"),
                "income": income,
                "expense": expense,
                "net": income - expense,
            }
        )
    return result


@router.get("/account-limits")
def account_limits(db: Session = Depends(get_db)):
    """Current balance vs monthly limit for each account."""
    now = datetime.utcnow()
    accounts = db.query(Account).all()
    result = []
    for acc in accounts:
        # Spending this month (expenses only)
        spent = float(
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.account_id == acc.id,
                Transaction.type == TransactionType.expense,
                extract("year", Transaction.date) == now.year,
                extract("month", Transaction.date) == now.month,
            )
            .scalar()
        )
        result.append(
            {
                "id": acc.id,
                "name": acc.name,
                "account_type": acc.account_type,
                "color": acc.color,
                "balance": acc.balance,
                "monthly_limit": acc.monthly_limit,
                "spent_this_month": spent,
                "remaining": acc.monthly_limit - spent if acc.monthly_limit else None,
                "percent_used": round(spent / acc.monthly_limit * 100, 1)
                if acc.monthly_limit
                else None,
            }
        )
    return result


@router.get("/daily-spending")
def daily_spending(days: int = Query(default=30, le=90), db: Session = Depends(get_db)):
    """Daily expense totals for the last N days."""
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    rows = (
        db.query(
            func.date(Transaction.date).label("day"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.type == TransactionType.expense,
            Transaction.date >= start,
        )
        .group_by(func.date(Transaction.date))
        .order_by(func.date(Transaction.date))
        .all()
    )
    return [{"date": str(r.day), "amount": float(r.total)} for r in rows]
