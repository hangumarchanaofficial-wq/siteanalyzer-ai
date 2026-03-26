"""
server.py — FastAPI REST endpoint for extraction + AI audit.

Endpoints:
    POST /api/extract   →  Extraction only (existing)
    POST /api/audit     →  Full extraction + AI analysis (new)
    GET  /health        →  Health check

Start with:
    uvicorn backend.server:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
import os
import uuid
from typing import Any, Dict, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import uvicorn

from backend.ai_config import OPENROUTER_CFG
from backend.engine import analyse_url, full_audit

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

app = FastAPI(
    title="SiteInsight AI — Audit Engine",
    version="2.0.0",
    description=(
        "Extract structured metrics from any webpage and run AI-powered "
        "SEO, content, UX, and accessibility analysis."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIT_JOBS: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_job_event(job: Dict[str, Any], stage: str, detail: str, percent: int | None) -> None:
    events = job.setdefault("events", [])
    events.append(
        {
            "timestamp": _now_iso(),
            "stage": stage,
            "detail": detail,
            "percent": percent if percent is not None else job.get("percent", 0),
        }
    )
    if len(events) > 40:
        del events[:-40]


# ── Request schemas ───────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    url: HttpUrl


class AuditRequest(BaseModel):
    url: HttpUrl
    backend: Literal["ollama", "openrouter"] = "openrouter"


async def _update_job(job_id: str, stage: str, detail: str, percent: int | None = None) -> None:
    job = AUDIT_JOBS.get(job_id)
    if not job:
        return

    previous_stage = job.get("stage")
    previous_detail = job.get("detail")
    previous_percent = job.get("percent")

    job["stage"] = stage
    job["detail"] = detail
    if percent is not None:
        job["percent"] = percent
    job["updated_at"] = _now_iso()

    if (
        stage != previous_stage
        or detail != previous_detail
        or percent != previous_percent
    ):
        _append_job_event(job, stage, detail, percent)


async def _run_audit_job(job_id: str, url_str: str, backend: Literal["ollama", "openrouter"]) -> None:
    try:
        result = await full_audit(
            url_str,
            ai_backend=backend,
            progress_callback=lambda stage, detail, percent=None: _update_job(
                job_id, stage, detail, percent
            ),
        )
        job = AUDIT_JOBS[job_id]
        job["status"] = "success"
        job["result"] = result
        job["stage"] = "audit:done"
        job["detail"] = "Audit complete"
        job["percent"] = 100
        job["updated_at"] = _now_iso()
        _append_job_event(job, "audit:done", "Audit complete", 100)
    except Exception as exc:
        logging.exception("Audit job failed for %s", url_str)
        job = AUDIT_JOBS[job_id]
        job["status"] = "error"
        job["error"] = str(exc)
        job["detail"] = str(exc)
        job["updated_at"] = _now_iso()
        _append_job_event(job, job.get("stage", "audit:error"), str(exc), job.get("percent"))


# ── Endpoints ─────────────────────────────────────────────────────────

@app.post("/api/extract")
async def extract_endpoint(request: ExtractRequest) -> Dict[str, Any]:
    """Extract structured metrics (no AI)."""
    url_str = str(request.url)
    try:
        return await analyse_url(url_str)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logging.exception("Extraction failed for %s", url_str)
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")


@app.post("/api/audit")
async def audit_endpoint(request: AuditRequest) -> Dict[str, Any]:
    """Full audit: extraction + AI analysis."""
    url_str = str(request.url)
    try:
        return await full_audit(url_str, ai_backend=request.backend)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logging.exception("Audit failed for %s", url_str)
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")


@app.post("/api/audit/start")
async def audit_start_endpoint(request: AuditRequest) -> Dict[str, Any]:
    url_str = str(request.url)
    job_id = uuid.uuid4().hex
    AUDIT_JOBS[job_id] = {
        "job_id": job_id,
        "status": "running",
        "url": url_str,
        "backend": request.backend,
        "stage": "audit:queued",
        "detail": "Audit queued",
        "percent": 0,
        "result": None,
        "error": None,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "events": [],
    }
    _append_job_event(AUDIT_JOBS[job_id], "audit:queued", "Audit queued", 0)
    asyncio.create_task(_run_audit_job(job_id, url_str, request.backend))
    return AUDIT_JOBS[job_id]


@app.get("/api/audit/status/{job_id}")
async def audit_status_endpoint(job_id: str) -> Dict[str, Any]:
    job = AUDIT_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Audit job not found.")
    return job


@app.get("/health")
async def health_check():
    default_ai_backend = "ollama" if os.getenv("DEFAULT_AI_BACKEND") == "ollama" else "openrouter"
    return {
        "status": "ok",
        "version": "2.0.0",
        "ai": {
            "default_backend": default_ai_backend,
            "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY") or OPENROUTER_CFG.api_key),
            "openrouter_model": OPENROUTER_CFG.model,
        },
    }


if __name__ == "__main__":
    uvicorn.run(
        "backend.server:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "info"),
    )
