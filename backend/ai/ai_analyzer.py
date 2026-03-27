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
from pathlib import Path
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


def _logs_dir() -> Path:
    path = Path(__file__).resolve().parents[2] / "logs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _write_text_log(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def _write_json_log(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _persist_prompt_artifacts(snapshot: Dict[str, Any], system_prompt: str, user_prompt: str) -> None:
    logs_dir = _logs_dir()
    _write_json_log(logs_dir / "sample-input.json", snapshot)
    _write_text_log(
        logs_dir / "sample-prompt.txt",
        "\n\n".join(
            [
                "=== SYSTEM PROMPT ===",
                system_prompt,
                "=== USER PROMPT ===",
                user_prompt,
            ]
        ),
    )


def _persist_raw_output(raw_output: str) -> None:
    logs_dir = _logs_dir()
    _write_text_log(logs_dir / "sample-raw-output.json", raw_output)


def _write_prompt_log_summary(snapshot: Dict[str, Any], backend: str) -> None:
    logs_dir = _logs_dir()
    summary = "\n".join(
        [
            "# Prompt Log",
            "",
            "This repository writes prompt artifacts for each audit run.",
            "",
            "Generated files:",
            "- `logs/sample-input.json`: structured snapshot sent into prompt construction",
            "- `logs/sample-prompt.txt`: exact system prompt and user prompt sent to the model",
            "- `logs/sample-raw-output.json`: raw model output before JSON extraction/repair",
            "",
            f"Latest backend: `{backend}`",
            f"Latest audited URL: `{snapshot.get('url', 'unknown')}`",
            "",
            "The AI layer is intentionally split into:",
            "- extraction (`fetcher` -> `parser` -> `extractor`)",
            "- prompt construction (`backend/ai/prompt_builder.py`)",
            "- model call + retries (`backend/ai/ai_analyzer.py`)",
            "- validation/repair (`backend/ai/validator.py`)",
        ]
    )
    _write_text_log(logs_dir / "prompt-log.md", summary)


def _compute_retry_delay(exc: Exception, attempt: int) -> float:
    if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
        retry_after = exc.response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(float(retry_after), 0.0)
            except ValueError:
                pass

    return RETRY_CFG.retry_backoff_s * attempt


def _format_llm_error(exc: Exception, backend: str) -> str:
    if isinstance(exc, RuntimeError):
        return str(exc)

    if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
        status_code = exc.response.status_code
        if backend == "openrouter" and status_code == 429:
            return (
                "OpenRouter rate-limited the request with 429 Too Many Requests. "
                "This commonly happens on free models or low-credit accounts. "
                "Wait and retry, or set OPENROUTER_MODEL to a paid/stabler model."
            )
        return f"{exc}"

    return str(exc)


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


def _strip_think_tags(text: str | None) -> str:
    """Remove all <think>…</think> blocks from the LLM response."""
    if text is None:
        return ""
    cleaned = _THINK_TAG_RE.sub("", text)
    # Handle unclosed <think> (model was cut off mid-thought).
    cleaned = _THINK_OPEN_RE.sub("", cleaned)
    return cleaned.strip()


# ──────────────────────────────────────────────────────────────────────
#  JSON extraction from raw text
# ──────────────────────────────────────────────────────────────────────

def _extract_json_from_response(raw: str | None) -> str:
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


def _coerce_openrouter_content(message: Dict[str, Any]) -> str:
    """
    Normalize OpenRouter/OpenAI-style message payloads into a text string.

    Some providers return:
    - {"content": "..."}
    - {"content": [{"type": "text", "text": "..."}]}
    - {"content": None, "reasoning": "..."}
    """
    content = message.get("content")

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    text_parts.append(text)
            elif isinstance(item, str) and item.strip():
                text_parts.append(item)
        if text_parts:
            return "\n".join(text_parts)

    for fallback_key in ("reasoning", "refusal"):
        fallback = message.get(fallback_key)
        if isinstance(fallback, str) and fallback.strip():
            return fallback

    return ""


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

        if response.status_code == 401:
            raise RuntimeError(
                "OpenRouter rejected the API key with 401 Unauthorized. "
                "For Docker runs, pass OPENROUTER_API_KEY into the running container "
                "with `docker run --env-file .env ...` or `-e OPENROUTER_API_KEY=...`. "
                "If the key is already present, verify that it is valid and not revoked."
            )
        if response.status_code == 429:
            raise httpx.HTTPStatusError(
                "OpenRouter rate limit exceeded.",
                request=response.request,
                response=response,
            )

        response.raise_for_status()
        data = response.json()

    # OpenRouter follows OpenAI response shape.
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError("OpenRouter returned no choices.")

    message = choices[0].get("message", {})
    content = _coerce_openrouter_content(message)
    if not content.strip():
        raise RuntimeError(
            "OpenRouter returned an empty message content payload."
        )

    return content


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
    _persist_prompt_artifacts(snapshot, system_prompt, user_prompt)
    _write_prompt_log_summary(snapshot, backend)

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
        except (RuntimeError, httpx.HTTPStatusError, httpx.ConnectError, httpx.ReadTimeout) as exc:
            last_error = exc
            logger.warning(
                "LLM call attempt %d/%d failed: %s",
                attempt,
                RETRY_CFG.max_llm_retries,
                exc,
            )
            if attempt < RETRY_CFG.max_llm_retries:
                delay_s = _compute_retry_delay(exc, attempt)
                await _emit_progress(
                    progress_callback,
                    "ai:retry",
                    f"retrying after {delay_s:.1f}s due to {type(exc).__name__}",
                    74,
                )
                await asyncio.sleep(delay_s)
    else:
        raise RuntimeError(
            f"All {RETRY_CFG.max_llm_retries} LLM call attempts failed.  "
            f"Last error: {_format_llm_error(last_error, backend)}"
        )

    # Step 3 — Extract JSON from (possibly messy) response.
    json_str = _extract_json_from_response(raw_response)
    _persist_raw_output(raw_response)
    if not json_str.strip():
        raise RuntimeError("LLM returned no JSON content to parse.")

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
        if not json_str.strip():
            raise RuntimeError("LLM returned no JSON content to parse on re-generation.")
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
