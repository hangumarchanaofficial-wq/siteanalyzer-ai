"""
extractor.py — Metrics extraction from a parsed DOM.

This is the **heart** of the extraction engine.  It walks the
BeautifulSoup tree exactly once (where possible) and accumulates
every metric defined in the spec.

Public API
──────────
    extract_metrics(dom, url, fetch_meta=None) → dict
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urlparse

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

    tree = _copy.deepcopy(dom)

    for selector in EXTRACT_CFG.boilerplate_selectors:
        for el in list(tree.select(selector)):
            el.decompose()

    to_remove = [tag for tag in tree.find_all(True) if not is_visible(tag)]
    for tag in to_remove:
        tag.decompose()

    for tag_name in EXTRACT_CFG.invisible_tags:
        for el in list(tree.find_all(tag_name)):
            el.decompose()

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
                if level in ("h2", "h3"):
                    texts[f"{level}_texts"].append(raw)

    return {"counts": counts, **texts}


# ──────────────────────────────────────────────────────────────────────
#  CTA counting  (IMPROVED — broader detection)
# ──────────────────────────────────────────────────────────────────────

# Social / navigation domains to exclude from CTA link detection.
_SOCIAL_DOMAINS = frozenset({
    "facebook.com", "twitter.com", "x.com", "linkedin.com",
    "instagram.com", "youtube.com", "tiktok.com", "pinterest.com",
    "reddit.com", "github.com", "t.me", "wa.me", "whatsapp.com",
})


def _is_social_link(el: Tag) -> bool:
    """Return True if an <a> points to a well-known social platform."""
    href = el.get("href", "")
    if not href:
        return False
    try:
        domain = urlparse(href).netloc.lower().lstrip("www.")
        return any(domain == sd or domain.endswith(f".{sd}") for sd in _SOCIAL_DOMAINS)
    except Exception:
        return False


def _extract_ctas(dom: BeautifulSoup) -> Dict[str, Any]:
    """
    Count visible CTA elements and collect their display texts.

    Improvements over v1:
    • Detects <input type="submit"> and <input type="button"> elements.
    • Detects elements with role="button" that are not <a> or <button>.
    • Excludes social-media outbound links from CTA count.
    • Considers data-cta, data-action attributes as CTA signals.

    Returns ``{"count": n, "cta_texts": ["...", ...]}``.
    """
    cta_texts: List[str] = []
    seen: Set[str] = set()

    def _add_cta(text: str) -> None:
        key = text.lower().strip()
        if key and key not in seen:
            seen.add(key)
            cta_texts.append(text.strip())

    # 1. Standard <button> and <a> elements (existing logic).
    for el in dom.find_all(["button", "a"]):
        if not is_element_visible(el):
            continue
        # Skip social links for <a> tags.
        if el.name == "a" and _is_social_link(el):
            continue
        if is_cta(el):
            text = el.get_text(separator=" ", strip=True)
            _add_cta(text)

    # 2. <input type="submit"> and <input type="button">.
    for el in dom.find_all("input"):
        if not is_element_visible(el):
            continue
        input_type = (el.get("type") or "").lower()
        if input_type in ("submit", "button"):
            text = el.get("value", "").strip()
            if text:
                _add_cta(text)

    # 3. Any element with role="button" not already covered.
    for el in dom.find_all(attrs={"role": "button"}):
        if not is_element_visible(el):
            continue
        if el.name in ("button", "a"):
            continue  # Already handled above.
        text = el.get_text(separator=" ", strip=True)
        _add_cta(text)

    # 4. Elements with explicit data-cta or data-action attributes.
    for attr in ("data-cta", "data-action"):
        for el in dom.find_all(attrs={attr: True}):
            if not is_element_visible(el):
                continue
            text = el.get_text(separator=" ", strip=True)
            _add_cta(text)

    return {"count": len(cta_texts), "cta_texts": cta_texts}


# ──────────────────────────────────────────────────────────────────────
#  Link classification
# ──────────────────────────────────────────────────────────────────────

def _classify_links(dom: BeautifulSoup, base_url: str) -> Dict[str, int]:
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
    title_tag = dom.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None

    if not title:
        og_title = dom.find("meta", attrs={"property": "og:title"})
        if og_title:
            title = og_title.get("content", "").strip() or None

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
    scores: Dict[str, int] = {k: 0 for k in _PAGE_TYPE_SIGNALS}

    searchable = " ".join(filter(None, [
        url.lower(),
        (meta.get("title") or "").lower(),
        (meta.get("description") or "").lower(),
    ]))

    for page_type, signals in _PAGE_TYPE_SIGNALS.items():
        for kw in signals["meta_keywords"]:
            if kw in searchable:
                scores[page_type] += 1
        for sel in signals["selectors"]:
            try:
                if dom.select_one(sel):
                    scores[page_type] += 2
            except Exception:
                pass

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    if scores[best] >= 2:
        return best
    return "generic"


# ──────────────────────────────────────────────────────────────────────
#  Main text excerpt
# ──────────────────────────────────────────────────────────────────────

_EXCERPT_MAX_CHARS = 500


def _get_main_text_excerpt(visible_text: str) -> str:
    if not visible_text:
        return ""
    excerpt = visible_text[:_EXCERPT_MAX_CHARS].strip()
    if len(visible_text) > _EXCERPT_MAX_CHARS:
        last_space = excerpt.rfind(" ")
        if last_space > 0:
            excerpt = excerpt[:last_space]
        excerpt += "…"
    return excerpt


# ──────────────────────────────────────────────────────────────────────
#  ★ NEW: Advanced Diagnostics extraction
# ──────────────────────────────────────────────────────────────────────

def _extract_advanced_diagnostics(
    dom: BeautifulSoup,
    url: str,
    fetch_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Extract the 14 advanced diagnostic metrics from the DOM and
    fetcher metadata.

    Parameters
    ----------
    dom : BeautifulSoup
        Parsed DOM tree.
    url : str
        The original page URL.
    fetch_meta : dict | None
        Metadata from FetchResult: {"status_code": int, "load_time_ms": int}.

    Returns
    -------
    dict
        All 14 advanced fields.  Values that cannot be determined
        from static HTML analysis are omitted (e.g. load_time_ms
        when fetch_meta is None).
    """
    adv: Dict[str, Any] = {}

    # ── From fetcher metadata ─────────────────────────────────────────
    if fetch_meta:
        if "load_time_ms" in fetch_meta:
            adv["load_time_ms"] = fetch_meta["load_time_ms"]
        if "status_code" in fetch_meta:
            adv["status_code"] = fetch_meta["status_code"]
        if "lcp_ms" in fetch_meta and fetch_meta["lcp_ms"] is not None:
            adv["lcp_ms"] = fetch_meta["lcp_ms"]
        if "cls" in fetch_meta and fetch_meta["cls"] is not None:
            adv["cls"] = fetch_meta["cls"]
        if "total_kb" in fetch_meta and fetch_meta["total_kb"] is not None:
            adv["total_kb"] = fetch_meta["total_kb"]
        if "html_kb" in fetch_meta and fetch_meta["html_kb"] is not None:
            adv["html_kb"] = fetch_meta["html_kb"]
        if "js_kb" in fetch_meta and fetch_meta["js_kb"] is not None:
            adv["js_kb"] = fetch_meta["js_kb"]
        if "css_kb" in fetch_meta and fetch_meta["css_kb"] is not None:
            adv["css_kb"] = fetch_meta["css_kb"]
        if "images_kb" in fetch_meta and fetch_meta["images_kb"] is not None:
            adv["images_kb"] = fetch_meta["images_kb"]

    # ── DOM element count ─────────────────────────────────────────────
    adv["dom_elements"] = len(dom.find_all(True))

    # ── Inline styles ─────────────────────────────────────────────────
    adv["inline_styles"] = len(dom.find_all(attrs={"style": True}))

    # ── External stylesheets ──────────────────────────────────────────
    stylesheets = dom.find_all("link", rel=lambda v: v and "stylesheet" in v)
    adv["external_stylesheets"] = len(stylesheets)

    # ── External scripts ──────────────────────────────────────────────
    scripts_with_src = dom.find_all("script", src=True)
    adv["external_scripts"] = len(scripts_with_src)

    # ── Forms ─────────────────────────────────────────────────────────
    adv["forms"] = len(dom.find_all("form"))

    # ── Videos (video tags + iframes pointing to video hosts) ─────────
    video_tags = len(dom.find_all("video"))
    video_iframes = 0
    video_hosts = ("youtube.com", "youtu.be", "vimeo.com", "dailymotion.com",
                   "wistia.com", "loom.com", "player.vimeo.com")
    for iframe in dom.find_all("iframe", src=True):
        src = (iframe.get("src") or "").lower()
        if any(host in src for host in video_hosts):
            video_iframes += 1
    adv["videos"] = video_tags + video_iframes

    # ── ARIA roles ────────────────────────────────────────────────────
    adv["aria_roles"] = len(dom.find_all(attrs={"role": True}))

    # ── Social links ──────────────────────────────────────────────────
    social_count = 0
    for anchor in dom.find_all("a", href=True):
        href = (anchor["href"] or "").lower()
        try:
            domain = urlparse(href).netloc.lower().lstrip("www.")
            if any(domain == sd or domain.endswith(f".{sd}") for sd in _SOCIAL_DOMAINS):
                social_count += 1
        except Exception:
            pass
    adv["social_links"] = social_count

    # ── HTTPS ─────────────────────────────────────────────────────────
    adv["https"] = url.lower().startswith("https://")

    # ── Favicon ───────────────────────────────────────────────────────
    favicon = dom.find("link", rel=lambda v: v and ("icon" in v or "shortcut icon" in v))
    adv["favicon"] = favicon is not None

    # ── HTML lang attribute ───────────────────────────────────────────
    html_tag = dom.find("html")
    lang = html_tag.get("lang", "").strip() if html_tag else ""
    adv["html_lang"] = lang if lang else None

    # ── Unlabelled inputs ─────────────────────────────────────────────
    unlabelled = 0
    labelled_ids: Set[str] = set()

    # Collect IDs referenced by <label for="...">
    for label_tag in dom.find_all("label", attrs={"for": True}):
        for_val = label_tag.get("for", "").strip()
        if for_val:
            labelled_ids.add(for_val)

    for inp in dom.find_all("input"):
        input_type = (inp.get("type") or "text").lower()
        # Skip hidden, submit, button, image, reset, file inputs.
        if input_type in ("hidden", "submit", "button", "image", "reset", "file"):
            continue

        has_id_label = inp.get("id", "").strip() in labelled_ids
        has_aria_label = bool(inp.get("aria-label", "").strip())
        has_aria_labelledby = bool(inp.get("aria-labelledby", "").strip())
        has_title = bool(inp.get("title", "").strip())
        has_placeholder = bool(inp.get("placeholder", "").strip())

        # Check if input is wrapped in a <label>.
        wrapped_in_label = any(
            parent.name == "label" for parent in inp.parents
            if isinstance(parent, Tag)
        )

        if not any([
            has_id_label, has_aria_label, has_aria_labelledby,
            has_title, wrapped_in_label,
        ]):
            unlabelled += 1

    # Also check <select> and <textarea>.
    for tag_name in ("select", "textarea"):
        for el in dom.find_all(tag_name):
            has_id_label = el.get("id", "").strip() in labelled_ids
            has_aria_label = bool(el.get("aria-label", "").strip())
            has_aria_labelledby = bool(el.get("aria-labelledby", "").strip())
            wrapped_in_label = any(
                parent.name == "label" for parent in el.parents
                if isinstance(parent, Tag)
            )
            if not any([has_id_label, has_aria_label, has_aria_labelledby, wrapped_in_label]):
                unlabelled += 1

    adv["unlabelled_inputs"] = unlabelled

    return adv


# ──────────────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────────────

def extract_metrics(
    dom: BeautifulSoup,
    url: str,
    fetch_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run every extraction sub-routine and return a unified metrics dict.

    Parameters
    ----------
    dom : BeautifulSoup
        Parsed DOM tree (from ``parse_dom``).
    url : str
        Original URL — used for link classification.
    fetch_meta : dict | None
        Optional metadata from the fetcher (status_code, load_time_ms).

    Returns
    -------
    dict
        Enriched metrics dictionary with core metrics, content signals,
        and advanced diagnostics.
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

    # ── Advanced diagnostics (NEW) ────────────────────────────────────
    advanced = _extract_advanced_diagnostics(dom, url, fetch_meta)

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
            "advanced": advanced,
        },
        "content_signals": {
            "h2_texts": heading_info["h2_texts"],
            "h3_texts": heading_info["h3_texts"],
            "cta_texts": cta_info["cta_texts"],
            "main_text_excerpt": _get_main_text_excerpt(visible_text),
        },
    }
