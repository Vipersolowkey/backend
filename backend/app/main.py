from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.session import Base, engine
from app.models import (  # noqa: F401
    Booking,
    CancellationSummary,
    CompetitorData,
    CountrySummary,
    Guest,
    MonthlyRevenueSummary,
    Room,
    RoomType,
)
from app.models.property_ops import (  # noqa: F401
    AlertThreshold,
    GuestNote,
    GuestTag,
    GuestTimelineEvent,
    PricingDecisionLog,
    Property,
    RoomTypePriceRule,
    ThresholdNotifyDedupe,
)

_scheduler: BackgroundScheduler | None = None


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        global _scheduler
        Base.metadata.create_all(bind=engine)
        if not settings.automation_enabled:
            return
        try:
            tz = ZoneInfo(settings.automation_timezone)
        except Exception:
            tz = ZoneInfo("UTC")
        from app.db.session import SessionLocal
        from app.services.automation_runner import run_scheduled_digest, run_scheduled_threshold_evaluation

        def digest_job() -> None:
            db = SessionLocal()
            try:
                run_scheduled_digest(db)
            finally:
                db.close()

        def eval_job() -> None:
            db = SessionLocal()
            try:
                run_scheduled_threshold_evaluation(db)
            finally:
                db.close()

        _scheduler = BackgroundScheduler(timezone=tz)
        _scheduler.add_job(
            digest_job,
            "cron",
            hour=int(settings.automation_digest_cron_hour),
            minute=int(settings.automation_digest_cron_minute),
        )
        _scheduler.add_job(
            eval_job,
            "interval",
            minutes=max(5, int(settings.automation_eval_interval_minutes)),
        )
        _scheduler.start()

    @app.on_event("shutdown")
    def on_shutdown() -> None:
        global _scheduler
        if _scheduler is not None:
            _scheduler.shutdown(wait=False)
            _scheduler = None

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
