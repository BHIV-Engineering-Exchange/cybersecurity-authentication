"""Start, stop and restart the real processes under test (no mocks in this file)."""

from __future__ import annotations

import os
import socket
import subprocess
import time
from pathlib import Path
from typing import Dict, Optional

import httpx

# Only these variables are passed from the operator's environment to the processes under test.
_INHERITED = ("PATH", "PATHEXT", "SYSTEMROOT", "SystemRoot", "SYSTEMDRIVE", "WINDIR", "COMSPEC", "TEMP", "TMP",
              "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "LOCALAPPDATA", "APPDATA", "PROGRAMDATA",
              "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "OS", "HOME", "LANG", "LC_ALL", "TZ")


def base_env(extra: Dict[str, str]) -> Dict[str, str]:
    env = {k: v for k, v in os.environ.items() if k in _INHERITED}
    env.update(extra)
    return env


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_http_ok(url: str, timeout_s: float = 60.0) -> float:
    """Poll url until it returns 200. Returns seconds waited; raises TimeoutError otherwise."""
    start = time.monotonic()
    last_error = ""
    while time.monotonic() - start < timeout_s:
        try:
            response = httpx.get(url, timeout=2.0)
            if response.status_code == 200:
                return round(time.monotonic() - start, 2)
            last_error = f"HTTP {response.status_code}"
        except Exception as exc:  # not up yet
            last_error = type(exc).__name__
        time.sleep(0.5)
    raise TimeoutError(f"{url} not healthy after {timeout_s}s ({last_error})")


class ManagedProcess:
    """A subprocess with its own log file. stop() kills it hard, like a crash."""

    def __init__(self, name: str, cmd: list[str], cwd: Path, env: Dict[str, str], log_path: Path,
                 health_url: str) -> None:
        self.name = name
        self.cmd = cmd
        self.cwd = cwd
        self.env = env
        self.log_path = log_path
        self.health_url = health_url
        self.proc: Optional[subprocess.Popen] = None
        self._log = None
        self.starts: list[dict] = []

    def start(self, timeout_s: float = 90.0) -> float:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self._log = open(self.log_path, "ab")
        self._log.write(f"\n===== harness: starting {self.name} at {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} =====\n".encode())
        self._log.flush()
        self.proc = subprocess.Popen(self.cmd, cwd=str(self.cwd), env=self.env, stdout=self._log,
                                     stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL)
        waited = wait_http_ok(self.health_url, timeout_s)
        self.starts.append({"utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "seconds_to_healthy": waited,
                            "pid": self.proc.pid})
        return waited

    def stop(self) -> None:
        if self.proc and self.proc.poll() is None:
            self.proc.kill()  # hard stop: simulates a crash, no graceful shutdown
            try:
                self.proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                pass
        self.proc = None
        if self._log:
            self._log.close()
            self._log = None

    def restart(self, env_overrides: Optional[Dict[str, str]] = None) -> float:
        self.stop()
        if env_overrides:
            self.env = {**self.env, **env_overrides}
        return self.start()

    def alive(self) -> bool:
        return bool(self.proc and self.proc.poll() is None)


def vajra_node(bin_path: Path, workdir: Path, secret: str, logs: Path, cyber_secret: Optional[str] = None) -> ManagedProcess:
    """Real VAJRA relay node built from bhiv-VAJRA_Blockchain, headless, isolated working folder.

    secret is VAJRA's governance token (VAJRA_TANTRA_SECRET); cyber_secret is its evidence-only tier
    (VAJRA_CYBER_SECRET, VAJRA commit 3cc883f and later; older nodes ignore it, as they ignore VAJRA_AUTHORITY_LEDGER).
    """
    workdir.mkdir(parents=True, exist_ok=True)
    http_port, p2p_port = free_port(), free_port()
    env = base_env({
        "BLOCKCHAIN_DOCKER": "true",  # skips the interactive CLI; data stays in the working folder
        "HTTP_PORT": str(http_port),
        "P2P_PORT": str(p2p_port),
        "TRUTH_STORE_PATH": str(workdir / "tantra_truth.jsonl"),
        "AKASHIC_STORE_PATH": str(workdir / "akashic_lineage.jsonl"),
        "NONCE_STORE_PATH": str(workdir / "nonce_ledger.jsonl"),
        "VAJRA_AUTHORITY_LEDGER": str(workdir / "authority_ledger.jsonl"),
        "VAJRA_TANTRA_SECRET": secret,
    })
    if cyber_secret:
        env["VAJRA_CYBER_SECRET"] = cyber_secret
    process = ManagedProcess("vajra-relay-node", [str(bin_path)], workdir, env, logs / "vajra_node.log",
                             f"http://127.0.0.1:{http_port}/api/health")
    process.base_url = f"http://127.0.0.1:{http_port}"  # type: ignore[attr-defined]
    process.truth_store = workdir / "tantra_truth.jsonl"  # type: ignore[attr-defined]
    process.authority_ledger = workdir / "authority_ledger.jsonl"  # type: ignore[attr-defined]
    return process


def cyber_service(python: Path, backend_dir: Path, env_overrides: Dict[str, str], logs: Path) -> ManagedProcess:
    """The Cybersecurity API (cybercrime backend) as a real uvicorn server."""
    port = free_port()
    env = base_env({**env_overrides, "PYTHONUNBUFFERED": "1"})
    cmd = [str(python), "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port), "--log-level", "info"]
    process = ManagedProcess("cybersecurity-api", cmd, backend_dir, env, logs / "cyber_service.log",
                             f"http://127.0.0.1:{port}/health")
    process.base_url = f"http://127.0.0.1:{port}"  # type: ignore[attr-defined]
    return process
