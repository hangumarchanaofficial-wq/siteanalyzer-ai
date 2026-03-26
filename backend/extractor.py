"""
extractor.py — Metrics extraction from a parsed DOM.

This is the **heart** of the extraction engine.  It walks the
BeautifulSoup tree exactly once (where possible) and accumulates
every metric defined in the spec.

Public API
──────────
    extract_metrics(dom, url) → dict
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Set

from bs4 import BeautifulSoup, NavigableString, Tag

from backend.config import EXTRACT_CFG
from backend.helpers import (
    get_base_domain,
    is_cta,
    is_element_visible,
    is_internal_link,
    is_visible,
    normalise_url,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
#  Word-count helpers
# ──────────────────────────────────────────────────────────────────────

_WHITESPACE_RE = re.compile(r"\s+")


def _get_visible_text(dom: BeautifulSoup) -> str:
    """
    Extract visible, non-boilerplate text from the DOM.

    Steps:
    1. Deep-clone the tree so we don't mutate the original.
    2. Remove all boilerplate sub-trees (nav, footer, …).
    3. Remove invisible elements.
    4. Remove script/style/template tags.
    5. Collect remaining text, deduplicating identical blocks.
    """
    import copy as _copy

    # Deep-copy to avoid mutating the caller's DOM.
    tree = _copy.deepcopy(dom)

    # --- Strip boilerplate containers (collect first, then decompose) ---
    for selector in EXTRACT_CFG.boilerplate_selectors:
        for el in list(tree.select(selector)):
            el.decompose()

    # --- Strip invisible elements (collect first, then decompose) ---
    to_remove = [tag for tag in tree.find_all(True) if not is_visible(tag)]
    for tag in to_remove:
        tag.decompose()

    # --- Strip script/style/noscript/template explicitly ---
    for tag_name in EXTRACT_CFG.invisible_tags:
        for el in list(tree.find_all(tag_name)):
            el.decompose()

    # --- Collect text blocks and deduplicate ---
    seen: Set[str] = set()
    text_parts: List[str] = []

    for string in tree.stripped_strings:
        normalised = _WHITESPACE_RE.sub(" ", string).strip()
        if normalised and normalised not in seen:
            seen.add(normalised)
            text_parts.append(normalised)

    return " ".join(text_parts)


# ──────────────────────────────────────────────────────────────────────
#  Heading extraction
# ──────────────────────────────────────────────────────────────────────

def _extract_headings(dom: BeautifulSoup) -> Dict[str, Any]:
    """
    Count visible, non-duplicate H1/H2/H3 headings and collect their texts.

    Returns::

        {
          "counts": {"h1": n, "h2": n, "h3": n},
          "h2_texts": ["...", ...],
          "h3_texts": ["...", ...],
        }
    """
    counts: Dict[str, int] = {"h1": 0, "h2": 0, "h3": 0}
    texts: Dict[str, List[str]] = {"h2_texts": [], "h3_texts": []}
    seen: Set[str] = set()

    for level in ("h1", "h2", "h3"):
        for heading in dom.find_all(level):
            if not is_element_visible(heading):
                continue
            raw = heading.get_text(separator=" ", strip=True)
            key = raw.lower()
            if key and key not in seen:
                seen.add(key)
                counts[level] += 1
                # Collect original-case texts for h2 and h3.
                if level in ("h2", "h3"):
                    texts[f"{level}_texts"].append(raw)

    return {"counts": counts, **texts}


# ──────────────────────────────────────────────────────────────────────
#  CTA counting
# ──────────────────────────────────────────────────────────────────────

def _extract_ctas(dom: BeautifulSoup) -> Dict[str, Any]:
    """
    Count visible CTA elements and collect their display texts.

    Returns ``{"count": n, "cta_texts": ["...", ...]}``.
    """
    cta_texts: List[str] = []
    seen: Set[str] = set()

    for el in dom.find_all(["button", "a"]):
        if is_element_visible(el) and is_cta(el):
            text = el.get_text(separator=" ", strip=True)
            key = text.lower()
            if key and key not in seen:
                seen.add(key)
                cta_texts.append(text)

    return {"count": len(cta_texts), "cta_texts": cta_texts}


# ──────────────────────────────────────────────────────────────────────
#  Link classification
# ──────────────────────────────────────────────────────────────────────

def _classify_links(dom: BeautifulSoup, base_url: str) -> Dict[str, int]:
    """
    Classify every ``<a>`` link as internal or external.

    Skips fragment-only, javascript:, mailto:, and tel: links.
    Deduplicates by normalised URL.
    """
    base_domain = get_base_domain(base_url)
    internal: Set[str] = set()
    external: Set[str] = set()

    for anchor in dom.find_all("a", href=True):
        href = anchor["href"]
        resolved = normalise_url(href, base_url)

        if resolved is None:
            continue

        if is_internal_link(resolved, base_domain):
            internal.add(resolved)
        else:
            external.add(resolved)

    return {"internal": len(internal), "external": len(external)}


# ──────────────────────────────────────────────────────────────────────
#  Image & alt-text analysis
# ──────────────────────────────────────────────────────────────────────

def _analyse_images(dom: BeautifulSoup) -> Dict[str, Any]:
    """
    Count images and calculate the percentage missing alt text.

    An image is considered *missing alt* if:
    • It has no ``alt`` attribute at all, **or**
    • Its ``alt`` attribute is an empty string.
    """
    images = dom.find_all("img")
    total = len(images)

    if total == 0:
        return {"count": 0, "missing_alt_percent": 0.0}

    missing = sum(
        1 for img in images
        if not img.get("alt", "").strip()
    )

    return {
        "count": total,
        "missing_alt_percent": round((missing / total) * 100, 2),
    }


# ──────────────────────────────────────────────────────────────────────
#  Meta tag extraction
# ──────────────────────────────────────────────────────────────────────

def _extract_meta(dom: BeautifulSoup) -> Dict[str, Optional[str]]:
    """
    Extract the page's meta title and description.

    Fallback chain:
    • title  → <title> → og:title
    • description → meta[name=description] → og:description
    """
    # --- Title ---
    title_tag = dom.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None

    if not title:
        og_title = dom.find("meta", attrs={"property": "og:title"})
        if og_title:
            title = og_title.get("content", "").strip() or None

    # --- Description ---
    desc_tag = dom.find("meta", attrs={"name": "description"})
    description = desc_tag.get("content", "").strip() if desc_tag else None

    if not description:
        og_desc = dom.find("meta", attrs={"property": "og:description"})
        if og_desc:
            description = og_desc.get("content", "").strip() or None

    return {"title": title, "description": description}


# ──────────────────────────────────────────────────────────────────────
#  Page-type classification
# ──────────────────────────────────────────────────────────────────────

# Keywords / signals used by the page-type heuristic.
_PAGE_TYPE_SIGNALS: Dict[str, Dict[str, Any]] = {
    "ecommerce_product": {
        "meta_keywords": ["product", "price", "add to cart", "buy", "shop"],
        "selectors": ["[data-product]", ".product-detail", ".pdp", "#product"],
    },
    "ecommerce_listing": {
        "meta_keywords": ["products", "shop", "catalog", "collection"],
        "selectors": [".product-grid", ".product-list", ".catalog"],
    },
    "blog_post": {
        "meta_keywords": ["blog", "article", "post", "author"],
        "selectors": ["article", ".post", ".blog-post", ".entry-content"],
    },
    "news_homepage": {
        "meta_keywords": ["news", "breaking", "headlines", "latest"],
        "selectors": [".news", ".headlines", ".breaking"],
    },
    "news_article": {
        "meta_keywords": ["news", "reporter", "published", "updated"],
        "selectors": ["article", ".article-body", ".story-body"],
    },
    "landing_page": {
        "meta_keywords": ["sign up", "get started", "free trial", "pricing"],
        "selectors": [".hero", ".cta-section", ".pricing"],
    },
    "documentation": {
        "meta_keywords": ["docs", "documentation", "api", "reference", "guide"],
        "selectors": [".docs", ".documentation", ".api-reference"],
    },
}


def _detect_page_type(
    dom: BeautifulSoup,
    url: str,
    meta: Dict[str, Optional[str]],
) -> str:
    """
    Best-effort heuristic to classify the page type.

    Scoring approach:
    • +2 for each matching CSS selector found in the DOM.
    • +1 for each keyword found in the URL, title, or description.
    The category with the highest score wins.  Falls back to
    ``"generic"`` when no signal is strong enough.
    """
    scores: Dict[str, int] = {k: 0 for k in _PAGE_TYPE_SIGNALS}

    # Combine searchable text from meta + URL.
    searchable = " ".join(filter(None, [
        url.lower(),
        (meta.get("title") or "").lower(),
        (meta.get("description") or "").lower(),
    ]))

    for page_type, signals in _PAGE_TYPE_SIGNALS.items():
        # Keyword matches.
        for kw in signals["meta_keywords"]:
            if kw in searchable:
                scores[page_type] += 1

        # Selector matches (presence check only).
        for sel in signals["selectors"]:
            try:
                if dom.select_one(sel):
                    scores[page_type] += 2
            except Exception:
                pass  # Malformed selector — skip.

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    if scores[best] >= 2:
        return best
    return "generic"


# ──────────────────────────────────────────────────────────────────────
#  Main text excerpt
# ──────────────────────────────────────────────────────────────────────

_EXCERPT_MAX_CHARS = 500


def _get_main_text_excerpt(visible_text: str) -> str:
    """
    Return the first ~500 characters of visible body text as a preview.
    """
    if not visible_text:
        return ""
    excerpt = visible_text[:_EXCERPT_MAX_CHARS].strip()
    if len(visible_text) > _EXCERPT_MAX_CHARS:
        # Trim to last full word.
        last_space = excerpt.rfind(" ")
        if last_space > 0:
            excerpt = excerpt[:last_space]
        excerpt += "…"
    return excerpt


# ──────────────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────────────

def extract_metrics(dom: BeautifulSoup, url: str) -> Dict[str, Any]:
    """
    Run every extraction sub-routine and return a unified metrics dict.

    Parameters
    ----------
    dom : BeautifulSoup
        Parsed DOM tree (from ``parse_dom``).
    url : str
        Original URL — used for link classification.

    Returns
    -------
    dict
        Enriched metrics dictionary::

            {
              "url": "...",
              "page_type_hint": "news_homepage",
              "metrics": {
                "word_count": 2359,
                "headings": {"h1": 0, "h2": 2, "h3": 2},
                "cta_count": 11,
                "links": {"internal": 195, "external": 42},
                "images": 234,
                "missing_alt_percent": 54.27,
                "meta": {"title": "...", "description": "..."}
              },
              "content_signals": {
                "h2_texts": ["..."],
                "h3_texts": ["..."],
                "cta_texts": ["..."],
                "main_text_excerpt": "..."
              }
            }
    """
    logger.info("Extracting metrics for %s …", url)

    # ── Core metrics ──────────────────────────────────────────────────
    visible_text = _get_visible_text(dom)
    word_count = len(visible_text.split()) if visible_text else 0

    heading_info = _extract_headings(dom)
    cta_info = _extract_ctas(dom)
    links = _classify_links(dom, url)
    image_info = _analyse_images(dom)
    meta = _extract_meta(dom)

    # ── Page-type classification ──────────────────────────────────────
    page_type = _detect_page_type(dom, url, meta)

    # ── Assemble output ───────────────────────────────────────────────
    return {
        "url": url,
        "page_type_hint": page_type,
        "metrics": {
            "word_count": word_count,
            "headings": heading_info["counts"],
            "cta_count": cta_info["count"],
            "links": links,
            "image_count": image_info["count"],
            "missing_alt_percent": image_info["missing_alt_percent"],
            "meta": meta,
        },
        "content_signals": {
            "h2_texts": heading_info["h2_texts"],
            "h3_texts": heading_info["h3_texts"],
            "cta_texts": cta_info["cta_texts"],
            "main_text_excerpt": _get_main_text_excerpt(visible_text),
        },
    }
