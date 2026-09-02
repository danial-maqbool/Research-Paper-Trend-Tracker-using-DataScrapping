import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query, HTTPException
from backend.services.db_service import DBService
from backend.services.trend_service import TrendService

logger = logging.getLogger("trend_routes")
router = APIRouter(prefix="/api/trends", tags=["Trends"])

class TopicComparePayload(BaseModel):
    topic_a: str
    topic_b: str

@router.get("/dashboard", summary="Get dashboard metrics and charts data")
def get_dashboard_data():
    db = DBService()
    trend = TrendService(db)
    return trend.get_dashboard_metrics()

@router.get("/explorer", summary="Get deep trends across topics, keywords, categories, and authors")
def get_trends_explorer(window: str = Query("7d", regex="^(1d|7d|30d)$")):
    db = DBService()
    trend = TrendService(db)
    window_days = 7
    if window == "1d":
        window_days = 1
    elif window == "30d":
        window_days = 30
    return trend.get_trends_explorer(window_days=window_days)

@router.post("/compare", summary="Compare two research topics side-by-side")
def compare_topics(payload: TopicComparePayload):
    db = DBService()
    trend = TrendService(db)
    if not payload.topic_a.strip() or not payload.topic_b.strip():
        raise HTTPException(status_code=400, detail="Both topics must be specified for comparison.")
    return trend.compare_topics(payload.topic_a.strip(), payload.topic_b.strip())
