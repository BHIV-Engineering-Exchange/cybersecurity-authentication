"""Remove secrets from everything the harness writes (api samples, logs, reports)."""

from __future__ import annotations

import re
from typing import Any, Iterable

JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}")
BEARER_RE = re.compile(r"(?i)\b(bearer\s+)(?!\[REDACTED)[A-Za-z0-9._~+/=-]{6,}")
SENSITIVE_KEY_PARTS = ("password", "secret", "authorization", "api_key", "apikey", "private_key", "cookie",
                       "access_token", "refresh_token", "jti")


class Redactor:
    """Literal values registered at run time (generated secrets, passwords) plus pattern rules.

    A secret registered with add_named() is replaced by "[REDACTED:<label>]", so the evidence says which credential a
    call used without ever showing it; every other secret becomes "[REDACTED]".
    """

    def __init__(self) -> None:
        self._literals: set[str] = set()
        self._labels: dict[str, str] = {}

    def add(self, *values: Any) -> None:
        for value in values:
            if isinstance(value, str) and len(value) >= 6:
                self._literals.add(value)

    def add_named(self, value: str, label: str) -> None:
        assert re.fullmatch(r"[A-Z0-9_]{3,40}", label), label
        self.add(value)
        if value in self._literals:
            self._labels[value] = label

    def text(self, value: str) -> str:
        out = value
        for literal in sorted(self._literals, key=len, reverse=True):
            out = out.replace(literal, f"[REDACTED:{self._labels[literal]}]" if literal in self._labels else "[REDACTED]")
        out = JWT_RE.sub("[REDACTED_JWT]", out)
        out = BEARER_RE.sub(r"\1[REDACTED]", out)
        return out

    def obj(self, value: Any) -> Any:
        if isinstance(value, dict):
            clean = {}
            for key, val in value.items():
                lowered = str(key).lower()
                if any(part in lowered for part in SENSITIVE_KEY_PARTS) and isinstance(val, str) and val:
                    # Keep a credential label (e.g. "Bearer [REDACTED:VAJRA_CYBER_SECRET]") only when the whole value
                    # was a named secret; anything else in a sensitive field is dropped entirely.
                    labelled = self.text(val)
                    named = re.fullmatch(r"(?i)(bearer\s+)?\[REDACTED:[A-Z0-9_]+\]", labelled)
                    clean[key] = labelled if named else "[REDACTED]"
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
