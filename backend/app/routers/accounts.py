from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Account, Category, Transaction, TransactionType
from ..schemas import AccountCreate, AccountUpdate, AccountOut, DepositPayload, TransferPayload

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()


@router.post("/", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(account_id: int, payload: AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(account, k, v)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    # Delete all transactions linked to this account first (account_id is NOT NULL)
    db.query(Transaction).filter(Transaction.account_id == account_id).delete()
    db.delete(account)
    db.commit()


@router.post("/{account_id}/deposit", response_model=AccountOut)
def deposit_to_account(account_id: int, payload: DepositPayload, db: Session = Depends(get_db)):
    """Add money directly to an account by creating an income transaction."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    salary_cat = db.query(Category).filter(Category.name == "salary").first()
    tx = Transaction(
        type=TransactionType.income,
        amount=payload.amount,
        description=payload.description,
        account_id=account_id,
        category_id=salary_cat.id if salary_cat else None,
        notes=payload.notes,
        date=datetime.utcnow(),
    )
    db.add(tx)

    # Update balance directly
    account.balance += payload.amount
    db.commit()
    db.refresh(account)
    return account


@router.post("/{account_id}/transfer", response_model=AccountOut)
def transfer_funds(account_id: int, payload: TransferPayload, db: Session = Depends(get_db)):
    """Transfer money from one account to another."""
    if account_id == payload.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    from_account = db.query(Account).filter(Account.id == account_id).first()
    if not from_account:
        raise HTTPException(status_code=404, detail="Source account not found")

    to_account = db.query(Account).filter(Account.id == payload.to_account_id).first()
    if not to_account:
        raise HTTPException(status_code=404, detail="Destination account not found")

    if from_account.balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    desc_out = payload.description or f"Transfer to {to_account.name}"
    desc_in = f"Transfer from {from_account.name}"

    now = datetime.utcnow()
    db.add(Transaction(
        type=TransactionType.expense,
        amount=payload.amount,
        description=desc_out,
        account_id=account_id,
        notes=payload.notes,
        date=now,
    ))
    db.add(Transaction(
        type=TransactionType.income,
        amount=payload.amount,
        description=desc_in,
        account_id=payload.to_account_id,
        notes=payload.notes,
        date=now,
    ))

    from_account.balance -= payload.amount
    to_account.balance += payload.amount
    db.commit()
    db.refresh(from_account)
    return from_account
