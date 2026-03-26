from __future__ import annotations

import json
import os
from pathlib import Path

import requests


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"


MODELS = [
    {
        "label": "GLM 4.5 Air",
        "model": "z-ai/glm-4.5-air:free",
        "supports_system": True,
    },
    {
        "label": "Mistral Small 3.1 24B",
        "model": "mistralai/mistral-small-3.1-24b-instruct:free",
        "supports_system": True,
    },
    {
        "label": "Llama 3.3 70B",
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "supports_system": True,
    },
    {
        "label": "GPT OSS 20B",
        "model": "openai/gpt-oss-20b:free",
        "supports_system": True,
    },
    {
        "label": "Hermes 3 405B",
        "model": "nousresearch/hermes-3-llama-3.1-405b:free",
        "supports_system": True,
    },
    {
        "label": "Qwen 3 4B",
        "model": "qwen/qwen3-4b:free",
        "supports_system": True,
    },
    {
        "label": "Gemma 3 27B",
        "model": "google/gemma-3-27b-it:free",
        "supports_system": False,
    },
]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ[key] = value


def build_messages(supports_system: bool) -> list[dict[str, str]]:
    user_message = {"role": "user", "content": "hi"}
    if not supports_system:
        return [user_message]

    return [
        {"role": "system", "content": "Reply briefly and clearly."},
        user_message,
    ]


def main() -> None:
    load_env_file(ENV_PATH)

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError(f"OPENROUTER_API_KEY is missing in {ENV_PATH}")

    key_fingerprint = f"{api_key[:12]}...{api_key[-6:]}" if len(api_key) > 18 else "<too-short>"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://siteinsight.ai",
        "X-Title": "SiteInsight AI LLM Probe",
    }

    print(f"Loaded API key from {ENV_PATH}")
    print(f"Key fingerprint: {key_fingerprint} (length={len(api_key)})")
    print(f"Testing {len(MODELS)} model(s)...")

    for item in MODELS:
        payload = {
            "model": item["model"],
            "messages": build_messages(item["supports_system"]),
            "temperature": 0,
        }

        print(f"\n[{item['label']}] {item['model']}")

        try:
            response = requests.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=90,
            )
            data = response.json()
        except Exception as exc:
            print(f"FAILED: request error: {exc}")
            continue

        if response.status_code != 200:
            print("FAILED:")
            print(json.dumps(data, indent=2))
            continue

        choices = data.get("choices", [])
        if not choices:
            print("FAILED: no choices returned")
            continue

        content = choices[0].get("message", {}).get("content", "").strip()
        usage = data.get("usage", {})
        print(f"OK: {content}")
        if usage:
            print(
                "Usage:",
                json.dumps(
                    {
                        "prompt_tokens": usage.get("prompt_tokens"),
                        "completion_tokens": usage.get("completion_tokens"),
                        "total_tokens": usage.get("total_tokens"),
                    }
                ),
            )


if __name__ == "__main__":
    main()
