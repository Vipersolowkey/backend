"""Quick HTTP smoke checks (requires seeded SQLite DB). Run: PYTHONPATH=backend python backend/scripts/smoke_api.py"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def main() -> int:
    c = TestClient(app)
    failures: list[tuple[str, str, int, str]] = []

    def get(path: str, **kw):
        r = c.get(path, **kw)
        if r.status_code >= 400:
            failures.append(("GET", path, r.status_code, r.text[:400]))

    def post(path: str, json_body: dict):
        r = c.post(path, json=json_body)
        if r.status_code >= 400:
            failures.append(("POST", path, r.status_code, r.text[:400]))

    get("/health")
    get("/api/v1/dashboard")
    get("/api/v1/properties")
    get("/api/v1/calendar/occupancy", params={"year": 2026, "month": 5})
    post("/api/v1/alert-thresholds/evaluate", {"property_id": None})
    get("/api/v1/guests", params={"limit": 3})
    post(
        "/api/v1/ai/revenue-manager-brief",
        {"area_name": "Nha Trang"},
    )
    post(
        "/api/v1/ai/pricing-simulation",
        {
            "area_name": "Nha Trang",
            "room_type": "D",
            "scenario_input": "Smoke test: adjust BAR slightly for midweek demand.",
            "demand_scenario": "baseline",
            "property_id": None,
        },
    )
    get("/api/v1/reports/export.csv")
    get("/api/v1/reports/export.xlsx")
    get("/api/v1/predictive/dynamic-price", params={"room_id": 1, "target_date": "2026-06-15"})

    r = c.get("/api/v1/guests", params={"limit": 1})
    if r.status_code == 200 and r.json():
        gid = r.json()[0]["id"]
        get(f"/api/v1/guests/{gid}/crm")

    if failures:
        for row in failures:
            print("FAIL", row)
        return 1
    print("smoke_api: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
