"""
Test isolation for the cybercrime backend suite (pytest loads this before any test module).

Why: on a clean clone the suite used to stop with two collection errors (no SECRET_KEY, and a
script that queries the database at import time), and test_endpoint.py only passed on a machine
whose local investigation.db already had tables. This file makes the run reproducible:

* a throwaway SECRET_KEY (generated per run, never stored) unless one is already set;
* an isolated SQLite database in a temporary folder, with all tables created at session start;
* BHIV runtime URLs forced empty, so unit tests never call TANTRA or VAJRA by accident
  (the live/integrated checks live in ../../verification and are run separately);
* manual scripts that are not pytest tests are excluded from collection.
"""

import os
import secrets
import tempfile
from pathlib import Path

_TEST_DIR = Path(tempfile.mkdtemp(prefix="cybercrime-tests-"))

os.environ.setdefault("SECRET_KEY", "test-only-" + secrets.token_hex(16))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TEST_DIR / 'test.db').as_posix()}"
os.environ["EVENT_BUFFER_PATH"] = str(_TEST_DIR / "event_buffer" / "events.jsonl")
os.environ["EVIDENCE_STORAGE_PATH"] = str(_TEST_DIR / "evidence_storage")
for _name in (
    "TANTRA_VALIDATION_URL",
    "TANTRA_KARMA_URL",
    "TANTRA_PRANA_URL",
    "VAJRA_API_URL",
    "VAJRA_TANTRA_SECRET",
    "BHIV_CORE_EVENT_URL",
    "BHIV_BUCKET_EVIDENCE_URL",
    "KAFKA_BOOTSTRAP_SERVERS",
):
    os.environ[_name] = ""

# Manual scripts, not pytest tests (they run code at import time).
collect_ignore = ["test_predictions.py", "test_import.py"]


def pytest_sessionstart(session):
    from app.db.database import Base, engine
    import app.db.models  # noqa: F401  (registers every model on Base)

    Base.metadata.create_all(bind=engine)


def pytest_sessionfinish(session, exitstatus):
    """Close the database and remove the temporary folder (report, never hide, a failed cleanup)."""
    import shutil

    from app.db.database import engine

    engine.dispose()
    shutil.rmtree(_TEST_DIR, ignore_errors=True)
    if _TEST_DIR.exists():
        print(f"note: could not remove test folder {_TEST_DIR}")
