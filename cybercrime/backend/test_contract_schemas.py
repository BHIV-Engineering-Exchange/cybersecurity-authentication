"""Contract test: the committed JSON Schemas in cybercrime/contracts/ match the models the API uses."""

import importlib.util
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("export_contract_schemas", BACKEND / "scripts" / "export_contract_schemas.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def test_committed_schemas_match_the_code():
    expected = exporter.render()
    for name, text in expected.items():
        committed = (exporter.OUT / name).read_text(encoding="utf-8").replace("\r\n", "\n")
        assert committed == text, f"{name} drifted: run scripts/export_contract_schemas.py"


def test_every_contract_is_versioned():
    for stem, _, version, owner, _ in exporter.CONTRACTS:
        assert version and owner and (exporter.OUT / f"{stem}.v{version}.schema.json").exists()
