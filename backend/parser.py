"""
parser.py — HTML → BeautifulSoup DOM construction.

Thin wrapper that:
1. Accepts raw HTML.
2. Returns a BeautifulSoup tree parsed with the fast *lxml* backend.

Keeping this separate lets us swap parsers or add pre-processing
(e.g. sanitisation) without touching extraction logic.
"""

from __future__ import annotations

from bs4 import BeautifulSoup


def parse_dom(html: str) -> BeautifulSoup:
    """
    Parse *html* into a navigable BeautifulSoup DOM tree.

    Uses *lxml* for speed; falls back to the built-in *html.parser*
    if lxml is unavailable.

    Parameters
    ----------
    html : str
        Raw HTML markup (may be malformed — BS4 handles it gracefully).

    Returns
    -------
    BeautifulSoup
        Parsed document tree.
    """
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        # lxml not installed or broken — fallback
        return BeautifulSoup(html, "html.parser")
