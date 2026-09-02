import logging
from fastapi import APIRouter, HTTPException, Path
from backend.services.db_service import DBService
from backend.services.trend_service import TrendService

logger = logging.getLogger("topic_routes")
router = APIRouter(prefix="/api/topics", tags=["Topics"])

@router.get("/{slug_or_name}", summary="Get topic detail with timeline, authors, and papers")
def get_topic_detail(slug_or_name: str = Path(...)):
    db = DBService()
    trend = TrendService(db)
    detail = trend.get_topic_detail(slug_or_name)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Topic '{slug_or_name}' not found.")
    return detail
