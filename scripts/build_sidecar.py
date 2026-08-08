#!/usr/bin/env python3
"""Build the Python backend as a standalone Tauri sidecar with PyInstaller."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from prepare_sidecar import rust_target

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    target = rust_target()
    name = f"localforge-backend-{target}"
    subprocess.run(
        [
            sys.executable,
            "-m",
            "PyInstaller",
            "--clean",
            "--onefile",
            "--name",
            name,
            "--paths",
            str(ROOT / "backend"),
            "--distpath",
            str(ROOT / "src-tauri" / "binaries"),
            "--workpath",
            str(ROOT / "build" / "pyinstaller"),
            "--specpath",
            str(ROOT / "build"),
            str(ROOT / "backend" / "localforge_backend" / "server.py"),
        ],
        check=True,
        cwd=ROOT,
    )
    print(f"Built production sidecar: src-tauri/binaries/{name}")


if __name__ == "__main__":
    main()
