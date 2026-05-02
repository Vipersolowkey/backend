"""Run digest / threshold jobs once (Task Scheduler or cron). Example:

  cd backend
  python scripts/run_automation.py digest
  python scripts/run_automation.py evaluate
  python scripts/run_automation.py both
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.db.session import SessionLocal  # noqa: E402
from app.services.automation_runner import (  # noqa: E402
    run_scheduled_digest,
    run_scheduled_threshold_evaluation,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Owner automation one-shot runner")
    parser.add_argument("command", choices=["digest", "evaluate", "both"])
    args = parser.parse_args()
    db = SessionLocal()
    try:
        if args.command in ("digest", "both"):
            print("digest:", run_scheduled_digest(db))
        if args.command in ("evaluate", "both"):
            print("evaluate:", run_scheduled_threshold_evaluation(db))
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
