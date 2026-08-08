#!/usr/bin/env python3
"""Create a development sidecar launcher for the current Rust target."""

from __future__ import annotations

import os
import platform
import stat
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def rust_target() -> str:
    try:
        output = subprocess.check_output(["rustc", "-vV"], text=True)
        for line in output.splitlines():
            if line.startswith("host: "):
                return line.removeprefix("host: ").strip()
    except (OSError, subprocess.CalledProcessError):
        pass
    machine = {"AMD64": "x86_64", "arm64": "aarch64"}.get(platform.machine(), platform.machine())
    if platform.system() == "Linux":
        return f"{machine}-unknown-linux-gnu"
    if platform.system() == "Darwin":
        return f"{machine}-apple-darwin"
    raise SystemExit("Run scripts/build_sidecar.py on Windows to create a .exe sidecar")


def main() -> None:
    target = rust_target()
    destination = ROOT / "src-tauri" / "binaries" / f"localforge-backend-{target}"
    launcher = """#!/usr/bin/env sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
export PYTHONPATH="$PROJECT_ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"
exec python3 -m localforge_backend.server "$@"
"""
    destination.write_text(launcher, encoding="utf-8")
    destination.chmod(destination.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    print(f"Prepared development sidecar: {destination.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
