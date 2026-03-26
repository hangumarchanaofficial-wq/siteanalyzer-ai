"""
tests/test_extractor.py — Integration tests for the metrics extractor.

Tests use a synthetic HTML document that exercises every metric.
Updated for the enriched output format with page_type_hint and
content_signals.
"""

import pytest
from bs4 import BeautifulSoup

from backend.extractor import extract_metrics


# ── Fixtures ──────────────────────────────────────────────────────────

SAMPLE_HTML = """\
<!DOCTYPE html>
<html>
<head>
    <title>Test Page Title</title>
    <meta name="description" content="A test page for extraction.">
    <meta property="og:title" content="OG Title Fallback">
    <meta property="og:description" content="OG Description Fallback">
</head>
<body>
    <nav>
        <a href="/home">Home</a>
        <a href="/about">About</a>
    </nav>

    <main>
        <h1>Main Heading</h1>
        <h2>Sub Heading One</h2>
        <h2>Sub Heading Two</h2>
        <h3>Minor Heading</h3>

        <p>This is a paragraph with some visible text content for counting words accurately.</p>
        <p>Another paragraph with different text to increase the word count further.</p>

        <a href="/pricing" class="btn primary">Get Started</a>
        <button>Buy Now</button>
        <a href="https://external.com/signup" role="button">Sign Up Free</a>

        <a href="/internal-page">Learn more details</a>
        <a href="https://example.com/another">Another internal link</a>
        <a href="https://google.com">External link</a>

        <img src="/hero.jpg" alt="Hero image">
        <img src="/product.jpg" alt="">
        <img src="/icon.png">
        <img src="/banner.jpg" alt="Banner">

        <!-- Hidden elements — should be ignored -->
        <div style="display:none">
            <h2>Hidden Heading</h2>
            <p>Hidden text not visible.</p>
        </div>

        <div aria-hidden="true">
            <h3>Also hidden</h3>
        </div>
    </main>

    <footer>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <button>Cookie Settings</button>
    </footer>
</body>
</html>
"""

SAMPLE_URL = "https://example.com/test"


@pytest.fixture
def result():
    dom = BeautifulSoup(SAMPLE_HTML, "html.parser")
    return extract_metrics(dom, SAMPLE_URL)


# ── Tests — Top-level structure ───────────────────────────────────────

class TestOutputStructure:
    """Verify the enriched output shape."""

    def test_has_url(self, result):
        assert result["url"] == SAMPLE_URL

    def test_has_page_type_hint(self, result):
        assert "page_type_hint" in result
        assert isinstance(result["page_type_hint"], str)

    def test_has_metrics_dict(self, result):
        assert "metrics" in result
        assert isinstance(result["metrics"], dict)

    def test_has_content_signals_dict(self, result):
        assert "content_signals" in result
        assert isinstance(result["content_signals"], dict)


# ── Tests — Metrics ───────────────────────────────────────────────────

class TestMetrics:

    def test_word_count_is_positive(self, result):
        assert result["metrics"]["word_count"] > 0

    def test_headings_h1(self, result):
        assert result["metrics"]["headings"]["h1"] == 1

    def test_headings_h2_excludes_hidden(self, result):
        assert result["metrics"]["headings"]["h2"] == 2

    def test_headings_h3_excludes_hidden(self, result):
        assert result["metrics"]["headings"]["h3"] == 1

    def test_cta_count(self, result):
        assert result["metrics"]["cta_count"] >= 3

    def test_links_internal(self, result):
        assert result["metrics"]["links"]["internal"] >= 1

    def test_links_external(self, result):
        assert result["metrics"]["links"]["external"] >= 1

    def test_image_count(self, result):
        assert result["metrics"]["images"] == 4

    def test_missing_alt_percent(self, result):
        assert result["metrics"]["missing_alt_percent"] == 50.0

    def test_meta_title(self, result):
        assert result["metrics"]["meta"]["title"] == "Test Page Title"

    def test_meta_description(self, result):
        assert result["metrics"]["meta"]["description"] == "A test page for extraction."


# ── Tests — Content Signals ──────────────────────────────────────────

class TestContentSignals:

    def test_h2_texts(self, result):
        h2s = result["content_signals"]["h2_texts"]
        assert "Sub Heading One" in h2s
        assert "Sub Heading Two" in h2s
        assert len(h2s) == 2

    def test_h3_texts(self, result):
        h3s = result["content_signals"]["h3_texts"]
        assert "Minor Heading" in h3s
        assert len(h3s) == 1

    def test_cta_texts(self, result):
        ctas = result["content_signals"]["cta_texts"]
        cta_lower = [c.lower() for c in ctas]
        assert "get started" in cta_lower
        assert "buy now" in cta_lower
        assert "sign up free" in cta_lower

    def test_main_text_excerpt_present(self, result):
        excerpt = result["content_signals"]["main_text_excerpt"]
        assert isinstance(excerpt, str)
        assert len(excerpt) > 0


# ── Tests — Meta Fallbacks ───────────────────────────────────────────

class TestMetaFallbacks:
    """Test og:* fallback behaviour when primary meta tags are absent."""

    MINIMAL_HTML = """\
    <html>
    <head>
        <meta property="og:title" content="Fallback Title">
        <meta property="og:description" content="Fallback Description">
    </head>
    <body><p>Hello world</p></body>
    </html>
    """

    def test_og_title_fallback(self):
        dom = BeautifulSoup(self.MINIMAL_HTML, "html.parser")
        result = extract_metrics(dom, "https://example.com")
        assert result["metrics"]["meta"]["title"] == "Fallback Title"

    def test_og_description_fallback(self):
        dom = BeautifulSoup(self.MINIMAL_HTML, "html.parser")
        result = extract_metrics(dom, "https://example.com")
        assert result["metrics"]["meta"]["description"] == "Fallback Description"


# ── Tests — Page-Type Hints ──────────────────────────────────────────

class TestPageTypeHint:

    def test_news_homepage(self):
        html = """
        <html><head>
            <title>Breaking News - Latest Headlines</title>
            <meta name="description" content="Latest news and breaking headlines">
        </head><body><div class="news"><p>Story</p></div></body></html>
        """
        dom = BeautifulSoup(html, "html.parser")
        result = extract_metrics(dom, "https://news.example.com")
        assert result["page_type_hint"] == "news_homepage"

    def test_generic_fallback(self):
        html = "<html><body><p>Hello</p></body></html>"
        dom = BeautifulSoup(html, "html.parser")
        result = extract_metrics(dom, "https://example.com")
        assert result["page_type_hint"] == "generic"


# ── Tests — Edge Cases ───────────────────────────────────────────────

class TestEdgeCases:
    """Ensure the extractor doesn't crash on degenerate input."""

    def test_empty_html(self):
        dom = BeautifulSoup("", "html.parser")
        result = extract_metrics(dom, "https://example.com")
        assert result["metrics"]["word_count"] == 0
        assert result["metrics"]["images"] == 0
        assert result["content_signals"]["cta_texts"] == []

    def test_no_body(self):
        dom = BeautifulSoup("<html><head></head></html>", "html.parser")
        result = extract_metrics(dom, "https://example.com")
        assert result["metrics"]["word_count"] == 0

    def test_malformed_html(self):
        dom = BeautifulSoup("<div><p>unclosed<p>tags<span>", "html.parser")
        result = extract_metrics(dom, "https://example.com")
        assert result["metrics"]["word_count"] > 0
