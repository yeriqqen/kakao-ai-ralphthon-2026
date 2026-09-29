#!/usr/bin/env python3
"""Create a local runnable v2 archive from source allowlists, never from runtime data."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts" / "v2"
ARCHIVE = OUT / "yokobu-v2-runnable.zip"
MANIFEST = OUT / "package-manifest.json"
ROOT_FILES = ("README.md", "package.json", "server-v2.mjs", "server.mjs", ".env.example", ".gitignore")
TREES = ("public", "lib", "scripts", "tests", "docs")
CURATED_CHECKS = ("artifacts/v2/http-check.json", "artifacts/v2/live-api-check.json", "artifacts/v2/customer-ui-check.json", "artifacts/v2/business-ui-check.json")
SUFFIXES = {".mjs", ".js", ".json", ".html", ".css", ".svg", ".md", ".py", ".txt", ".woff2"}
BLOCKED_PARTS = {".git", ".env", "node_modules", "__pycache__", "local-runs", "attachments", "session-logs", "prompts", "secrets", "keys", "tokens"}
BLOCKED_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".crt", ".cer", ".log", ".zip"}
SECRET_PATTERNS = (
    re.compile(rb"sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"(?:#|[?&])token=[A-Za-z0-9_-]{24,}"),
)
SYNTHETIC_ROOM_TOKEN_EXAMPLES = {b"synthetic-business-token", b"synthetic-customer-token"}


def permitted(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if path.is_symlink() or not path.is_file():
        return False
    if any(part.lower() in BLOCKED_PARTS for part in relative.parts):
        return False
    if path.suffix.lower() in BLOCKED_SUFFIXES:
        return False
    if path.name.startswith(".env") and relative.as_posix() != ".env.example":
        return False
    lower_name = path.name.lower()
    if any(marker in lower_name for marker in ("session-log", "raw-prompt", "pasted-text", "private-key", "access-token")):
        return False
    return relative.as_posix() in ROOT_FILES or path.suffix.lower() in SUFFIXES


def source_files() -> list[Path]:
    files = []
    for name in ROOT_FILES:
        candidate = ROOT / name
        if not candidate.is_file():
            raise SystemExit(f"Required source file is missing: {name}")
        files.append(candidate)
    for name in TREES:
        tree = ROOT / name
        if not tree.is_dir():
            raise SystemExit(f"Required source directory is missing: {name}")
        files.extend(path for path in tree.rglob("*") if permitted(path))
    files.extend(ROOT / name for name in CURATED_CHECKS if (ROOT / name).is_file())
    return sorted(set(files), key=lambda path: path.relative_to(ROOT).as_posix())


def smoke_archive() -> None:
    """Launch only the extracted local server; never exercise an upstream API."""
    checks = []
    with tempfile.TemporaryDirectory(prefix="yokobu-v2-package-smoke-") as folder:
        with zipfile.ZipFile(ARCHIVE) as archive:
            names = archive.namelist()
            archive.extractall(folder)
        checks.append({"name": "archive excludes .env, git and local-runs", "passed": all(name != ".env" and not name.startswith(".git/") and "local-runs/" not in name for name in names)})
        with socket.socket() as available:
            available.bind(("127.0.0.1", 0))
            port = available.getsockname()[1]
        environment = {key: value for key, value in os.environ.items() if not key.startswith("OPENAI_") and key not in {"PUBLIC_BASE_URL", "TLS_CERT_FILE", "TLS_KEY_FILE"}}
        environment.update(PORT=str(port), HOST="127.0.0.1")
        process = subprocess.Popen(["node", "server-v2.mjs"], cwd=folder, env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            config = None
            for _ in range(40):
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/config", timeout=1) as response:
                        config = json.load(response)
                    break
                except (OSError, ValueError):
                    time.sleep(0.1)
            checks.append({"name": "extracted v2 server starts without credential leakage", "passed": config is not None and config.get("configured") is False})
            for route in ("/", "/business", "/legacy", "/v2/customer.js", "/v2/business.js", "/fonts/InterVariable.woff2"):
                passed = False
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{port}{route}", timeout=2) as response:
                        passed = response.status == 200 and len(response.read()) > 0
                        if route.endswith(".woff2"):
                            passed = passed and response.headers.get_content_type() == "font/woff2"
                except OSError:
                    pass
                checks.append({"name": f"extracted server serves {route}", "passed": passed})
        finally:
            process.terminate()
            process.wait(timeout=5)
    result = {"type": "extracted_local_package_smoke_no_api_or_audio", "archiveSha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), "passed": sum(check["passed"] for check in checks), "total": len(checks), "checks": checks}
    (OUT / "package-smoke.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted package smoke: {result['passed']}/{result['total']} passed; no API/audio invoked.")
    if result["passed"] != result["total"]:
        raise SystemExit("Extracted package smoke failed; inspect artifacts/v2/package-smoke.json.")


def main() -> None:
    files = source_files()
    entries = []
    payloads = {}
    for path in files:
        if not permitted(path):
            raise SystemExit("A required source path is not safe to package.")
        relative = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        if relative == "artifacts/v2/business-ui-check.json":
            detailed = json.loads(data)
            curated = {key: detailed[key] for key in ("mock", "realAPI", "realMicrophone", "audibleKorean", "provenance", "generatedAt", "sources", "checks", "passed", "unexpectedNetwork") if key in detailed}
            curated["packagingNote"] = "Detailed synthetic HTTP/event payloads omitted from this runnable package; full test report stays in the local repository."
            data = (json.dumps(curated, ensure_ascii=False, indent=2) + "\n").encode()
        secret_matches = [match.group(0) for pattern in SECRET_PATTERNS for match in pattern.finditer(data)]
        if any(match.split(b"token=", 1)[-1] not in SYNTHETIC_ROOM_TOKEN_EXAMPLES for match in secret_matches):
            # Never print the matched credential or contents.
            raise SystemExit(f"Possible credential/private room link found; package not created. Review file: {relative}")
        if relative == ".env.example":
            match = re.search(rb"^[ \t]*OPENAI_API_KEY[ \t]*=[ \t]*([^\r\n]*)", data, re.MULTILINE)
            if match and match.group(1).strip().strip(b"\"'"):
                raise SystemExit("The example API key must be blank; package not created.")
        payloads[relative] = data
        entries.append({"path": relative, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})

    manifest = {
        "title": "YOKOBU v2 local runnable source package",
        "simulation": True,
        "officialSubmission": False,
        "realTelephoneCalls": False,
        "credentialIncluded": False,
        "runtimeExportsIncluded": False,
        "allowlistedDirectories": list(TREES),
        "curatedCheckArtifacts": [name for name in CURATED_CHECKS if name in payloads],
        "notes": [
            "Real OpenAI access must be configured separately on the recipient's computer.",
            "Includes historical v1 source and reports as explicitly labeled legacy material.",
            "Excludes .env, Git history, credentials, local-run exports, room links, raw prompts, and session logs.",
            "This archive is not proof of live API/audio success or an official external submission.",
        ],
        "files": entries,
    }
    payloads["PACKAGE-MANIFEST.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    OUT.mkdir(parents=True, exist_ok=True)
    temporary = OUT / "yokobu-v2-runnable.zip.tmp"
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative, data in sorted(payloads.items()):
            info = zipfile.ZipInfo(relative, date_time=(2026, 9, 29, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None:
            raise SystemExit("Archive integrity check failed; final archive was not replaced.")
        if set(archive.namelist()) != set(payloads):
            raise SystemExit("Archive allowlist verification failed; final archive was not replaced.")
        for entry in entries:
            name = PurePosixPath(entry["path"])
            if name.is_absolute() or ".." in name.parts:
                raise SystemExit("Archive path validation failed.")
            if hashlib.sha256(archive.read(entry["path"])).hexdigest() != entry["sha256"]:
                raise SystemExit("Archive content verification failed.")
    temporary.replace(ARCHIVE)
    manifest["archive"] = {"path": ARCHIVE.relative_to(ROOT).as_posix(), "bytes": ARCHIVE.stat().st_size, "sha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Packaged {len(entries)} allowlisted source files: {ARCHIVE.relative_to(ROOT)}")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print("No private .env, real credentials, runtime room tokens, or runtime exports included. No external submission performed.")
    if "--smoke" in sys.argv[1:]:
        smoke_archive()


if __name__ == "__main__":
    main()
