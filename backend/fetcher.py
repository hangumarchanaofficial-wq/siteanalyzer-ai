"""
fetcher.py — Playwright-based page renderer.

Responsibilities
────────────────
• Launch a headless Chromium browser.
• Navigate to the target URL with realistic viewport & user-agent.
• Wait for network-idle + extra settle time.
• Perform basic scroll-to-bottom to trigger lazy-loaded content.
• Return the fully rendered HTML string.

All async — callers must run inside an asyncio event loop.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PWTimeout

from backend.config import PW_CONFIG

logger = logging.getLogger(__name__)


async def _scroll_page(page: Page) -> None:
    """
    Incrementally scroll to the bottom of the page to trigger
    lazy-loaded images, infinite-scroll widgets, and deferred JS.
    """
    for i in range(PW_CONFIG.max_scroll_iterations):
        previous_height = await page.evaluate("document.body.scrollHeight")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(PW_CONFIG.scroll_pause_ms)
        new_height = await page.evaluate("document.body.scrollHeight")

        if new_height == previous_height:
            logger.debug("Scroll stabilised after %d iteration(s).", i + 1)
            break
    else:
        logger.debug("Reached max scroll iterations (%d).", PW_CONFIG.max_scroll_iterations)


async def fetch_page(url: str, *, browser: Optional[Browser] = None) -> str:
    """
    Render *url* in headless Chromium and return the final HTML.

    Parameters
    ----------
    url : str
        Fully-qualified URL (must include scheme).
    browser : Browser | None
        Re-use an existing Playwright browser instance.  When *None* a
        new one is launched and closed automatically.

    Returns
    -------
    str
        The page's rendered outer HTML.

    Raises
    ------
    RuntimeError
        If the page fails to load after retries.
    """

    own_browser = browser is None

    pw = await async_playwright().start()

    try:
        if own_browser:
            browser = await pw.chromium.launch(headless=True)

        context = await browser.new_context(
            viewport={
                "width": PW_CONFIG.viewport_width,
                "height": PW_CONFIG.viewport_height,
            },
            user_agent=PW_CONFIG.user_agent,
            java_script_enabled=True,
            ignore_https_errors=True,
        )

        page = await context.new_page()

        # ------------------------------------------------------------------
        # Navigate — wait for domcontentloaded (fast & reliable for JS-heavy
        # sites that never fully reach networkidle).  The post_load_delay
        # below gives deferred scripts extra time to settle.
        # ------------------------------------------------------------------
        try:
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=PW_CONFIG.navigation_timeout_ms,
            )
        except PWTimeout as exc:
            raise RuntimeError(
                f"Page failed to load within timeout: {url}"
            ) from exc

        # Extra breathing room for late-firing JS.
        await page.wait_for_timeout(PW_CONFIG.post_load_delay_ms)

        # Trigger lazy-loaded / infinite-scroll content.
        await _scroll_page(page)

        # Scroll back to top so the final snapshot represents full page.
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(500)

        html: str = await page.content()

        await context.close()

        return html

    finally:
        if own_browser and browser:
            await browser.close()
        await pw.stop()
