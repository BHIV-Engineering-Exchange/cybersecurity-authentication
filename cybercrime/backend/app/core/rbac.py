"""
Role-based access control utilities.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from fnmatch import fnmatchcase
from pathlib import Path
from typing import Iterable, List, Optional


@dataclass(frozen=True)
class PermissionRule:
    role: str
    methods: List[str]
    paths: List[str]


class RBACPolicy:
    def __init__(self, *, roles: Iterable[str], permissions: Iterable[PermissionRule]):
        self.roles = {str(role) for role in roles}
        self.permissions = list(permissions)

    def is_allowed(self, *, role: str, method: str, path: str) -> bool:
        role = role or "public"
        if role not in self.roles:
            return False

        normalized_path = _normalize_path(path)
        for rule in self.permissions:
            if rule.role != role:
                continue
            if not _method_matches(rule.methods, method):
                continue
            if _path_matches(rule.paths, normalized_path):
                return True
        return False


def load_rbac_policy(path: Path) -> RBACPolicy:
    data = json.loads(path.read_text(encoding="utf-8"))
    roles = data.get("roles") or []
    permissions_raw = data.get("permissions") or []
    permissions: List[PermissionRule] = []

    for entry in permissions_raw:
        role = entry.get("role")
        methods = entry.get("methods") or []
        paths = entry.get("paths") or []
        if not role or not methods or not paths:
            raise ValueError("RBAC permissions must include role, methods, and paths.")
        permissions.append(
            PermissionRule(
                role=str(role),
                methods=[str(m).upper() for m in methods],
                paths=[str(p) for p in paths],
            )
        )

    policy = RBACPolicy(roles=roles, permissions=permissions)
    return policy


def _method_matches(allowed_methods: List[str], method: str) -> bool:
    if "*" in allowed_methods:
        return True
    return method.upper() in allowed_methods


def _path_matches(patterns: List[str], path: str) -> bool:
    for pattern in patterns:
        if fnmatchcase(path, _normalize_path(pattern)):
            return True
    return False


def _normalize_path(path: Optional[str]) -> str:
    if not path:
        return "/"
    if path != "/" and path.endswith("/"):
        return path[:-1]
    return path


def extract_path_id(path: str, marker: str) -> Optional[int]:
    parts = [p for p in path.split("/") if p]
    for idx, part in enumerate(parts):
        if part == marker and idx + 1 < len(parts):
            value = parts[idx + 1]
            if value.isdigit():
                return int(value)
    return None
