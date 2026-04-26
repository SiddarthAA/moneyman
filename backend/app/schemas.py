from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .models import AccountType, TransactionType


# ── Account ──────────────────────────────────────────────────────────────────
class AccountCreate(BaseModel):
    name: str
    account_type: AccountType = AccountType.daily
    balance: float = 0.0
    monthly_limit: Optional[float] = None
    color: str = "#6366f1"


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[AccountType] = None
    balance: Optional[float] = None
    monthly_limit: Optional[float] = None
    color: Optional[str] = None


class AccountOut(BaseModel):
    id: int
    name: str
    account_type: AccountType
    balance: float
    monthly_limit: Optional[float]
    color: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Category ──────────────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    icon: str = "tag"
    monthly_budget: Optional[float] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    monthly_budget: Optional[float] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str
    monthly_budget: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Transaction ───────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float
    description: str
    party: Optional[str] = None
    account_id: int
    category_id: Optional[int] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    party: Optional[str] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    type: TransactionType
    amount: float
    description: str
    party: Optional[str]
    account_id: int
    category_id: Optional[int]
    date: datetime
    notes: Optional[str]
    bill_path: Optional[str]
    bill_ocr_text: Optional[str]
    ai_processed: bool
    created_at: datetime
    account: Optional[AccountOut] = None
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}


# ── NLP / AI ──────────────────────────────────────────────────────────────────
class NLPTransactionRequest(BaseModel):
    text: str
    account_id: Optional[int] = None


class NLPTransactionResult(BaseModel):
    type: TransactionType
    amount: float
    description: str
    party: Optional[str]
    category_name: Optional[str]
    confidence: float
    raw_text: str
    notes: Optional[str] = None


class DepositPayload(BaseModel):
    amount: float
    description: str = "Direct deposit"
    notes: Optional[str] = None


class TransferPayload(BaseModel):
    to_account_id: int
    amount: float
    description: Optional[str] = None
    notes: Optional[str] = None
