"""
tests/test_helpers.py — Unit tests for visibility, CTA, and link helpers.

Run with:
    pytest backend/tests/ -v
"""

import pytest
from bs4 import BeautifulSoup

from backend.helpers import (
    get_base_domain,
    is_cta,
    is_element_visible,
    is_internal_link,
    is_visible,
    normalise_url,
)


# ── Helpers ───────────────────────────────────────────────────────────

def _tag(html: str, tag_name: str = None):
    """Quick helper to parse a snippet and return the first tag."""
    soup = BeautifulSoup(html, "html.parser")
    if tag_name:
        return soup.find(tag_name)
    return next(soup.children)


# ── is_visible ────────────────────────────────────────────────────────

class TestIsVisible:
    def test_normal_div(self):
        assert is_visible(_tag("<div>hi</div>", "div"))

    def test_hidden_attr(self):
        assert not is_visible(_tag('<div hidden>hi</div>', "div"))

    def test_aria_hidden(self):
        assert not is_visible(_tag('<div aria-hidden="true">hi</div>', "div"))

    def test_inline_display_none(self):
        assert not is_visible(_tag('<div style="display:none">hi</div>', "div"))

    def test_inline_visibility_hidden(self):
        assert not is_visible(_tag('<div style="visibility: hidden">hi</div>', "div"))

    def test_script_tag(self):
        assert not is_visible(_tag("<script>var x=1;</script>", "script"))

    def test_style_tag(self):
        assert not is_visible(_tag("<style>body{}</style>", "style"))


class TestIsElementVisible:
    def test_visible_child_of_visible_parent(self):
        soup = BeautifulSoup("<div><p>hello</p></div>", "html.parser")
        p = soup.find("p")
        assert is_element_visible(p)

    def test_visible_child_of_hidden_parent(self):
        soup = BeautifulSoup('<div style="display:none"><p>hello</p></div>', "html.parser")
        p = soup.find("p")
        assert not is_element_visible(p)


# ── is_cta ────────────────────────────────────────────────────────────

class TestIsCta:
    def test_button_is_cta(self):
        assert is_cta(_tag("<button>Submit</button>", "button"))

    def test_link_with_action_word(self):
        assert is_cta(_tag('<a href="/signup">Sign Up Now</a>', "a"))

    def test_link_with_btn_class(self):
        assert is_cta(_tag('<a href="/" class="btn primary">Go</a>', "a"))

    def test_link_with_role_button(self):
        assert is_cta(_tag('<a href="/" role="button">Click</a>', "a"))

    def test_plain_link_not_cta(self):
        assert not is_cta(_tag('<a href="/about">About Us</a>', "a"))

    def test_nav_link_not_cta(self):
        soup = BeautifulSoup('<nav><a href="/buy">Buy Now</a></nav>', "html.parser")
        a = soup.find("a")
        assert not is_cta(a)

    def test_footer_button_not_cta(self):
        soup = BeautifulSoup('<footer><button>Subscribe</button></footer>', "html.parser")
        btn = soup.find("button")
        assert not is_cta(btn)


# ── normalise_url ─────────────────────────────────────────────────────

class TestNormaliseUrl:
    def test_absolute(self):
        assert normalise_url("https://example.com/page", "https://example.com") == "https://example.com/page"

    def test_relative(self):
        assert normalise_url("/about", "https://example.com") == "https://example.com/about"

    def test_fragment_only(self):
        assert normalise_url("#section", "https://example.com") is None

    def test_javascript(self):
        assert normalise_url("javascript:void(0)", "https://example.com") is None

    def test_mailto(self):
        assert normalise_url("mailto:hi@example.com", "https://example.com") is None


# ── is_internal_link ──────────────────────────────────────────────────

class TestIsInternalLink:
    def test_same_domain(self):
        assert is_internal_link("https://example.com/page", "example.com")

    def test_www_prefix(self):
        assert is_internal_link("https://www.example.com/page", "example.com")

    def test_subdomain(self):
        assert is_internal_link("https://blog.example.com/page", "example.com")

    def test_external(self):
        assert not is_internal_link("https://other.com/page", "example.com")


# ── get_base_domain ──────────────────────────────────────────────────

class TestGetBaseDomain:
    def test_simple(self):
        assert get_base_domain("https://www.example.com/path") == "example.com"

    def test_no_www(self):
        assert get_base_domain("https://example.com") == "example.com"
