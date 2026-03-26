"""
validator.py — Schema validation, hallucination guard, and repair for
AI-generated audit reports.

Design decisions
────────────────
• Does NOT use Pydantic for validation — this is intentional.  The LLM
  produces free-form JSON that frequently needs partial correction
  (truncation, enum clamping, field renaming) rather than binary
  accept/reject.  A hand-written validator gives us fine-grained
  control to *fix* problems instead of just detecting them.
• The hallucination guard compares every ``metric_reference`` value
  against the set of keys that actually exist in the PageSnapshot.
  References to metrics that were never provided to the model are
  flagged and removed.
• All string fields are truncated to configured limits to prevent
  the LLM from returning essays.
• The validator returns (result, errors) — if result is None, the
  caller should trigger a repair/retry cycle using the errors list
  as guidance.

Public API
──────────
    result, errors = validate_and_repair(json_str, snapshot_metrics)
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from backend.ai_config import VALIDATION_CFG

logger = logging.getLogger(__name__)

_METRIC_REFERENCE_ALIASES = {
    "meta_description": "meta.description",
    "metadescription": "meta.description",
    "meta-description": "meta.description",
    "meta_desc": "meta.description",
    "description": "meta.description",
    "meta_title": "meta.title",
    "metatitle": "meta.title",
    "meta-title": "meta.title",
    "title": "meta.title",
    "h1_count": "headings.h1",
    "h2_count": "headings.h2",
    "h3_count": "headings.h3",
    "internal_links": "links.internal",
    "external_links": "links.external",
    "image_count": "images",
    "images.total": "images",
    "alt_missing_percent": "missing_alt_percent",
}


# ──────────────────────────────────────────────────────────────────────
#  JSON parsing
# ──────────────────────────────────────────────────────────────────────

def _safe_parse_json(text: str) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    Attempt to parse *text* as JSON.

    Returns (parsed_dict, "") on success, or (None, error_message) on
    failure.
    """
    if not text or not text.strip():
        return None, "Empty response — no JSON to parse."

    try:
        obj = json.loads(text)
    except json.JSONDecodeError as exc:
        return None, f"JSON parse error at position {exc.pos}: {exc.msg}"

    if not isinstance(obj, dict):
        return None, f"Expected a JSON object, got {type(obj).__name__}."

    return obj, ""


# ──────────────────────────────────────────────────────────────────────
#  String truncation helper
# ──────────────────────────────────────────────────────────────────────

def _clamp_str(value: Any, max_len: int) -> str:
    """Ensure *value* is a string of at most *max_len* characters."""
    s = str(value) if value is not None else ""
    if len(s) > max_len:
        s = s[: max_len - 1] + "…"
    return s


# ──────────────────────────────────────────────────────────────────────
#  Build the set of valid metric references from the actual snapshot
# ──────────────────────────────────────────────────────────────────────

def _build_valid_references(snapshot_metrics: Dict[str, Any]) -> set[str]:
    """
    Build the superset of valid metric_reference values from both the
    static known-keys list and the actual snapshot keys (flattened).

    This handles cases where the extractor adds new fields that haven't
    been added to ``VALIDATION_CFG.known_metric_keys`` yet.
    """
    valid = set(VALIDATION_CFG.known_metric_keys)

    def _flatten(d: Dict[str, Any], prefix: str = "") -> None:
        for key, val in d.items():
            full_key = f"{prefix}.{key}" if prefix else key
            valid.add(full_key)
            valid.add(key)  # Also accept the short name.
            if isinstance(val, dict):
                _flatten(val, full_key)

    _flatten(snapshot_metrics)
    return valid


def _normalize_metric_reference(ref: str) -> str:
    normalized = ref.strip().lower()
    normalized = normalized.replace(" ", "_")
    return _METRIC_REFERENCE_ALIASES.get(normalized, normalized)


# ──────────────────────────────────────────────────────────────────────
#  Core validation + correction
# ──────────────────────────────────────────────────────────────────────

def _validate_report(
    report: Dict[str, Any],
    valid_refs: set[str],
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Validate the parsed report dict and auto-correct what we can.

    Returns (corrected_report, list_of_errors).  If the error list is
    empty, the report is considered valid.  Some errors are auto-fixed
    (truncation, enum clamping) and logged as warnings rather than
    returned as errors.
    """
    errors: List[str] = []
    warnings: List[str] = []

    # ── 1. Top-level "summary" ────────────────────────────────────────

    if "summary" not in report or not isinstance(report.get("summary"), str):
        errors.append('Missing or non-string "summary" field.')
    else:
        report["summary"] = _clamp_str(
            report["summary"], VALIDATION_CFG.max_summary_chars
        )

    # ── 2. "insights" object ──────────────────────────────────────────

    required_insight_keys = {
        "seo_structure",
        "messaging_clarity",
        "cta_usage",
        "content_depth",
        "ux_concerns",
    }

    insights = report.get("insights")
    if not isinstance(insights, dict):
        errors.append('"insights" must be a JSON object.')
    else:
        for key in required_insight_keys:
            if key not in insights:
                errors.append(f'Missing insight key: "{key}".')
            elif not isinstance(insights[key], str):
                errors.append(f'"insights.{key}" must be a string.')
            else:
                insights[key] = _clamp_str(
                    insights[key], VALIDATION_CFG.max_insight_chars
                )

        # Remove any unexpected keys (model hallucinated extra sections).
        extra_keys = set(insights.keys()) - required_insight_keys
        for k in extra_keys:
            warnings.append(f'Removed unexpected insight key: "{k}".')
            del insights[k]

    # ── 3. "issues" array ─────────────────────────────────────────────

    issues = report.get("issues")
    if not isinstance(issues, list):
        errors.append('"issues" must be a JSON array.')
    else:
        # Enforce max issue count.
        if len(issues) > VALIDATION_CFG.max_issues:
            warnings.append(
                f"Truncated issues from {len(issues)} to "
                f"{VALIDATION_CFG.max_issues}."
            )
            issues = issues[: VALIDATION_CFG.max_issues]
            report["issues"] = issues

        cleaned_issues: List[Dict[str, Any]] = []

        for i, issue in enumerate(issues):
            if not isinstance(issue, dict):
                errors.append(f"issues[{i}] is not a JSON object.")
                continue

            issue_errors: List[str] = []

            # ── category ──
            cat = issue.get("category", "").lower().strip()
            if cat not in VALIDATION_CFG.valid_categories:
                # Attempt auto-correct: common LLM mistakes.
                cat_map = {
                    "a11y": "accessibility",
                    "access": "accessibility",
                    "performance": "ux",
                    "perf": "ux",
                    "design": "ux",
                    "copy": "content",
                    "writing": "content",
                    "meta": "seo",
                    "search": "seo",
                }
                corrected = cat_map.get(cat)
                if corrected:
                    warnings.append(
                        f'issues[{i}]: auto-corrected category '
                        f'"{cat}" → "{corrected}".'
                    )
                    issue["category"] = corrected
                else:
                    issue_errors.append(
                        f'issues[{i}]: invalid category "{cat}".  '
                        f"Must be one of: {VALIDATION_CFG.valid_categories}."
                    )
            else:
                issue["category"] = cat

            # ── severity ──
            sev = issue.get("severity", "").lower().strip()
            if sev not in VALIDATION_CFG.valid_severities:
                # Attempt auto-correct.
                sev_map = {
                    "critical": "high",
                    "severe": "high",
                    "minor": "low",
                    "moderate": "medium",
                    "med": "medium",
                }
                corrected = sev_map.get(sev)
                if corrected:
                    warnings.append(
                        f'issues[{i}]: auto-corrected severity '
                        f'"{sev}" → "{corrected}".'
                    )
                    issue["severity"] = corrected
                else:
                    issue_errors.append(
                        f'issues[{i}]: invalid severity "{sev}".  '
                        f"Must be one of: {VALIDATION_CFG.valid_severities}."
                    )
            else:
                issue["severity"] = sev

            # ── metric_reference (hallucination guard) ──
            ref = issue.get("metric_reference", "")
            if not ref or not isinstance(ref, str):
                issue_errors.append(
                    f"issues[{i}]: missing metric_reference."
                )
            else:
                normalized_ref = _normalize_metric_reference(ref)
                valid_refs_lower = {v.lower() for v in valid_refs}
                if normalized_ref in valid_refs_lower:
                    if normalized_ref != ref:
                        warnings.append(
                            f'issues[{i}]: auto-corrected metric_reference "{ref}" -> "{normalized_ref}".'
                        )
                    issue["metric_reference"] = normalized_ref
                else:
                    issue_errors.append(
                        f'issues[{i}]: metric_reference "{ref}" does not '
                        f"match any known metric.  This may be hallucinated."
                    )

            # ── Required string fields ──
            for field_name in ("issue", "why_it_matters", "suggested_fix"):
                val = issue.get(field_name)
                if not val or not isinstance(val, str):
                    issue_errors.append(
                        f'issues[{i}]: missing or empty "{field_name}".'
                    )
                else:
                    issue[field_name] = _clamp_str(
                        val, VALIDATION_CFG.max_issue_field_chars
                    )

            if issue_errors:
                errors.extend(issue_errors)
            else:
                cleaned_issues.append(issue)

        report["issues"] = cleaned_issues

    # Log warnings (auto-corrected items).
    for w in warnings:
        logger.warning("Validator auto-fix: %s", w)

    return report, errors


# ──────────────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────────────

def validate_and_repair(
    json_str: str,
    snapshot_metrics: Dict[str, Any],
) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    """
    Parse, validate, and auto-correct an LLM-generated JSON report.

    Parameters
    ----------
    json_str : str
        Raw JSON string extracted from the LLM response.
    snapshot_metrics : dict
        The ``metrics`` sub-dict from the original PageSnapshot.
        Used to build the set of valid metric references.

    Returns
    -------
    tuple[dict | None, list[str]]
        ``(validated_report, [])`` on success, or
        ``(None, error_list)`` when the report is beyond auto-repair.
    """
    # Phase 1 — Parse.
    parsed, parse_error = _safe_parse_json(json_str)
    if parsed is None:
        return None, [parse_error]

    # Phase 2 — Build valid references from the actual snapshot.
    valid_refs = _build_valid_references(snapshot_metrics)

    # Phase 3 — Validate and auto-correct.
    corrected, errors = _validate_report(parsed, valid_refs)

    if errors:
        logger.warning(
            "Validation found %d error(s):\n  %s",
            len(errors),
            "\n  ".join(errors),
        )
        return None, errors

    # Phase 4 — Final sanity: ensure we have at least 1 issue.
    if not corrected.get("issues"):
        return None, ["Report contains zero issues after validation."]

    return corrected, []
