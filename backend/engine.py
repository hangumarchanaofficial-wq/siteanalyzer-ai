"""
engine.py — High-level orchestrator for the extraction pipeline.

Usage
─────
    from backend.engine import analyse_url

    metrics = await analyse_url("https://example.com")
    print(json.dumps(metrics, indent=2))

This module wires together:
    fetcher.fetch_page  →  parser.parse_dom  →  extractor.extract_metrics
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from typing import Any, Dict

from backend.fetcher import fetch_page
from backend.parser import parse_dom
from backend.extractor import extract_metrics

logger = logging.getLogger(__name__)


async def analyse_url(url: str) -> Dict[str, Any]:
    """
    End-to-end pipeline: fetch → parse → extract.

    Parameters
    ----------
    url : str
        Fully-qualified URL with scheme (``https://…``).

    Returns
    -------
    dict
        Structured metrics dictionary.

    Raises
    ------
    RuntimeError
        Propagated from ``fetch_page`` if the page cannot be loaded.
    ValueError
        If *url* looks obviously malformed.
    """
    # Basic sanity check.
    if not url or not url.startswith(("http://", "https://")):
        raise ValueError(
            f"URL must start with http:// or https:// — got {url!r}"
        )

    logger.info("━━━ Starting analysis of %s ━━━", url)

    # Step 1 — Render the page through Playwright.
    html = await fetch_page(url)
    logger.info("Fetched %d bytes of rendered HTML.", len(html))

    # Step 2 — Parse into a navigable DOM.
    dom = parse_dom(html)

    # Step 3 — Extract all metrics.
    metrics = extract_metrics(dom, url)

    logger.info("━━━ Analysis complete ━━━")
    return metrics


# ──────────────────────────────────────────────────────────────────────
#  CLI entry-point
# ──────────────────────────────────────────────────────────────────────

async def _main() -> None:
    """Simple CLI: ``python -m backend.engine <url>``."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    )

    if len(sys.argv) < 2:
        print("Usage: python -m backend.engine <url>")
        sys.exit(1)

    url = sys.argv[1]

    try:
        result = await analyse_url(url)
    except Exception as exc:
        logger.exception("Analysis failed for %s", url)
        sys.exit(1)

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(_main())
