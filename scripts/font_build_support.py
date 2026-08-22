"""Shared locking and pinned-environment support for font generators."""

from __future__ import annotations

import fcntl
import hashlib
import os
from pathlib import Path
import subprocess
import sys
from typing import IO


def font_toolchain_digest(root: Path) -> str:
    requirements = root / "scripts" / "requirements-font-subsets.txt"
    return hashlib.sha256(requirements.read_bytes()).hexdigest()


def acquire_font_build_lock(root: Path) -> IO[bytes]:
    lock_path = root / ".local-archive" / "font-build.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    stream = lock_path.open("a+b")
    fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
    return stream


def ensure_pinned_font_environment(root: Path) -> str:
    """Re-exec the current generator inside its ignored pinned venv if needed."""
    digest = font_toolchain_digest(root)
    environment_root = root / ".local-archive" / f"font-tools-venv-{digest[:12]}"
    environment_python = environment_root / "bin" / "python"
    ready = environment_root / ".ready"
    if Path(sys.prefix).resolve() == environment_root.resolve():
        return digest

    if not environment_python.is_file():
        subprocess.run([sys.executable, "-m", "venv", str(environment_root)], check=True)
    if not ready.is_file() or ready.read_text(encoding="utf-8").strip() != digest:
        subprocess.run(
            [
                str(environment_python),
                "-m",
                "pip",
                "install",
                "--disable-pip-version-check",
                "-r",
                str(root / "scripts" / "requirements-font-subsets.txt"),
            ],
            check=True,
        )
        ready.write_text(digest + "\n", encoding="utf-8", newline="\n")

    os.execv(str(environment_python), [str(environment_python), *sys.argv])
    raise AssertionError("os.execv returned unexpectedly")
