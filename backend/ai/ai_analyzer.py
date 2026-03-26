"""
ai_analyzer.py — LLM client that calls Ollama (local) or OpenRouter (cloud).

Design decisions
────────────────
• DeepSeek R1 emits <think>…</think> tags containing chain-of-thought
  reasoning before the actual answer.  We strip these server-side so
  downstream code only sees clean JSON.
• Ollama's ``format`` parameter (set to the Pydantic JSON schema) makes
  the model emit constrained JSON.  However, for reasoning models the
  format constraint can conflict with the think-tag preamble, so we
  use ``format: "json"`` (unconstrained JSON mode) and validate/repair
  after the fact.
• OpenRouter calls use the standard OpenAI chat completions shape with
  ``response_format: {"type": "json_object"}``.
• Both backends feed into the same validation pipeline.

Public API
──────────
    report = await analyse_with_ai(snapshot)
    report = await analyse_with_ai(snapshot, backend="openrouter")
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any, Awaitable, Callable, Dict, Literal, Optional

import httpx

from backend.ai.prompt_builder import build_prompts
from backend.ai.validator import validate_and_repair
from backend.ai_config import (
    OLLAMA_CFG,
    OPENROUTER_CFG,
    RETRY_CFG,
)

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


async def _progress_heartbeat(
    label: str,
    *,
    progress_callback: Optional[ProgressCallback] = None,
    interval_s: int = 10,
    start_percent: int = 72,
    end_percent: int = 88,
) -> None:
    elapsed = 0
    try:
        while True:
            await asyncio.sleep(interval_s)
            elapsed += interval_s
            percent = min(end_percent, start_percent + elapsed // 10 * 2)
            await _emit_progress(
                progress_callback,
                label,
                f"still running after {elapsed}s",
                percent,
            )
    except asyncio.CancelledError:
        return

# ──────────────────────────────────────────────────────────────────────
#  Think-tag stripper
# ──────────────────────────────────────────────────────────────────────

# DeepSeek R1 wraps its chain-of-thought in <think>…</think>.
# This can appear before, around, or interleaved with the JSON output.
_THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL)

# Fallback: sometimes the closing tag is missing on truncated responses.
_THINK_OPEN_RE = re.compile(r"<think>.*", re.DOTALL)


def _strip_think_tags(text: str) -> str:
    """Remove all <think>…</think> blocks from the LLM response."""
    cleaned = _THINK_TAG_RE.sub("", text)
    # Handle unclosed <think> (model was cut off mid-thought).
    cleaned = _THINK_OPEN_RE.sub("", cleaned)
    return cleaned.strip()


# ──────────────────────────────────────────────────────────────────────
#  JSON extraction from raw text
# ──────────────────────────────────────────────────────────────────────

def _extract_json_from_response(raw: str) -> str:
    """
    Extract the JSON object from a potentially messy LLM response.

    Handles:
    • <think> tags (stripped first)
    • Markdown code fences (```json … ```)
    • Leading/trailing prose around the JSON
    """
    # Step 1: strip think tags.
    text = _strip_think_tags(raw)

    # Step 2: strip markdown fences.
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    # Step 3: if the text doesn't start with '{', find the first '{'.
    if not text.startswith("{"):
        brace_pos = text.find("{")
        if brace_pos != -1:
            text = text[brace_pos:]

    # Step 4: if there's trailing text after the closing '}', trim it.
    # Find the matching closing brace by counting depth.
    depth = 0
    end_pos = -1
    for i, ch in enumerate(text):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end_pos = i
                break

    if end_pos != -1:
        text = text[: end_pos + 1]

    return text


# ──────────────────────────────────────────────────────────────────────
#  Ollama backend
# ──────────────────────────────────────────────────────────────────────

async def _call_ollama(
    system_prompt: str,
    user_prompt: str,
    *,
    progress_callback: Optional[ProgressCallback] = None,
) -> str:
    """
    Send a chat completion request to a local Ollama instance.

    Returns the raw response content string (may contain <think> tags).
    """
    payload = {
        "model": OLLAMA_CFG.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "format": "json",  # Ollama's JSON mode — unconstrained schema.
        "options": {
            "temperature": OLLAMA_CFG.temperature,
            "top_p": OLLAMA_CFG.top_p,
            "num_ctx": OLLAMA_CFG.num_ctx,
        },
    }

    url = f"{OLLAMA_CFG.base_url}/api/chat"

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(OLLAMA_CFG.request_timeout_s)
    ) as client:
        await _emit_progress(progress_callback, "ai:request", f"calling Ollama model={OLLAMA_CFG.model}", 72)
        t0 = time.monotonic()
        heartbeat = asyncio.create_task(
            _progress_heartbeat("ai:ollama_wait", progress_callback=progress_callback)
        )
        try:
            response = await client.post(url, json=payload)
        finally:
            heartbeat.cancel()
            await asyncio.gather(heartbeat, return_exceptions=True)
        elapsed = time.monotonic() - t0
        await _emit_progress(
            progress_callback,
            "ai:response",
            f"Ollama responded in {elapsed:.1f}s status={response.status_code}",
            88,
        )

        response.raise_for_status()
        data = response.json()

    return data.get("message", {}).get("content", "")


# ──────────────────────────────────────────────────────────────────────
#  OpenRouter backend
# ──────────────────────────────────────────────────────────────────────

async def _call_openrouter(
    system_prompt: str,
    user_prompt: str,
    *,
    progress_callback: Optional[ProgressCallback] = None,
) -> str:
    """
    Send a chat completion request to the OpenRouter API.

    Returns the raw response content string.
    """
    api_key = (
        os.environ.get("OPENROUTER_API_KEY")
        or os.environ.get("AI_OPENROUTER_KEY")
        or OPENROUTER_CFG.api_key
    )
    if not api_key:
        raise RuntimeError(
            "OpenRouter API key is not set. Export OPENROUTER_API_KEY."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://siteinsight.ai",
        "X-Title": "SiteInsight AI Audit",
    }

    payload = {
        "model": OPENROUTER_CFG.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": OPENROUTER_CFG.temperature,
        "top_p": OPENROUTER_CFG.top_p,
        "max_tokens": OPENROUTER_CFG.max_tokens,
        "response_format": {"type": "json_object"},
    }

    url = f"{OPENROUTER_CFG.base_url}/chat/completions"

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(OPENROUTER_CFG.request_timeout_s)
    ) as client:
        await _emit_progress(
            progress_callback,
            "ai:request",
            f"calling OpenRouter model={OPENROUTER_CFG.model}",
            72,
        )
        t0 = time.monotonic()
        heartbeat = asyncio.create_task(
            _progress_heartbeat("ai:openrouter_wait", progress_callback=progress_callback)
        )
        try:
            response = await client.post(url, json=payload, headers=headers)
        finally:
            heartbeat.cancel()
            await asyncio.gather(heartbeat, return_exceptions=True)
        elapsed = time.monotonic() - t0
        await _emit_progress(
            progress_callback,
            "ai:response",
            f"OpenRouter responded in {elapsed:.1f}s status={response.status_code}",
            88,
        )

        response.raise_for_status()
        data = response.json()

    # OpenRouter follows OpenAI response shape.
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError("OpenRouter returned no choices.")

    return choices[0].get("message", {}).get("content", "")


# ──────────────────────────────────────────────────────────────────────
#  Repair prompt (sent when validation fails)
# ──────────────────────────────────────────────────────────────────────

_REPAIR_SYSTEM = (
    "You previously produced an invalid JSON audit report.  "
    "The validation errors are listed below.  Fix the JSON so it "
    "conforms to the schema.  Output ONLY the corrected JSON object."
)


async def _call_repair(
    broken_json: str,
    errors: list[str],
    backend: Literal["ollama", "openrouter"],
    *,
    progress_callback: Optional[ProgressCallback] = None,
) -> str:
    """Ask the LLM to fix its own broken output."""
    user_msg = (
        f"VALIDATION ERRORS:\n"
        + "\n".join(f"  • {e}" for e in errors)
        + f"\n\nBROKEN JSON:\n{broken_json}"
    )
    call_fn = _call_ollama if backend == "ollama" else _call_openrouter
    return await call_fn(_REPAIR_SYSTEM, user_msg, progress_callback=progress_callback)


# ──────────────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────────────

async def analyse_with_ai(
    snapshot: Dict[str, Any],
    *,
    backend: Literal["ollama", "openrouter"] = "ollama",
    progress_callback: Optional[ProgressCallback] = None,
) -> Dict[str, Any]:
    """
    Full AI analysis pipeline: prompt → LLM → validate → (repair) → result.

    Parameters
    ----------
    snapshot : dict
        PageSnapshot from ``extractor.extract_metrics()``.
    backend : "ollama" | "openrouter"
        Which LLM backend to use.

    Returns
    -------
    dict
        Validated audit report matching the output schema.

    Raises
    ------
    RuntimeError
        If all retries and repairs are exhausted.
    """
    # Step 1 — Build prompts.
    system_prompt, user_prompt = build_prompts(snapshot)

    await _emit_progress(
        progress_callback,
        "ai:prompt",
        f"prompt built system={len(system_prompt)} chars user={len(user_prompt)} chars",
        66,
    )

    call_fn = _call_ollama if backend == "ollama" else _call_openrouter
    snapshot_metrics = snapshot.get("metrics", {})

    last_error: Optional[Exception] = None

    # Step 2 — Call LLM with retries.
    for attempt in range(1, RETRY_CFG.max_llm_retries + 1):
        try:
            await _emit_progress(
                progress_callback,
                "ai:attempt",
                f"LLM attempt {attempt}/{RETRY_CFG.max_llm_retries} using backend={backend}",
                70,
            )
            raw_response = await call_fn(
                system_prompt,
                user_prompt,
                progress_callback=progress_callback,
            )
            break
        except (httpx.HTTPStatusError, httpx.ConnectError, httpx.ReadTimeout) as exc:
            last_error = exc
            logger.warning(
                "LLM call attempt %d/%d failed: %s",
                attempt,
                RETRY_CFG.max_llm_retries,
                exc,
            )
            if attempt < RETRY_CFG.max_llm_retries:
                await asyncio.sleep(RETRY_CFG.retry_backoff_s * attempt)
    else:
        raise RuntimeError(
            f"All {RETRY_CFG.max_llm_retries} LLM call attempts failed.  "
            f"Last error: {last_error}"
        )

    # Step 3 — Extract JSON from (possibly messy) response.
    json_str = _extract_json_from_response(raw_response)

    await _emit_progress(
        progress_callback,
        "ai:parse",
        f"extracted JSON payload ({len(json_str)} chars)",
        90,
    )

    # Step 4 — Validate.
    await _emit_progress(progress_callback, "ai:validate", "validating model output", 94)
    result, errors = validate_and_repair(json_str, snapshot_metrics)

    if result is not None:
        await _emit_progress(progress_callback, "ai:validate", "validation passed on first attempt", 98)
        return result

    # Step 5 — Repair loop.
    for repair_attempt in range(1, RETRY_CFG.max_repair_attempts + 1):
        logger.warning(
            "[stage:ai:repair] validation failed (%d errors), repair attempt %d/%d",
            len(errors),
            repair_attempt,
            RETRY_CFG.max_repair_attempts,
        )

        try:
            repair_raw = await _call_repair(
                json_str,
                errors,
                backend,
                progress_callback=progress_callback,
            )
        except Exception as exc:
            logger.error("Repair call failed: %s", exc)
            continue

        repair_json = _extract_json_from_response(repair_raw)
        result, errors = validate_and_repair(repair_json, snapshot_metrics)

        if result is not None:
            await _emit_progress(
                progress_callback,
                "ai:repair",
                f"validation passed after repair attempt {repair_attempt}",
                98,
            )
            return result

        # Update json_str for the next repair iteration.
        json_str = repair_json

    # Step 6 — Last resort: re-call the LLM from scratch.
    logger.warning("[stage:ai:retry] repair exhausted, attempting full re-generation")

    try:
        raw_response = await call_fn(
            system_prompt,
            user_prompt,
            progress_callback=progress_callback,
        )
        json_str = _extract_json_from_response(raw_response)
        result, errors = validate_and_repair(json_str, snapshot_metrics)

        if result is not None:
            await _emit_progress(progress_callback, "ai:retry", "validation passed on re-generation", 98)
            return result
    except Exception as exc:
        logger.error("Re-generation failed: %s", exc)

    # If we're still here, produce a structured error report.
    raise RuntimeError(
        f"AI analysis failed after all retries.  "
        f"Last validation errors: {errors}"
    )
