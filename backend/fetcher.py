"""
fetcher.py — Playwright-based page renderer.

Responsibilities
────────────────
• Launch a headless Chromium browser.
• Navigate to the target URL with realistic viewport & user-agent.
• Wait for domcontentloaded + extra settle time.
• Perform basic scroll-to-bottom to trigger lazy-loaded content.
• Return the fully rendered HTML string **and** fetch metadata
  (load time, HTTP status code).

All async — callers must run inside an asyncio event loop.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, Optional

from playwright.async_api import (
    async_playwright,
    Browser,
    Page,
    Response,
    TimeoutError as PWTimeout,
)

from backend.config import PW_CONFIG

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[str, str, Optional[int]], Awaitable[None]]


# ──────────────────────────────────────────────────────────────────────
#  Return type
# ──────────────────────────────────────────────────────────────────────

@dataclass
class FetchResult:
    """Container for the fetched HTML and performance metadata."""

    html: str
    status_code: int = 200
    load_time_ms: int = 0
    lcp_ms: Optional[int] = None
    cls: Optional[float] = None
    total_kb: Optional[float] = None
    html_kb: Optional[float] = None
    js_kb: Optional[float] = None
    css_kb: Optional[float] = None
    images_kb: Optional[float] = None
    attention: Optional[Dict[str, Any]] = None

    def __len__(self) -> int:
        return len(self.html)


# ──────────────────────────────────────────────────────────────────────
#  Progress helpers
# ──────────────────────────────────────────────────────────────────────

async def _emit_progress(
    progress_callback: Optional[ProgressCallback],
    stage: str,
    detail: str,
    percent: Optional[int] = None,
) -> None:
    logger.info("[stage:%s] %s", stage, detail)
    if progress_callback is not None:
        await progress_callback(stage, detail, percent)


# ──────────────────────────────────────────────────────────────────────
#  Scroll-to-bottom  (lazy-load trigger)
# ──────────────────────────────────────────────────────────────────────

async def _scroll_page(
    page: Page,
    progress_callback: Optional[ProgressCallback] = None,
) -> None:
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
            await _emit_progress(
                progress_callback,
                "fetch:scroll",
                f"scroll stabilized after {i + 1} pass(es)",
            )
            break
    else:
        await _emit_progress(
            progress_callback,
            "fetch:scroll",
            f"reached max scroll iterations ({PW_CONFIG.max_scroll_iterations})",
        )


# ──────────────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────────────

async def fetch_page(
    url: str,
    *,
    browser: Optional[Browser] = None,
    progress_callback: Optional[ProgressCallback] = None,
) -> FetchResult:
    """
    Render *url* in headless Chromium and return the final HTML + metadata.

    Returns
    -------
    FetchResult
        Contains ``.html``, ``.status_code``, and ``.load_time_ms``.

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
            await _emit_progress(
                progress_callback, "fetch:init", "launched headless Chromium", 16
            )

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
        await _emit_progress(
            progress_callback, "fetch:page", "browser context and page created", 20
        )

        await page.add_init_script(
            """
            (() => {
              window.__siteinsightVitals = { cls: 0, lcp: 0 };

              try {
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                      window.__siteinsightVitals.cls += entry.value || 0;
                    }
                  }
                }).observe({ type: 'layout-shift', buffered: true });
              } catch (e) {}

              try {
                new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  const last = entries[entries.length - 1];
                  if (last) {
                    window.__siteinsightVitals.lcp = Math.round(last.startTime || 0);
                  }
                }).observe({ type: 'largest-contentful-paint', buffered: true });
              } catch (e) {}
            })();
            """
        )

        # ── Navigate ──────────────────────────────────────────────────
        status_code = 200
        t_start = time.monotonic()

        try:
            await _emit_progress(
                progress_callback,
                "fetch:navigate",
                f"opening {url} with timeout={PW_CONFIG.navigation_timeout_ms}ms",
                25,
            )
            response: Optional[Response] = await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=PW_CONFIG.navigation_timeout_ms,
            )
            if response is not None:
                status_code = response.status

            t_loaded = time.monotonic()
            load_time_ms = int((t_loaded - t_start) * 1000)

            await _emit_progress(
                progress_callback,
                "fetch:navigate",
                f"domcontentloaded reached (status={status_code}, {load_time_ms}ms)",
                32,
            )
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
        await _emit_progress(
            progress_callback, "fetch:finalize", "returning to top of page", 36
        )
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(500)

        html: str = await page.content()
        perf_metrics = await page.evaluate(
            """
            () => {
              const vitals = window.__siteinsightVitals || { cls: 0, lcp: 0 };
              const nav = performance.getEntriesByType('navigation')[0];
              const resources = performance.getEntriesByType('resource');

              const entrySize = (entry) => {
                return (
                  entry.transferSize ||
                  entry.encodedBodySize ||
                  entry.decodedBodySize ||
                  0
                );
              };

              let js = 0;
              let css = 0;
              let images = 0;

              for (const entry of resources) {
                const type = entry.initiatorType || '';
                const size = entrySize(entry);
                if (type === 'script') js += size;
                else if (type === 'css' || entry.name.includes('.css')) css += size;
                else if (type === 'img' || type === 'image') images += size;
              }

              const htmlBytes = nav
                ? entrySize(nav)
                : new TextEncoder().encode(document.documentElement.outerHTML).length;

              const totalBytes = htmlBytes + js + css + images;

              return {
                lcp_ms: vitals.lcp ? Math.round(vitals.lcp) : null,
                cls: Number((vitals.cls || 0).toFixed(3)),
                html_kb: Number((htmlBytes / 1024).toFixed(1)),
                js_kb: Number((js / 1024).toFixed(1)),
                css_kb: Number((css / 1024).toFixed(1)),
                images_kb: Number((images / 1024).toFixed(1)),
                total_kb: Number((totalBytes / 1024).toFixed(1)),
              };
            }
            """
        )
        attention_metrics = await page.evaluate(
            """
            () => {
              const vw = window.innerWidth || document.documentElement.clientWidth || 1;
              const vh = window.innerHeight || document.documentElement.clientHeight || 1;
              const foldLimit = vh;
              const scanLimit = vh * 1.6;

              const weights = {
                h1: 1.0,
                h2: 0.82,
                h3: 0.68,
                button: 0.9,
                a: 0.72,
                img: 0.78,
                video: 0.8,
                form: 0.62,
                input: 0.56,
              };

              const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
              const isVisible = (el, rect) => {
                const style = window.getComputedStyle(el);
                return (
                  rect.width >= 28 &&
                  rect.height >= 18 &&
                  rect.bottom > 0 &&
                  rect.right > 0 &&
                  rect.left < vw &&
                  rect.top < vh * 2 &&
                  style.visibility !== "hidden" &&
                  style.display !== "none" &&
                  parseFloat(style.opacity || "1") > 0.05
                );
              };

              const regionFromRect = (rect) => {
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const horizontal = cx < vw * 0.33 ? "left" : cx > vw * 0.66 ? "right" : "center";
                const vertical = cy < vh * 0.4 ? "upper" : cy > vh * 0.75 ? "lower" : "middle";
                return `${vertical}-${horizontal}`;
              };

              const looksLikeConsentUi = (text, el, rect) => {
                const haystack = `${text} ${el.id || ""} ${el.className || ""}`.toLowerCase();
                const keywords = [
                  "cookie",
                  "consent",
                  "privacy",
                  "gdpr",
                  "accept all",
                  "accept",
                  "reject",
                  "preferences",
                  "customize",
                ];
                const fixedLike = ["fixed", "sticky"].includes(window.getComputedStyle(el).position);
                const nearBottom = rect.top > vh * 0.55;
                return keywords.some((keyword) => haystack.includes(keyword)) && (fixedLike || nearBottom);
              };

              const normalizeLabel = (el, tag) => {
                const text = (
                  el.innerText ||
                  el.getAttribute("aria-label") ||
                  el.getAttribute("alt") ||
                  el.getAttribute("title") ||
                  ""
                )
                  .replace(/\\s+/g, " ")
                  .trim();

                if (text.length >= 2) return text.slice(0, 60);
                if (tag === "a") return "Link";
                if (tag === "img") return "Image";
                if (tag === "button") return "Button";
                return tag.toUpperCase();
              };

              const candidates = [];
              const selector = "h1, h2, h3, button, a, img, video, form, input, [role='button']";

              for (const el of document.querySelectorAll(selector)) {
                const rect = el.getBoundingClientRect();
                if (!isVisible(el, rect)) continue;

                const tag = (el.tagName || "").toLowerCase();
                const role = (el.getAttribute("role") || "").toLowerCase();
                const type = (el.getAttribute("type") || "").toLowerCase();
                const kind = role === "button" ? "button" : tag;
                const label = normalizeLabel(el, kind);
                const baseWeight = weights[kind] || 0.5;
                const areaRatio = clamp((rect.width * rect.height) / (vw * vh), 0, 0.45);
                const areaBoost = Math.sqrt(areaRatio) * 0.42;
                const topBias = clamp(1 - Math.max(rect.top, 0) / scanLimit, 0, 1) * 0.46;
                const centerOffset = Math.abs((rect.left + rect.width / 2) - vw / 2) / (vw / 2);
                const centerBonus = (1 - clamp(centerOffset, 0, 1)) * 0.16;
                const foldBonus = rect.top < foldLimit ? 0.16 : 0;

                let score = baseWeight + areaBoost + topBias + centerBonus + foldBonus;

                if (tag === "a" && rect.width < 110 && rect.height < 36) score -= 0.12;
                if (tag === "input" && !["submit", "button"].includes(type)) score -= 0.08;
                if (tag === "img" && rect.width < 120) score -= 0.06;
                if (tag === "a" && label === "Link") score -= 0.18;
                if (looksLikeConsentUi(label, el, rect)) score -= 0.28;

                score = clamp(score, 0.05, 1.0);

                candidates.push({
                  type: kind,
                  label,
                  intensity: Number(score.toFixed(3)),
                  x: Number(clamp(rect.left / vw, 0, 1).toFixed(4)),
                  y: Number(clamp(rect.top / vh, 0, 1.8).toFixed(4)),
                  width: Number(clamp(rect.width / vw, 0.04, 1).toFixed(4)),
                  height: Number(clamp(rect.height / vh, 0.03, 1).toFixed(4)),
                  above_fold: rect.top < foldLimit,
                  region: regionFromRect(rect),
                });
              }

              candidates.sort((a, b) => b.intensity - a.intensity);
              const zones = candidates.slice(0, 8).map((zone, index) => ({
                ...zone,
                id: `zone-${index + 1}`,
                level: zone.intensity >= 0.95 ? "high" : zone.intensity >= 0.72 ? "medium" : "low",
              }));

              const aboveFoldShare = zones.length
                ? Math.round((zones.filter((zone) => zone.above_fold).length / zones.length) * 100)
                : 0;

              const regionCounts = zones.reduce((acc, zone) => {
                acc[zone.region] = (acc[zone.region] || 0) + zone.intensity;
                return acc;
              }, {});

              const dominantRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

              return {
                viewport: { width: vw, height: vh },
                zones,
                stats: {
                  above_fold_share: aboveFoldShare,
                  scanned_elements: candidates.length,
                  dominant_region: dominantRegion,
                  strongest_zone: zones[0]?.label || null,
                },
              };
            }
            """
        )
        await _emit_progress(
            progress_callback, "fetch:finalize", "captured final page HTML", 38
        )

        await context.close()
        await _emit_progress(
            progress_callback, "fetch:done", "browser context closed", 39
        )

        return FetchResult(
            html=html,
            status_code=status_code,
            load_time_ms=load_time_ms,
            lcp_ms=perf_metrics.get("lcp_ms"),
            cls=perf_metrics.get("cls"),
            total_kb=perf_metrics.get("total_kb"),
            html_kb=perf_metrics.get("html_kb"),
            js_kb=perf_metrics.get("js_kb"),
            css_kb=perf_metrics.get("css_kb"),
            images_kb=perf_metrics.get("images_kb"),
            attention=attention_metrics,
        )

    finally:
        if own_browser and browser:
            await browser.close()
            await _emit_progress(
                progress_callback, "fetch:done", "browser closed", 39
            )
        await pw.stop()
        await _emit_progress(
            progress_callback, "fetch:done", "Playwright stopped", 40
        )
