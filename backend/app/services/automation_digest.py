"""Plain-text morning digest built from existing dashboard payload."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.api.routes.dashboard import get_dashboard_payload
from app.core.config import settings


def _dashboard_link(property_id: int | None) -> str:
    base = settings.automation_dashboard_base_url.rstrip("/")
    if property_id is None:
        return f"{base}/"
    return f"{base}/?property={property_id}"


def build_morning_digest(db: Session, property_id: int | None) -> tuple[str, str]:
    """
    Returns (subject, body_plain).
    When property_id is None, combined portfolio scope (same as dashboard “all properties”).
    """
    payload = get_dashboard_payload(db, property_id=property_id)
    pulse = payload.operational_pulse
    scope_name = "All properties"
    if payload.property_scope:
        scope_name = str(payload.property_scope.get("name") or scope_name)

    rev = payload.monthly_revenue
    lines: list[str] = [
        f"Snapshot date: {pulse.as_of_date.isoformat()}",
        f"Scope: {scope_name}",
        "",
        "Tonight occupancy",
        f"  {pulse.occupancy_pct_tonight}% ({pulse.occupied_rooms_tonight} / {pulse.total_rooms} rooms)",
        "",
        "Next 7 days",
        f"  Arrivals: {pulse.arrivals_next_7_days}",
        f"  Departures: {pulse.departures_next_7_days}",
        "",
        "Pipeline",
        f"  Check-ins in next 30 days: {pulse.future_check_ins_next_30_days}",
        "",
        "HIGH-risk cancellation queue (recent scan)",
        f"  {len(payload.alerts)} bookings flagged (dashboard scan)",
        "",
        f"Revenue ({rev.month_label})",
        f"  Total (estimated): {rev.total_revenue}",
        f"  MoM growth: {rev.growth_percent}%",
        "",
        "Top priorities",
    ]
    for row in payload.priorities[:3]:
        lines.append(f"  • [{row.severity}] {row.title}")
        lines.append(f"    → {row.suggested_action}")

    lines.extend(
        [
            "",
            "Pricing",
            "  Open Revenue Manager + Pricing Lab in the dashboard for AI-assisted BAR scenarios.",
            "",
            f"Dashboard: {_dashboard_link(property_id)}",
        ]
    )
    subject = f"[Hotel Ops] Morning digest — {scope_name}"
    body = "\n".join(lines)
    return subject, body
