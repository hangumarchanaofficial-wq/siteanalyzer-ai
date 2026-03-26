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
from typing import Awaitable, Callable, Optional

from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PWTimeout

from backend.config import PW_CONFIG

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[str, str, Optional[int]], Awaitable[None]]


async def _emit_progress(
    progress_callback: Optional[ProgressCallback],
    stage: str,
    detail: str,
    percent: Optional[int] = None,
) -> None:
    logger.info("[stage:%s] %s", stage, detail)
    if progress_callback is not None:
        await progress_callback(stage, detail, percent)


async def _scroll_page(page: Page, progress_callback: Optional[ProgressCallback] = None) -> None:
    """
    Incrementally scroll to the bottom of the page to trigger
    lazy-loaded images, infinite-scroll widgets, and deferred JS.
    """
    for i in range(PW_CONFIG.max_scroll_iterations):
        await _emit_progress(
            progress_callback,
            "fetch:scroll",
            f"scroll pass {i + 1}/{PW_CONFIG.max_scroll_iterations}",
        )
        previous_height = await page.evaluate("document.body.scrollHeight")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(PW_CONFIG.scroll_pause_ms)
        new_height = await page.evaluate("document.body.scrollHeight")

        if new_height == previous_height:
            await _emit_progress(progress_callback, "fetch:scroll", f"scroll stabilized after {i + 1} pass(es)")
            break
    else:
        await _emit_progress(
            progress_callback,
            "fetch:scroll",
            f"reached max scroll iterations ({PW_CONFIG.max_scroll_iterations})",
        )


async def fetch_page(
    url: str,
    *,
    browser: Optional[Browser] = None,
    progress_callback: Optional[ProgressCallback] = None,
) -> str:
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
    await _emit_progress(progress_callback, "fetch:init", "Playwright started", 12)

    try:
        if own_browser:
            browser = await pw.chromium.launch(headless=True)
            await _emit_progress(progress_callback, "fetch:init", "launched headless Chromium", 16)

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
        await _emit_progress(progress_callback, "fetch:page", "browser context and page created", 20)

        # ------------------------------------------------------------------
        # Navigate — wait for domcontentloaded (fast & reliable for JS-heavy
        # sites that never fully reach networkidle).  The post_load_delay
        # below gives deferred scripts extra time to settle.
        # ------------------------------------------------------------------
        try:
            await _emit_progress(
                progress_callback,
                "fetch:navigate",
                f"opening {url} with timeout={PW_CONFIG.navigation_timeout_ms}ms",
                25,
            )
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=PW_CONFIG.navigation_timeout_ms,
            )
            await _emit_progress(progress_callback, "fetch:navigate", "domcontentloaded reached", 32)
        except PWTimeout as exc:
            raise RuntimeError(
                f"Page failed to load within timeout: {url}"
            ) from exc

        # Extra breathing room for late-firing JS.
        await _emit_progress(
            progress_callback,
            "fetch:settle",
            f"waiting {PW_CONFIG.post_load_delay_ms}ms for late scripts",
            34,
        )
        await page.wait_for_timeout(PW_CONFIG.post_load_delay_ms)

        # Trigger lazy-loaded / infinite-scroll content.
        await _scroll_page(page, progress_callback)

        # Scroll back to top so the final snapshot represents full page.
        await _emit_progress(progress_callback, "fetch:finalize", "returning to top of page", 36)
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(500)

        html: str = await page.content()
        await _emit_progress(progress_callback, "fetch:finalize", "captured final page HTML", 38)

        await context.close()
        await _emit_progress(progress_callback, "fetch:done", "browser context closed", 39)

        return html

    finally:
        if own_browser and browser:
            await browser.close()
            await _emit_progress(progress_callback, "fetch:done", "browser closed", 39)
        await pw.stop()
        await _emit_progress(progress_callback, "fetch:done", "Playwright stopped", 40)
