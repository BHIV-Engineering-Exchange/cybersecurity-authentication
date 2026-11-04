"""Remove secrets from everything the harness writes (api samples, logs, reports)."""

from __future__ import annotations

import re
from typing import Any, Iterable

JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}")
BEARER_RE = re.compile(r"(?i)\b(bearer\s+)(?!\[REDACTED)[A-Za-z0-9._~+/=-]{6,}")
SENSITIVE_KEY_PARTS = ("password", "secret", "authorization", "api_key", "apikey", "private_key", "cookie",
                       "access_token", "refresh_token", "jti")


class Redactor:
    """Literal values registered at run time (generated secrets, passwords) plus pattern rules."""

    def __init__(self) -> None:
        self._literals: set[str] = set()

    def add(self, *values: Any) -> None:
        for value in values:
            if isinstance(value, str) and len(value) >= 6:
                self._literals.add(value)

    def text(self, value: str) -> str:
        out = value
        for literal in sorted(self._literals, key=len, reverse=True):
            out = out.replace(literal, "[REDACTED]")
        out = JWT_RE.sub("[REDACTED_JWT]", out)
        out = BEARER_RE.sub(r"\1[REDACTED]", out)
        return out

    def obj(self, value: Any) -> Any:
        if isinstance(value, dict):
            clean = {}
            for key, val in value.items():
                lowered = str(key).lower()
                if any(part in lowered for part in SENSITIVE_KEY_PARTS) and isinstance(val, str) and val:
                    clean[key] = "[REDACTED]"
                else:
                    clean[key] = self.obj(val)
            return clean
        if isinstance(value, list):
            return [self.obj(item) for item in value]
        if isinstance(value, str):
            return self.text(value)
        return value

    def contains_secret(self, blobs: Iterable[str]) -> list[str]:
        """Return the literal secrets (masked) that still appear in any blob. Used as a final gate."""
        hits = []
        for literal in self._literals:
            if any(literal in blob for blob in blobs):
                hits.append(literal[:2] + "***")
        return hits
