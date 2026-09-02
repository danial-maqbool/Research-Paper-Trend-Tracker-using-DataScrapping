import logging
from fastapi import APIRouter
from backend.services.db_service import DBService
from backend.services.gemini_service import GeminiService
from backend.services.brief_service import BriefService

logger = logging.getLogger("brief_routes")
router = APIRouter(prefix="/api/brief", tags=["Daily Research Brief"])

@router.get("", summary="Get or generate the Daily Research Brief")
def get_daily_brief():
    db = DBService()
    gemini = GeminiService()
    brief_service = BriefService(db, gemini)
    return brief_service.generate_daily_brief()
