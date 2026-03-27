"""
prompt_builder.py — Constructs grounded, token-efficient prompts from
a PageSnapshot dictionary.

Design decisions
────────────────
• System prompt establishes the persona, constraints, output schema,
  and a single few-shot exemplar.
• User prompt is a structured data dump — no prose, pure facts — so
  the model cannot invent numbers it was never given.
• The few-shot example is intentionally small (a thin landing page)
  to stay within the 8B model's effective context while still
  demonstrating the expected output format and reasoning style.
• All content signals (heading texts, CTA labels, text excerpt) are
  truncated to hard limits to prevent the prompt from blowing past
  the context window on content-heavy pages.
"""

from __future__ import annotations

import json
import textwrap
from typing import Any, Dict, List, Tuple


# ──────────────────────────────────────────────────────────────────────
#  Constants
# ──────────────────────────────────────────────────────────────────────

_MAX_EXCERPT_CHARS = 400
_MAX_HEADING_TEXTS = 8
_MAX_CTA_TEXTS = 6


# ──────────────────────────────────────────────────────────────────────
#  Few-shot exemplar (UPDATED with advanced diagnostics)
# ──────────────────────────────────────────────────────────────────────

_EXAMPLE_INPUT = textwrap.dedent("""\
    URL: https://acme-saas.com/pricing
    Page type: landing_page

    METRICS:
    - word_count: 410
    - headings: h1=1, h2=3, h3=0
    - cta_count: 2
    - links: internal=8, external=1
    - images: 5
    - missing_alt_percent: 40.0
    - meta.title: "Acme SaaS — Pricing Plans"
    - meta.description: null

    ADVANCED DIAGNOSTICS:
    - load_time_ms: 3200
    - status_code: 200
    - dom_elements: 845
    - inline_styles: 12
    - external_stylesheets: 3
    - external_scripts: 8
    - forms: 0
    - videos: 0
    - aria_roles: 4
    - social_links: 3
    - https: true
    - favicon: true
    - html_lang: "en"
    - unlabelled_inputs: 0

    CONTENT SIGNALS:
    - H2 texts: "Simple Pricing", "Enterprise", "FAQ"
    - CTA texts: "Start Free Trial", "Contact Sales"
    - Text excerpt: "Acme SaaS offers three pricing tiers…"
""")

_EXAMPLE_OUTPUT = json.dumps({
    "summary": (
        "This pricing landing page has a clear heading hierarchy (1 H1, "
        "3 H2s) but is thin on content at only 410 words. Two CTAs are "
        "present, though 40% of images lack alt text, and the meta "
        "description is completely missing — both significant issues for "
        "SEO and accessibility. Page loads in 3.2s which is above the "
        "recommended 2.5s threshold."
    ),
    "insights": {
        "seo_structure": (
            "The page has a proper single H1 and logical H2 sub-sections. "
            "However, the missing meta description means search engines "
            "will auto-generate a snippet, which typically lowers CTR. "
            "Title length (25 chars) is well under the 60-char optimum."
        ),
        "messaging_clarity": (
            "The H2s ('Simple Pricing', 'Enterprise', 'FAQ') create a "
            "scannable structure. The core value proposition is not "
            "immediately obvious from the heading hierarchy alone — "
            "consider front-loading the primary benefit."
        ),
        "cta_usage": (
            "Two CTAs ('Start Free Trial', 'Contact Sales') cover both "
            "self-serve and sales-assisted paths, which is good practice. "
            "With only 2 CTAs across the entire page, visibility could "
            "be improved by repeating the primary CTA after the FAQ."
        ),
        "content_depth": (
            "At 410 words this page is significantly below the ~800–1200 "
            "word benchmark for high-converting pricing pages. The FAQ "
            "section heading exists but likely contains too little detail "
            "to address common objections."
        ),
        "ux_concerns": (
            "40% of images lack alt text, making the page partially "
            "inaccessible to screen readers. With only 1 external link "
            "the page avoids sending users away, which is correct for "
            "a pricing page."
        ),
        "performance_health": (
            "Page load time of 3200ms exceeds the 2500ms threshold for "
            "good user experience. 8 external scripts contribute to load "
            "weight. 845 DOM elements is within acceptable limits. "
            "The page is served over HTTPS with a valid favicon."
        ),
        "accessibility_audit": (
            "Only 4 ARIA roles detected across 845 DOM elements, suggesting "
            "limited semantic markup. 40% of images lack alt text, violating "
            "WCAG 2.1 Level A. No unlabelled inputs found, which is good. "
            "html_lang is set to 'en', supporting screen reader language detection."
        ),
    },
    "issues": [
        {
            "category": "seo",
            "severity": "high",
            "metric_reference": "meta.description",
            "issue": "Meta description is missing entirely.",
            "why_it_matters": (
                "Search engines will auto-generate a snippet from page "
                "content, which often produces a less compelling preview "
                "and lowers organic click-through rate."
            ),
            "suggested_fix": (
                "Add a meta description between 120–160 characters that "
                "includes the primary keyword and a clear call to action."
            ),
        },
        {
            "category": "accessibility",
            "severity": "high",
            "metric_reference": "missing_alt_percent",
            "issue": (
                "40% of images are missing alt text (2 of 5 images)."
            ),
            "why_it_matters": (
                "Screen readers cannot describe these images, violating "
                "WCAG 2.1 Level A. This also loses image-search ranking "
                "potential."
            ),
            "suggested_fix": (
                "Audit all <img> tags and add descriptive alt attributes. "
                "Decorative images should use alt='' explicitly."
            ),
        },
        {
            "category": "ux",
            "severity": "medium",
            "metric_reference": "advanced.load_time_ms",
            "issue": (
                "Page load time of 3200ms exceeds the 2500ms good-experience threshold."
            ),
            "why_it_matters": (
                "Every 100ms of added load time reduces conversion by ~1%. "
                "3.2s puts this page in the 'needs improvement' range for "
                "Core Web Vitals."
            ),
            "suggested_fix": (
                "Reduce the 8 external scripts via bundling or deferred loading. "
                "Consider lazy-loading below-fold images."
            ),
        },
        {
            "category": "content",
            "severity": "medium",
            "metric_reference": "word_count",
            "issue": (
                "Page has only 410 words — well below the 800–1200 word "
                "benchmark for pricing pages."
            ),
            "why_it_matters": (
                "Thin content fails to address buyer objections, reducing "
                "conversion rates and providing little for search engines "
                "to index."
            ),
            "suggested_fix": (
                "Expand the FAQ section with at least 5–8 common "
                "questions and add a feature comparison table."
            ),
        },
    ],
}, indent=2)


# ──────────────────────────────────────────────────────────────────────
#  System prompt (UPDATED — now includes performance + accessibility)
# ──────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = textwrap.dedent("""\
    You are an expert website auditor employed by a digital agency.
    You will receive structured metrics, advanced diagnostics, and
    content signals extracted from a single webpage.  Your task is to
    produce a professional audit report as a JSON object.

    ═══ HARD RULES ═══

    1. BASE EVERY STATEMENT on the provided metrics.  Cite the exact
       numbers.  Do NOT invent, estimate, or hallucinate any data
       point that was not given to you.
    2. If a metric is null or missing, say "unknown" — never guess.
    3. Keep your reasoning internal.  Output ONLY the JSON object.
       No markdown fences, no explanation outside the JSON.
    4. Return 3 to 5 issues total.  Prioritise by severity.
    5. Every issue MUST include a "metric_reference" field that names
       the specific metric it relates to (e.g. "missing_alt_percent",
       "meta.description", "word_count", "advanced.load_time_ms",
       "advanced.unlabelled_inputs").
    6. "category" must be one of: seo, ux, content, accessibility.
    7. "severity" must be one of: low, medium, high.
    8. Do not produce generic advice.  Every recommendation must be
       specific to the actual numbers and content provided.
    9. The ADVANCED DIAGNOSTICS section contains performance and
       technical signals.  Use these to assess page health, load
       performance, and accessibility compliance.

    ═══ OUTPUT SCHEMA ═══

    {
      "summary": "<2–4 sentence overview referencing key metrics>",
      "insights": {
        "seo_structure": "<analysis of heading hierarchy, meta tags, links>",
        "messaging_clarity": "<analysis of headings, CTA copy, value prop>",
        "cta_usage": "<analysis of CTA count, placement, copy quality>",
        "content_depth": "<analysis of word count, content coverage>",
        "ux_concerns": "<analysis of UX, images, navigation signals>",
        "performance_health": "<analysis of load_time_ms, scripts, stylesheets, DOM size>",
        "accessibility_audit": "<analysis of aria_roles, unlabelled_inputs, alt text, html_lang>"
      },
      "issues": [
        {
          "category": "seo | ux | content | accessibility",
          "severity": "low | medium | high",
          "metric_reference": "<exact metric key>",
          "issue": "<what is wrong>",
          "why_it_matters": "<business/SEO/UX impact>",
          "suggested_fix": "<concrete action>"
        }
      ]
    }

    ═══ EXAMPLE ═══

    --- INPUT ---
    %EXAMPLE_INPUT%

    --- OUTPUT ---
    %EXAMPLE_OUTPUT%

    Now analyse the next page.  Output ONLY valid JSON.
""").replace("%EXAMPLE_INPUT%", _EXAMPLE_INPUT).replace(
    "%EXAMPLE_OUTPUT%", _EXAMPLE_OUTPUT
)


# ──────────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────────

def _truncate_list(items: List[str], limit: int) -> List[str]:
    return items[:limit]


def _truncate_text(text: str | None, limit: int) -> str:
    if not text:
        return ""
    if len(text) <= limit:
        return text
    truncated = text[:limit]
    last_space = truncated.rfind(" ")
    if last_space > limit // 2:
        truncated = truncated[:last_space]
    return truncated + "…"


def _safe_str(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, str):
        return f'"{value}"' if len(value) < 200 else f'"{value[:200]}…"'
    return str(value)


def _format_advanced(advanced: Dict[str, Any]) -> str:
    """Format the advanced diagnostics dict into prompt-friendly lines."""
    if not advanced:
        return "    (no advanced diagnostics available)"

    lines = []
    key_order = [
        "load_time_ms", "status_code", "dom_elements", "inline_styles",
        "external_stylesheets", "external_scripts", "forms", "videos",
        "aria_roles", "social_links", "https", "favicon", "html_lang",
        "unlabelled_inputs",
    ]
    for key in key_order:
        val = advanced.get(key)
        if val is not None:
            if isinstance(val, bool):
                lines.append(f"    - {key}: {'true' if val else 'false'}")
            elif isinstance(val, str):
                lines.append(f"    - {key}: \"{val}\"")
            else:
                lines.append(f"    - {key}: {val}")

    return "\n".join(lines) if lines else "    (no advanced diagnostics available)"


# ──────────────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────────────

def build_prompts(snapshot: Dict[str, Any]) -> Tuple[str, str]:
    """
    Build (system_prompt, user_prompt) from a PageSnapshot dict.

    Parameters
    ----------
    snapshot : dict
        The output of ``extractor.extract_metrics()``.  Expected shape::

            {
              "url": str,
              "page_type_hint": str,
              "metrics": { ..., "advanced": { ... } },
              "content_signals": { ... }
            }

    Returns
    -------
    tuple[str, str]
        (system_prompt, user_prompt)
    """
    url = snapshot.get("url", "unknown")
    page_type = snapshot.get("page_type_hint", "unknown")
    metrics = snapshot.get("metrics", {})
    signals = snapshot.get("content_signals", {})

    # ── Unpack metrics ────────────────────────────────────────────────
    headings = metrics.get("headings", {})
    links = metrics.get("links", {})
    meta = metrics.get("meta", {})
    advanced = metrics.get("advanced", {})

    # ── Unpack content signals with truncation ────────────────────────
    h2_texts = _truncate_list(signals.get("h2_texts", []), _MAX_HEADING_TEXTS)
    h3_texts = _truncate_list(signals.get("h3_texts", []), _MAX_HEADING_TEXTS)
    cta_texts = _truncate_list(signals.get("cta_texts", []), _MAX_CTA_TEXTS)
    excerpt = _truncate_text(
        signals.get("main_text_excerpt", ""), _MAX_EXCERPT_CHARS
    )

    # ── Build the user prompt ─────────────────────────────────────────
    advanced_block = _format_advanced(advanced)

    user_prompt = textwrap.dedent(f"""\
        URL: {url}
        Page type: {page_type}

        METRICS:
        - word_count: {metrics.get("word_count", "unknown")}
        - headings: h1={headings.get("h1", 0)}, h2={headings.get("h2", 0)}, h3={headings.get("h3", 0)}
        - cta_count: {metrics.get("cta_count", "unknown")}
        - links: internal={links.get("internal", 0)}, external={links.get("external", 0)}
        - images: {metrics.get("image_count", "unknown")}
        - missing_alt_percent: {metrics.get("missing_alt_percent", "unknown")}
        - meta.title: {_safe_str(meta.get("title"))}
        - meta.description: {_safe_str(meta.get("description"))}

        ADVANCED DIAGNOSTICS:
{advanced_block}

        CONTENT SIGNALS:
        - H2 texts: {json.dumps(h2_texts, ensure_ascii=False) if h2_texts else "none"}
        - H3 texts: {json.dumps(h3_texts, ensure_ascii=False) if h3_texts else "none"}
        - CTA texts: {json.dumps(cta_texts, ensure_ascii=False) if cta_texts else "none"}
        - Text excerpt: {f'"{excerpt}"' if excerpt else "none"}

        Produce the JSON audit report now.
    """)

    return _SYSTEM_PROMPT, user_prompt
