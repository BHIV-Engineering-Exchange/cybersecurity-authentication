import json
import os
from typing import Any, Dict

import httpx


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


async def call_openrouter_json(prompt: str) -> Dict[str, Any]:
    """
    Helper to call an OpenRouter-compatible chat completion endpoint and
    return parsed JSON from the model response.

    If OPENROUTER_API_KEY is not configured, this returns an empty dict so
    the caller can fall back to heuristic logic.
    """
    if not OPENROUTER_API_KEY:
        return {}

    validate_certs = os.getenv("VALIDATE_CERTS", "true").lower() == "true"

    async with httpx.AsyncClient(timeout=15.0, verify=validate_certs) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
            },
        )

    response.raise_for_status()
    data = response.json()

    # Expect JSON response_format, so the content should be a JSON string
    content = data["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except Exception:
        # If parsing fails, return empty dict to avoid crashing the dashboard
        return {}

