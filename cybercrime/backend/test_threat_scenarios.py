"""
Runs the runnable synthetic scenarios in fixtures/threat_scenarios.json against the real API (TestClient) and checks
that each scenario's declared coverage matches what the system actually does. Synthetic data only.
"""

import json
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app
from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.db.models import SecurityIncident, User

client = TestClient(app)
FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "threat_scenarios.json").read_text(encoding="utf-8"))
SCENARIOS = {s["id"]: s for s in FIXTURE["scenarios"]}


def _account(password: str = "Right-pass-1") -> User:
    db = SessionLocal()
    user = User(email=f"scenario-{uuid.uuid4().hex[:8]}@bhiv-verification.example", hashed_password=get_password_hash(password),
                full_name="Scenario account (synthetic)", role="investigator", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.expunge(user)
    db.close()
    return user


def _incidents(user: User) -> list:
    db = SessionLocal()
    rows = db.query(SecurityIncident).filter(SecurityIncident.target_ref == f"cc_usr_{user.id}").all()
    out = [r.to_dict() for r in rows]
    db.close()
    return out


def _run_logins(scenario: dict) -> tuple[list, list]:
    recipe = scenario["recipe"]
    users = [_account() for _ in range(recipe["accounts"])]
    codes = []
    for user in users:
        for _ in range(recipe["wrong_per_account"]):
            codes.append(client.post("/api/v1/auth/login", data={"username": user.email, "password": "wrong"}).status_code)
        if recipe.get("then_correct"):
            assert client.post("/api/v1/auth/login", data={"username": user.email, "password": "Right-pass-1"}).status_code == 200
    return users, codes


@pytest.mark.parametrize("scenario_id", ["TS-01", "TS-02", "TS-03", "TS-04"])
def test_login_scenarios_match_their_declared_coverage(scenario_id):
    scenario = SCENARIOS[scenario_id]
    users, codes = _run_logins(scenario)
    assert set(codes) == {scenario["expected"]["http"]}
    incidents = [i for u in users for i in _incidents(u)]
    assert len(incidents) == scenario["expected"]["incidents"]
    if scenario["expected"]["incidents"]:
        assert incidents[0]["severity"] == scenario["expected"]["severity"]
    if scenario["expected"].get("account_blocked") is False:
        ok = client.post("/api/v1/auth/login", data={"username": users[0].email, "password": "Right-pass-1"})
        assert ok.status_code == 200  # detection blocks no one
    # A scenario that opens no incident while an attack is under way is a declared gap, never "covered".
    if scenario["class"] == "credential_abuse" and len(users) > 1 and not incidents:
        assert scenario["coverage"] == "not_covered" and scenario.get("gap")


def test_every_scenario_is_classified_and_every_gap_is_explained():
    classes = {t["class"] for t in FIXTURE["taxonomy"]}
    for scenario in FIXTURE["scenarios"]:
        assert scenario["class"] in classes
        assert scenario["coverage"] in FIXTURE["coverage_words"]
        if scenario["coverage"] != "covered":
            assert scenario.get("gap"), scenario["id"]
        else:
            assert scenario.get("proof"), scenario["id"]
