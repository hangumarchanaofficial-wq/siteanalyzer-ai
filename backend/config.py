"""
Configuration constants for the extraction engine.

Centralizes all tunable parameters — timeouts, CTA heuristics,
ignored selectors, etc. — so they can be adjusted without touching
business logic.
"""

from dataclasses import dataclass, field
from typing import FrozenSet


@dataclass(frozen=True)
class PlaywrightConfig:
    """Browser & page-load settings."""

    # Maximum time (ms) to wait for the page to reach network-idle.
    navigation_timeout_ms: int = 30_000

    # Extra time (ms) to wait *after* network-idle for late JS paints.
    post_load_delay_ms: int = 2_000

    # How many scroll iterations to handle lazy-loaded content.
    max_scroll_iterations: int = 5

    # Pause between scroll actions (ms).
    scroll_pause_ms: int = 1_000

    # Viewport dimensions for the headless browser.
    viewport_width: int = 1920
    viewport_height: int = 1080

    # User-agent string to appear as a real browser.
    user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )


@dataclass(frozen=True)
class CTAConfig:
    """Heuristics for identifying Call-To-Action elements."""

    # Action verbs / phrases that signal a CTA link.
    action_keywords: FrozenSet[str] = field(default_factory=lambda: frozenset({
        "buy", "purchase", "order", "shop",
        "start", "begin", "launch",
        "get", "grab", "claim",
        "try", "demo", "free trial",
        "sign up", "signup", "register", "join",
        "subscribe", "enroll", "enrol",
        "contact", "reach out", "talk to",
        "download", "install",
        "book", "schedule", "reserve",
        "donate", "contribute",
        "learn more", "find out", "discover",
        "request", "apply",
        "add to cart", "add to bag",
    }))

    # CSS class sub-strings that indicate a CTA element.
    cta_class_hints: FrozenSet[str] = field(default_factory=lambda: frozenset({
        "btn", "cta", "primary", "action",
        "button", "hero-link", "signup",
    }))

    # ARIA roles treated as buttons.
    button_roles: FrozenSet[str] = field(default_factory=lambda: frozenset({
        "button",
    }))


@dataclass(frozen=True)
class ExtractionConfig:
    """Selectors and rules for content extraction."""

    # CSS selectors whose subtrees are treated as *boilerplate* and ignored
    # when computing word count (headings are extracted separately).
    boilerplate_selectors: tuple = (
        "nav", "header", "footer",
        "[role='navigation']", "[role='banner']", "[role='contentinfo']",
        ".nav", ".navbar", ".navigation",
        ".footer", ".site-footer",
        ".sidebar", ".menu", ".breadcrumb",
        ".cookie-banner", ".cookie-notice",
        ".advertisement", ".ad", ".ads",
    )

    # Tags whose text is never visible content.
    invisible_tags: FrozenSet[str] = field(default_factory=lambda: frozenset({
        "script", "style", "noscript", "template",
        "svg", "math", "code", "pre",
    }))

    # Inline style substrings that indicate hidden elements.
    hidden_style_hints: tuple = (
        "display:none", "display: none",
        "visibility:hidden", "visibility: hidden",
        "opacity:0", "opacity: 0",
    )


# ---------------------------------------------------------------------------
#  Default singleton instances (import these in other modules)
# ---------------------------------------------------------------------------
PW_CONFIG = PlaywrightConfig()
CTA_CFG = CTAConfig()
EXTRACT_CFG = ExtractionConfig()
