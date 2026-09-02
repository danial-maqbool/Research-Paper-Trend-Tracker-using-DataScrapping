import logging
from fastapi import APIRouter, Query
from backend.services.db_service import DBService
from backend.services.trend_service import TrendService

logger = logging.getLogger("recommendation_routes")
router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.get("", summary="Get personalized paper recommendations")
def get_recommendations(limit: int = Query(8, ge=1, le=20)):
    db = DBService()
    trend = TrendService(db)
    return trend.get_recommendations(limit=limit)
