"""
server.py — FastAPI REST endpoint for the extraction engine.

Exposes a single POST endpoint:

    POST /api/extract
    Body: { "url": "https://example.com" }
    Response: { ...metrics... }

Start with:
    uvicorn backend.server:app --reload --port 8000
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from backend.engine import analyse_url

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

app = FastAPI(
    title="Website Audit - Extraction Engine",
    version="1.0.0",
    description="Extract structured metrics from any webpage using headless Chromium.",
)

# Allow the Next.js frontend (port 3000) to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ────────────────────────────────────────

class ExtractRequest(BaseModel):
    url: HttpUrl


class MetaResponse(BaseModel):
    title: str | None = None
    description: str | None = None


class HeadingsResponse(BaseModel):
    h1: int = 0
    h2: int = 0
    h3: int = 0


class LinksResponse(BaseModel):
    internal: int = 0
    external: int = 0


class ExtractResponse(BaseModel):
    url: str
    word_count: int
    headings: HeadingsResponse
    cta_count: int
    links: LinksResponse
    images: int
    missing_alt_percent: float
    meta: MetaResponse


# ── Endpoints ─────────────────────────────────────────────────────────

@app.post("/api/extract", response_model=ExtractResponse)
async def extract_metrics_endpoint(request: ExtractRequest) -> Dict[str, Any]:
    """
    Extract structured metrics from the given URL.

    The page is fully rendered via headless Chromium before
    any content analysis begins.
    """
    url_str = str(request.url)
    try:
        result = await analyse_url(url_str)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logging.exception("Unexpected error analysing %s", url_str)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {exc}",
        )


@app.get("/health")
async def health_check():
    return {"status": "ok"}
