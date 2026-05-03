"""Leaderboards: room type & service ratings, upsell add-on usage."""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.guest_insights import RoomTypeRatingSummary, ServiceRatingSummary, UpsellUsageSummary
from app.models.pms import RoomType

router = APIRouter(prefix="/insights", tags=["insights"])


def _pct(part: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(100.0 * float(part) / float(total), 1)


@router.get("/leaderboards")
def get_leaderboards(db: Session = Depends(get_db)) -> dict:
    room_rows = db.execute(
        select(RoomTypeRatingSummary, RoomType)
        .join(RoomType, RoomType.id == RoomTypeRatingSummary.room_type_id)
        .order_by(RoomTypeRatingSummary.avg_rating.desc(), RoomTypeRatingSummary.review_count.desc()),
    ).all()

    service_rows = db.scalars(select(ServiceRatingSummary).order_by(ServiceRatingSummary.avg_rating.desc())).all()

    upsell_rows = db.scalars(select(UpsellUsageSummary).order_by(UpsellUsageSummary.orders_last_30d.desc())).all()
    upsell_total_30 = sum(int(r.orders_last_30d or 0) for r in upsell_rows) or 1

    return {
        "room_types": [
            {
                "room_type_id": rt.id,
                "code": rt.code,
                "name": rt.name,
                "avg_rating": float(Decimal(summary.avg_rating)),
                "review_count": int(summary.review_count),
            }
            for summary, rt in room_rows
        ],
        "services": [
            {
                "service_key": r.service_key,
                "name_vi": r.name_vi,
                "avg_rating": float(Decimal(r.avg_rating)),
                "review_count": int(r.review_count),
            }
            for r in service_rows
        ],
        "upsell_addons": [
            {
                "sku": r.sku,
                "name_vi": r.name_vi,
                "orders_last_30d": int(r.orders_last_30d),
                "orders_all_time": int(r.orders_all_time),
                "revenue_last_30d": float(Decimal(r.revenue_last_30d)),
                "share_last_30d_pct": _pct(int(r.orders_last_30d), upsell_total_30),
            }
            for r in upsell_rows
        ],
    }
