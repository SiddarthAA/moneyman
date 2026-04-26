"""OCR service using pytesseract to extract text from bill images."""
import io
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from an image using Tesseract OCR."""
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("pytesseract is not installed")
    image = Image.open(io.BytesIO(file_bytes))
    # Convert to RGB if needed
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    try:
        text = pytesseract.image_to_string(image, config="--psm 6")
    except pytesseract.TesseractNotFoundError:
        raise RuntimeError(
            "Tesseract OCR binary not found. Install it with: sudo apt install tesseract-ocr"
        )
    return text.strip()


def extract_text_from_path(path: str | Path) -> str:
    """Extract text from a saved image file."""
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("pytesseract is not installed")
    image = Image.open(str(path))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    try:
        text = pytesseract.image_to_string(image, config="--psm 6")
    except pytesseract.TesseractNotFoundError:
        raise RuntimeError(
            "Tesseract OCR binary not found. Install it with: sudo apt install tesseract-ocr"
        )
    return text.strip()
