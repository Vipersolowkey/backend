"""Run full seed_db only when SQLite demo DB has no properties (Render free tier has no Shell).

Set SEED_ON_START=1 in the service environment. Safe to skip for non-SQLite URLs.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _should_run() -> bool:
    flag = os.environ.get("SEED_ON_START", "").strip().lower()
    if flag not in ("1", "true", "yes"):
        return False
    from app.core.config import settings

    if not settings.database_url.lower().startswith("sqlite"):
        return False
    from sqlalchemy import create_engine, text

    eng = create_engine(settings.database_url)
    try:
        with eng.connect() as conn:
            n = conn.execute(text("SELECT COUNT(*) FROM properties")).scalar_one()
    except Exception:
        return True
    return int(n or 0) == 0


def main() -> None:
    if not _should_run():
        return
    seed_script = Path(__file__).resolve().parent / "seed_db.py"
    subprocess.check_call(
        [sys.executable, str(seed_script)],
        cwd=str(BACKEND_DIR),
        env={**os.environ, "PYTHONPATH": str(BACKEND_DIR)},
    )


if __name__ == "__main__":
    main()
