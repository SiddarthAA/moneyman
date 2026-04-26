import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Account, Category, Transaction, TransactionType
from ..schemas import TransactionCreate, TransactionOut, TransactionUpdate

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _update_account_balance(db: Session, account_id: int, amount: float, tx_type: str, reverse: bool = False):
    """Adjust account balance when a transaction is created or deleted."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return
    delta = amount if tx_type == "income" else -amount
    if reverse:
        delta = -delta
    account.balance += delta
    db.add(account)


def _get_tx_with_relations(db: Session, tx_id: int) -> Transaction:
    tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.account), joinedload(Transaction.category))
        .filter(Transaction.id == tx_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    type: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).options(
        joinedload(Transaction.account), joinedload(Transaction.category)
    )
    if type:
        q = q.filter(Transaction.type == type)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Transaction.description.ilike(like)
            | Transaction.party.ilike(like)
            | Transaction.notes.ilike(like)
        )
    if start_date:
        q = q.filter(Transaction.date >= start_date)
    if end_date:
        q = q.filter(Transaction.date <= end_date)
    return q.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = datetime.utcnow()

    tx = Transaction(**data)
    db.add(tx)
    _update_account_balance(db, payload.account_id, payload.amount, payload.type.value)
    db.commit()
    db.refresh(tx)
    return _get_tx_with_relations(db, tx.id)


@router.patch("/{tx_id}", response_model=TransactionOut)
def update_transaction(tx_id: int, payload: TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse old balance effect
    _update_account_balance(db, tx.account_id, tx.amount, tx.type.value, reverse=True)

    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(tx, k, v)

    # Apply new balance effect
    _update_account_balance(db, tx.account_id, tx.amount, tx.type.value)
    db.commit()
    db.refresh(tx)
    return _get_tx_with_relations(db, tx.id)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    _update_account_balance(db, tx.account_id, tx.amount, tx.type.value, reverse=True)
    db.delete(tx)
    db.commit()


@router.post("/{tx_id}/bill", response_model=TransactionOut)
async def upload_bill(tx_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a bill image, run OCR + Groq enrichment, attach to transaction."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    allowed = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    ext = Path(file.filename or "bill").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / filename

    file_bytes = await file.read()
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # OCR
    from ..services.ocr_service import extract_text_from_image
    ocr_text = extract_text_from_image(file_bytes)
    tx.bill_path = filename
    tx.bill_ocr_text = ocr_text

    # Groq enrichment if OCR found text
    if ocr_text:
        try:
            from ..services.groq_service import enrich_ocr_text
            enriched = enrich_ocr_text(ocr_text)
            if enriched.get("amount") and not tx.amount:
                tx.amount = float(enriched["amount"])
            if enriched.get("party") and not tx.party:
                tx.party = enriched["party"]
            if enriched.get("description") and tx.description == "":
                tx.description = enriched["description"]
            # Auto-assign category by name
            if enriched.get("category") and not tx.category_id:
                cat_name = enriched["category"].lower()
                cat = db.query(Category).filter(Category.name.ilike(cat_name)).first()
                if cat:
                    tx.category_id = cat.id
            tx.ai_processed = True
        except Exception:
            pass

    db.commit()
    db.refresh(tx)
    return _get_tx_with_relations(db, tx.id)
