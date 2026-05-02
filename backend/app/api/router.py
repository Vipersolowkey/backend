from fastapi import APIRouter

from app.api.routes.ai import router as ai_router
from app.api.routes.automation import router as automation_router
from app.api.routes.dashboard_api import router as dashboard_router
from app.api.routes.extensions import router as extensions_router
from app.api.routes.marketing import router as marketing_router
from app.api.routes.predictive import router as predictive_router

api_router = APIRouter()
api_router.include_router(ai_router)
api_router.include_router(automation_router)
api_router.include_router(dashboard_router)
api_router.include_router(marketing_router)
api_router.include_router(predictive_router)
api_router.include_router(extensions_router)
