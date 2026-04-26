from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    Text,
)
from sqlalchemy.orm import relationship
from .database import Base


class AccountType(str, PyEnum):
    savings = "savings"
    daily = "daily"
    investment = "investment"
    other = "other"


class TransactionType(str, PyEnum):
    income = "income"
    expense = "expense"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    account_type = Column(Enum(AccountType), default=AccountType.daily)
    balance = Column(Float, default=0.0)
    monthly_limit = Column(Float, nullable=True)
    color = Column(String, default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions_from = relationship(
        "Transaction", foreign_keys="Transaction.account_id", back_populates="account"
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#6366f1")
    icon = Column(String, default="tag")
    monthly_budget = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    party = Column(String, nullable=True)  # from_whom (income) or to_whom (expense)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    bill_path = Column(String, nullable=True)
    bill_ocr_text = Column(Text, nullable=True)
    ai_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", foreign_keys=[account_id], back_populates="transactions_from")
    category = relationship("Category", back_populates="transactions")
