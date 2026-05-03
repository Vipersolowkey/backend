"""HTTP smoke checks across main API surfaces (dashboard, calendar, guests/CRM, insights, predictive, AI heuristics, exports).

Requires seeded SQLite DB. Run from repo root:

    PYTHONPATH=backend python backend/scripts/smoke_api.py
"""

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
    get("/api/v1/dashboard", params={"property_id": 1})
    get("/api/v1/properties")
    get("/api/v1/calendar/occupancy", params={"year": 2026, "month": 5})
    get("/api/v1/calendar/occupancy", params={"year": 2026, "month": 6, "property_id": 1})
    get("/api/v1/alert-thresholds")
    get("/api/v1/pricing-decisions", params={"limit": 5})
    post("/api/v1/alert-thresholds/evaluate", {"property_id": None})
    get("/api/v1/guests", params={"limit": 3})
    get("/api/v1/guests", params={"limit": 50})
    get("/api/v1/insights/leaderboards")
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
    post(
        "/api/v1/ai/competitor-insights",
        {"area_name": "Nha Trang", "max_hotels": 6, "max_reviews_per_hotel": 2},
    )
    post(
        "/api/v1/ai/guest-advisor",
        {
            "area_name": "Nha Trang",
            "customer_message": "Family of 3, 4 nights, prefer sea view, mid budget.",
            "party_size": 3,
            "nights": 4,
            "travel_intent": "leisure",
        },
    )
    post(
        "/api/v1/ai/lead-scoring",
        {
            "area_name": "Nha Trang",
            "customer_message": "Is breakfast included? We might extend one night.",
            "party_size": 2,
            "nights": 3,
            "travel_intent": "bleisure",
        },
    )
    post(
        "/api/v1/ai/conversion-playbook",
        {
            "area_name": "Đà Lạt",
            "customer_message": "Comparing two hotels; need quiet room.",
            "party_size": 2,
            "nights": 2,
            "travel_intent": "leisure",
        },
    )
    post(
        "/api/v1/marketing/generate-promo-email",
        {
            "booking_id": "ORT-2026-0001",
            "guest_name": "Smoke Guest",
            "guest_email": "smoke.guest@example.com",
            "room_type": "Deluxe",
            "stay_dates": "2026-05-01 to 2026-05-06",
            "booked_price": "540.00",
            "competitor_price": "80.50",
            "risk_level": "HIGH",
            "area_name": "Nha Trang",
        },
    )
    get("/api/v1/reports/export.csv")
    get("/api/v1/reports/export.xlsx")
    get("/api/v1/predictive/dynamic-price", params={"room_id": 1, "target_date": "2026-06-15"})
    post(
        "/api/v1/predictive/cancellation-risk",
        {
            "room_id": 1,
            "check_in": "2026-05-10",
            "check_out": "2026-05-14",
            "total_price": "1200.00",
        },
    )

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
