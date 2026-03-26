"""
ai_config.py — Configuration for the AI analysis pipeline.

Centralises every tunable knob — model selection, endpoints, retry
policy, validation rules — so nothing is hard-coded in business logic.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import FrozenSet, Literal


def _load_project_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ[key] = value


_load_project_env()


@dataclass(frozen=True)
class OllamaConfig:
    """Connection settings for a local Ollama instance."""

    base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model: str = os.getenv("OLLAMA_MODEL", "gemma3:4b")

    # Generation parameters tuned for structured JSON.
    # Low temperature = deterministic; high repeat penalty = less rambling.
    temperature: float = 0.3
    top_p: float = 0.9
    num_ctx: int = 8192          # Context window in tokens.
    request_timeout_s: int = int(os.getenv("OLLAMA_REQUEST_TIMEOUT_S", "300"))


@dataclass(frozen=True)
class OpenRouterConfig:
    """Connection settings for the OpenRouter cloud API."""

    base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    model: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free")
    api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    temperature: float = 0.3
    top_p: float = 0.9
    max_tokens: int = 4096
    request_timeout_s: int = int(os.getenv("OPENROUTER_REQUEST_TIMEOUT_S", "180"))


@dataclass(frozen=True)
class RetryConfig:
    """Policy for LLM call retries and repair attempts."""

    max_llm_retries: int = 2        # Full LLM re-calls on transient failure.
    max_repair_attempts: int = 1     # Repair prompt re-calls on bad JSON.
    retry_backoff_s: float = 2.0     # Base delay between retries.


@dataclass(frozen=True)
class ValidationConfig:
    """Rules for post-processing and hallucination detection."""

    max_issues: int = 7
    max_summary_chars: int = 600
    max_insight_chars: int = 400
    max_issue_field_chars: int = 300

    valid_categories: FrozenSet[str] = field(
        default_factory=lambda: frozenset({"seo", "ux", "content", "accessibility"})
    )

    valid_severities: FrozenSet[str] = field(
        default_factory=lambda: frozenset({"low", "medium", "high"})
    )

    # Metric keys that actually exist in the PageSnapshot.
    # Used by the hallucination guard to verify metric_reference values.
    known_metric_keys: FrozenSet[str] = field(
        default_factory=lambda: frozenset({
            "word_count", "headings", "headings.h1", "headings.h2",
            "headings.h3", "cta_count", "links", "links.internal",
            "links.external", "images", "missing_alt_percent",
            "meta", "meta.title", "meta.description",
            "page_type_hint",
            "h2_texts", "h3_texts", "cta_texts", "main_text_excerpt",
        })
    )


# ── Singleton instances ──────────────────────────────────────────────

OLLAMA_CFG = OllamaConfig()
OPENROUTER_CFG = OpenRouterConfig()
RETRY_CFG = RetryConfig()
VALIDATION_CFG = ValidationConfig()
