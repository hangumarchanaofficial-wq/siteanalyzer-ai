"""
helpers.py — Shared utility functions for the extraction engine.

Pure functions with no side-effects.  Each helper encapsulates a single
heuristic so it can be unit-tested independently.
"""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlparse, urljoin

from bs4 import Tag

from backend.config import CTA_CFG, EXTRACT_CFG


# ──────────────────────────────────────────────────────────────────────
#  Visibility helpers
# ──────────────────────────────────────────────────────────────────────

def is_visible(element: Tag) -> bool:
    """
    Best-effort check whether an HTML element is visually rendered.

    Checks:
    • ``hidden`` attribute
    • ``aria-hidden="true"``
    • ``type="hidden"`` (for inputs)
    • inline ``style`` containing display:none / visibility:hidden / opacity:0
    • tag name is in the invisible-tags set (script, style, etc.)

    Note: This cannot replicate full CSS cascade / computed styles because
    we're working on static HTML.  It covers the vast majority of
    real-world hiding patterns.
    """
    if not isinstance(element, Tag):
        return True

    # 1. Explicit hidden attribute
    if element.has_attr("hidden"):
        return False

    # 2. ARIA hidden
    if element.get("aria-hidden", "").lower() == "true":
        return False

    # 3. Hidden input
    if element.name == "input" and element.get("type", "").lower() == "hidden":
        return False

    # 4. Inline style hints
    style = element.get("style", "")
    if style:
        style_normalised = style.replace(" ", "").lower()
        for hint in EXTRACT_CFG.hidden_style_hints:
            if hint.replace(" ", "") in style_normalised:
                return False

    # 5. Tag-level exclusion
    if element.name in EXTRACT_CFG.invisible_tags:
        return False

    return True


def _ancestors_visible(element: Tag) -> bool:
    """Return False if *any* ancestor of *element* is hidden."""
    for parent in element.parents:
        if isinstance(parent, Tag) and not is_visible(parent):
            return False
    return True


def is_element_visible(element: Tag) -> bool:
    """Full visibility check — element *and* all its ancestors."""
    return is_visible(element) and _ancestors_visible(element)


# ──────────────────────────────────────────────────────────────────────
#  CTA detection
# ──────────────────────────────────────────────────────────────────────

def is_cta(element: Tag) -> bool:
    """
    Determine whether *element* is a Call-To-Action.

    An element qualifies if it is a ``<button>`` **or** an ``<a>`` that
    satisfies at least one of:
    • Its visible text contains an action keyword.
    • It carries ``role="button"``.
    • One of its CSS classes matches a CTA class-hint.

    Navigation / footer links are excluded by checking the element's
    nearest semantic parent.
    """
    tag_name = element.name

    # Buttons are always CTAs (if visible & not inside nav/footer).
    if tag_name == "button":
        return not _inside_boilerplate(element)

    if tag_name != "a":
        return False

    # Exclude nav / footer links.
    if _inside_boilerplate(element):
        return False

    # --- Check role ---
    if element.get("role", "").lower() in CTA_CFG.button_roles:
        return True

    # --- Check CSS classes ---
    classes = " ".join(element.get("class", [])).lower()
    for hint in CTA_CFG.cta_class_hints:
        if hint in classes:
            return True

    # --- Check link text for action keywords ---
    text = element.get_text(separator=" ", strip=True).lower()
    for keyword in CTA_CFG.action_keywords:
        if keyword in text:
            return True

    return False


def _inside_boilerplate(element: Tag) -> bool:
    """Return True if *element* is nested inside a boilerplate container."""
    for parent in element.parents:
        if not isinstance(parent, Tag):
            continue
        # Check tag name
        if parent.name in ("nav", "header", "footer"):
            return True
        # Check role
        role = parent.get("role", "").lower()
        if role in ("navigation", "banner", "contentinfo"):
            return True
        # Check class names
        parent_classes = " ".join(parent.get("class", [])).lower()
        for sel in EXTRACT_CFG.boilerplate_selectors:
            # Only match class-based selectors (those starting with '.')
            if sel.startswith(".") and sel[1:] in parent_classes:
                return True
    return False


# ──────────────────────────────────────────────────────────────────────
#  Link classification
# ──────────────────────────────────────────────────────────────────────

def normalise_url(href: str, base_url: str) -> Optional[str]:
    """
    Resolve *href* against *base_url* and return a normalised URL.

    Returns ``None`` for fragment-only links, javascript: URIs, and
    mailto: schemes.
    """
    if not href:
        return None

    href = href.strip()

    # Skip non-HTTP schemes.
    if href.startswith(("javascript:", "mailto:", "tel:", "data:", "#")):
        return None

    resolved = urljoin(base_url, href)

    # Strip trailing fragment.
    parsed = urlparse(resolved)
    return parsed._replace(fragment="").geturl()


def is_internal_link(href: str, base_domain: str) -> bool:
    """
    Return ``True`` if the fully-qualified *href* belongs to *base_domain*.

    Handles ``www.`` prefix differences and sub-domains by comparing
    the registered domain portion.
    """
    parsed = urlparse(href)
    link_domain = (parsed.netloc or "").lower().lstrip("www.")
    base = base_domain.lower().lstrip("www.")
    return link_domain == base or link_domain.endswith(f".{base}")


def get_base_domain(url: str) -> str:
    """Extract the domain from a fully-qualified URL."""
    return (urlparse(url).netloc or "").lower().lstrip("www.")
