from datetime import date
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class MonthlyRevenueCard(BaseModel):
    month_label: str
    total_revenue: Decimal
    average_adr: Decimal
    average_stay_nights: Decimal
    growth_percent: Decimal


class CancellationAlert(BaseModel):
    booking_id: str
    guest_name: str
    guest_email: EmailStr
    room_type: str
    stay_dates: str
    booked_price: Decimal
    competitor_price: Decimal | None
    risk: str


class OperationalPulse(BaseModel):
    """Live-ish operational KPIs scoped by property when requested."""

    as_of_date: date
    total_rooms: int
    occupied_rooms_tonight: int
    occupancy_pct_tonight: Decimal
    arrivals_next_7_days: int
    departures_next_7_days: int
    future_check_ins_next_30_days: int


class PeriodComparison(BaseModel):
    """Rolling week-over-week on realized activity (check-in / check-out dates)."""

    granularity: str = Field(default="rolling_7d", description="Fixed rolling windows ending at as_of_date.")
    as_of_date: date
    current_label: str
    previous_label: str
    current_start: date
    current_end: date
    previous_start: date
    previous_end: date
    arrivals_current: int
    arrivals_previous: int
    arrivals_change_pct: Decimal | None = Field(
        default=None, description="Percent vs prior window; null when prior period is zero."
    )
    departures_current: int
    departures_previous: int
    departures_change_pct: Decimal | None = None
    check_in_revenue_current: Decimal
    check_in_revenue_previous: Decimal
    revenue_change_pct: Decimal | None = None


class OperationalPriority(BaseModel):
    """Structured insight + suggested action for ops / GM view."""

    category: str
    severity: str
    title: str
    detail: str
    suggested_action: str
    route_hint: str | None = None


class DashboardResponse(BaseModel):
    monthly_revenue: MonthlyRevenueCard
    alerts: list[CancellationAlert]
    priorities: list[OperationalPriority]
    operational_pulse: OperationalPulse
    period_comparison: PeriodComparison | None = Field(
        default=None,
        description="WoW-style rolling 7d vs prior 7d when computable.",
    )
    calendar_week_comparison: PeriodComparison | None = Field(
        default=None,
        description="Current ISO calendar week (Mon–Sun) vs the prior week.",
    )
    pipeline_comparison: PeriodComparison | None = Field(
        default=None,
        description="Forward: check-ins in next 7 days vs the following 7 days.",
    )
    property_scope: dict | None = Field(
        default=None,
        description="When filtering by property: id, name, area_name.",
    )
