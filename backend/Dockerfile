# syntax=docker/dockerfile:1
# Uses the official uv image (Python 3.11, Debian slim) for minimal size
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

# Install Tesseract OCR (for bill scanning)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# uv performance settings
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# --- Dependency layer (cached unless pyproject.toml / uv.lock change) ---
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# --- Application layer ---
COPY app/ ./app/
RUN uv sync --frozen --no-dev

# Runtime directories (overridden by Docker volumes in production)
RUN mkdir -p /app/data /app/uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
