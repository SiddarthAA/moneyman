"""NLP / AI endpoints — parse natural language, upload bill for new transaction."""
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, Category, Transaction
from ..schemas import NLPTransactionRequest, NLPTransactionResult, TransactionOut
from ..routers.transactions import _update_account_balance, _get_tx_with_relations

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse", response_model=NLPTransactionResult)
def parse_nlp(payload: NLPTransactionRequest):
    """Parse a natural language string into a structured transaction preview."""
    try:
        from ..services.groq_service import parse_nlp_transaction
        result = parse_nlp_transaction(payload.text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI parsing failed: {e}")

    return NLPTransactionResult(
        type=result.get("type", "expense"),
        amount=float(result.get("amount", 0)),
        description=result.get("description", ""),
        party=result.get("party"),
        category_name=result.get("category"),
        confidence=float(result.get("confidence", 0.5)),
        raw_text=payload.text,
        notes=result.get("notes"),
    )


@router.post("/parse-and-save", response_model=TransactionOut)
def parse_and_save(payload: NLPTransactionRequest, db: Session = Depends(get_db)):
    """Parse NL text and immediately save the transaction."""
    try:
        from ..services.groq_service import parse_nlp_transaction
        result = parse_nlp_transaction(payload.text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI parsing failed: {e}")

    account_id = payload.account_id
    if not account_id:
        # Use first account as fallback
        first_acc = db.query(Account).first()
        if not first_acc:
            raise HTTPException(status_code=400, detail="No accounts exist. Create one first.")
        account_id = first_acc.id

    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Resolve category
    category_id = None
    cat_name = result.get("category")
    if cat_name:
        cat = db.query(Category).filter(Category.name.ilike(cat_name)).first()
        if cat:
            category_id = cat.id

    tx = Transaction(
        type=result.get("type", "expense"),
        amount=float(result.get("amount", 0)),
        description=result.get("description", ""),
        party=result.get("party"),
        account_id=account_id,
        category_id=category_id,
        notes=result.get("notes"),
        date=datetime.utcnow(),
        ai_processed=True,
    )
    db.add(tx)
    tx_type = tx.type.value if hasattr(tx.type, "value") else tx.type
    _update_account_balance(db, account_id, tx.amount, tx_type)
    db.commit()
    db.refresh(tx)
    return _get_tx_with_relations(db, tx.id)


@router.post("/scan-bill", response_model=NLPTransactionResult)
async def scan_bill(file: UploadFile = File(...)):
    """OCR a bill image and return structured transaction data (preview only)."""
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file_bytes = await file.read()

    from ..services.ocr_service import extract_text_from_image
    try:
        ocr_text = extract_text_from_image(file_bytes)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not ocr_text:
        raise HTTPException(status_code=422, detail="Could not extract text from image")

    try:
        from ..services.groq_service import enrich_ocr_text
        result = enrich_ocr_text(ocr_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI enrichment failed: {e}")

    return NLPTransactionResult(
        type="expense",
        amount=float(result.get("amount", 0)),
        description=result.get("description", ""),
        party=result.get("party"),
        category_name=result.get("category"),
        confidence=float(result.get("confidence", 0.5)),
        raw_text=ocr_text,
        notes=result.get("notes"),
    )
