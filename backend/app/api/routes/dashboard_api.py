from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.routes.dashboard import get_dashboard_payload
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    property_id: int | None = Query(default=None, description="Filter alerts/priorities to rooms on this property."),
) -> DashboardResponse:
    return get_dashboard_payload(db, property_id=property_id)
