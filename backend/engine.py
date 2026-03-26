"""
engine.py — High-level orchestrator for the full audit pipeline.

Usage
─────
    from backend.engine import analyse_url, full_audit

    # Extraction only (existing behaviour):
    metrics = await analyse_url("https://example.com")

    # Full audit (extraction + AI analysis):
    report = await full_audit("https://example.com")

Pipeline:
    fetcher.fetch_page → parser.parse_dom → extractor.extract_metrics
                                              ↓
                                    ai.analyse_with_ai
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from typing import Any, Awaitable, Callable, Dict, Literal, Optional

from backend.fetcher import fetch_page
from backend.parser import parse_dom
from backend.extractor import extract_metrics
from backend.ai import analyse_with_ai

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[str, str, Optional[int]], Awaitable[None]]

def _log_stage(stage: str, detail: str) -> None:
    logger.info("[stage:%s] %s", stage, detail)


async def _emit_progress(
    progress_callback: Optional[ProgressCallback],
    stage: str,
    detail: str,
    percent: Optional[int] = None,
) -> None:
    _log_stage(stage, detail)
    if progress_callback is not None:
        await progress_callback(stage, detail, percent)


async def analyse_url(
    url: str,
    *,
    progress_callback: Optional[ProgressCallback] = None,
) -> Dict[str, Any]:
    """
    Extraction-only pipeline: fetch → parse → extract.

    Returns the raw PageSnapshot dict (no AI analysis).
    """
    if not url or not url.startswith(("http://", "https://")):
        raise ValueError(
            f"URL must start with http:// or https:// — got {url!r}"
        )

    await _emit_progress(progress_callback, "extract:start", f"starting extraction for {url}", 5)

    await _emit_progress(progress_callback, "extract:fetch", "rendering page with Playwright", 10)
    html = await fetch_page(url, progress_callback=progress_callback)
    await _emit_progress(progress_callback, "extract:fetch_done", f"fetched {len(html)} bytes of rendered HTML", 45)

    await _emit_progress(progress_callback, "extract:parse", "parsing rendered HTML into DOM", 55)
    dom = parse_dom(html)
    await _emit_progress(progress_callback, "extract:metrics", "extracting structured metrics from DOM", 70)
    snapshot = extract_metrics(dom, url)

    await _emit_progress(progress_callback, "extract:done", "extraction complete", 100)
    return snapshot


async def full_audit(
    url: str,
    *,
    ai_backend: Literal["ollama", "openrouter"] = "ollama",
    progress_callback: Optional[ProgressCallback] = None,
) -> Dict[str, Any]:
    """
    Full pipeline: fetch → parse → extract → AI analysis.

    Returns
    -------
    dict
        {
          "url": "...",
          "page_type_hint": "...",
          "metrics": { ... },
          "content_signals": { ... },
          "ai_report": {
              "summary": "...",
              "insights": { ... },
              "issues": [ ... ]
          }
        }
    """
    if not url or not url.startswith(("http://", "https://")):
        raise ValueError(
            f"URL must start with http:// or https:// — got {url!r}"
        )

    await _emit_progress(progress_callback, "audit:start", f"starting full audit for {url}", 2)

    # Phase 1: Extraction.
    await _emit_progress(progress_callback, "audit:fetch", "rendering target page", 8)
    html = await fetch_page(url, progress_callback=progress_callback)
    await _emit_progress(progress_callback, "audit:fetch_done", f"fetched {len(html)} bytes of rendered HTML", 38)

    await _emit_progress(progress_callback, "audit:parse", "parsing rendered HTML", 45)
    dom = parse_dom(html)
    await _emit_progress(progress_callback, "audit:metrics", "extracting page metrics and content signals", 55)
    snapshot = extract_metrics(dom, url)
    await _emit_progress(progress_callback, "audit:ai_prepare", "extraction complete, preparing AI analysis", 62)

    # Phase 2: AI analysis.
    await _emit_progress(progress_callback, "audit:ai_start", f"running AI analysis with backend={ai_backend}", 68)
    ai_report = await analyse_with_ai(snapshot, backend=ai_backend, progress_callback=progress_callback)
    await _emit_progress(progress_callback, "audit:ai_done", "AI analysis complete", 92)

    # Phase 3: Merge.
    snapshot["ai_report"] = ai_report

    await _emit_progress(progress_callback, "audit:done", "full audit complete", 100)
    return snapshot


# ── CLI ───────────────────────────────────────────────────────────────

async def _main() -> None:
    """CLI: ``python -m backend.engine <url> [--ai] [--backend openrouter]``."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    )

    args = sys.argv[1:]
    if not args:
        print("Usage: python -m backend.engine <url> [--ai] [--backend ollama|openrouter]")
        sys.exit(1)

    url = args[0]
    use_ai = "--ai" in args
    backend: Literal["ollama", "openrouter"] = "ollama"
    if "--backend" in args:
        idx = args.index("--backend")
        if idx + 1 < len(args):
            backend = args[idx + 1]  # type: ignore[assignment]

    try:
        if use_ai:
            result = await full_audit(url, ai_backend=backend)
        else:
            result = await analyse_url(url)
    except Exception:
        logger.exception("Pipeline failed for %s", url)
        sys.exit(1)

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(_main())
