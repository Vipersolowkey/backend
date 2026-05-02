from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.services.automation_runner import run_scheduled_digest, run_scheduled_threshold_evaluation

router = APIRouter(prefix="/automation", tags=["automation"])


async def verify_automation_secret(
    x_automation_secret: str | None = Header(default=None, alias="X-Automation-Secret"),
) -> None:
    expected = settings.automation_trigger_secret
    if not expected:
        raise HTTPException(status_code=503, detail="AUTOMATION_TRIGGER_SECRET is not configured")
    if not x_automation_secret or x_automation_secret.strip() != expected.strip():
        raise HTTPException(status_code=403, detail="Invalid automation secret")


@router.post("/run-digest")
def automation_run_digest(
    db: Session = Depends(get_db),
    _: None = Depends(verify_automation_secret),
) -> dict:
    """Send morning digest immediately (same payload as the cron job)."""
    return run_scheduled_digest(db)


@router.post("/run-evaluate")
def automation_run_evaluate(
    db: Session = Depends(get_db),
    _: None = Depends(verify_automation_secret),
) -> dict:
    """Run threshold evaluation with webhook dedupe (same as the interval job)."""
    return run_scheduled_threshold_evaluation(db)
