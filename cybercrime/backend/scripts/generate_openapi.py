"""
Generate frozen OpenAPI specification.
"""

import json
import sys
from pathlib import Path

try:
    import yaml
except Exception:  # pragma: no cover - fallback when PyYAML isn't available
    yaml = None

# Add parent directory to path so we can import main
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent
sys.path.insert(0, str(backend_dir))

from main import app


def main() -> None:
    spec = app.openapi()
    normalized = json.loads(json.dumps(spec, sort_keys=True))
    target_path = Path(__file__).resolve().parents[2] / "openapi.yaml"
    if yaml:
        content = yaml.safe_dump(normalized, sort_keys=False, allow_unicode=False)
    else:
        content = json.dumps(normalized, indent=2, sort_keys=True)

    target_path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
