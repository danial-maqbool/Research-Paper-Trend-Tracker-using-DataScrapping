import os
import json
import logging
from pydantic import BaseModel
from typing import List, Optional
from fastapi import APIRouter, Path, HTTPException
from backend.services.db_service import DBService
from backend.config import DEFAULT_CATEGORIES, GEMINI_MODEL, AI_ANALYSIS_ENABLED, GEMINI_MAX_REQUESTS_PER_MINUTE

logger = logging.getLogger("settings_routes")
router = APIRouter(prefix="/api/settings", tags=["Settings"])

class CategoryTogglePayload(BaseModel):
    is_enabled: bool

class SettingsUpdatePayload(BaseModel):
    default_categories: Optional[List[str]] = None
    default_fetch_amount: Optional[int] = None
    default_date_window: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    ai_analysis_enabled: Optional[bool] = None
    gemini_max_requests_per_minute: Optional[int] = None
    export_format: Optional[str] = None

@router.get("", summary="Get all configuration settings")
def get_settings():
    db = DBService()
    categories = db.get_categories()
    
    # Read saved settings or defaults
    fetch_amount = int(db.get_setting("default_fetch_amount", "50"))
    date_window = db.get_setting("default_date_window", "7d")
    model = db.get_setting("gemini_model", GEMINI_MODEL)
    ai_enabled = db.get_setting("ai_analysis_enabled", str(AI_ANALYSIS_ENABLED)).lower() == "true"
    rate_limit = int(db.get_setting("gemini_max_requests_per_minute", str(GEMINI_MAX_REQUESTS_PER_MINUTE)))
    export_fmt = db.get_setting("export_format", "csv")
    
    # Mask API key for security
    api_key = db.get_setting("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")
    masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else ("configured" if api_key else "")

    return {
        "categories": categories,
        "default_fetch_amount": fetch_amount,
        "default_date_window": date_window,
        "gemini_model": model,
        "ai_analysis_enabled": ai_enabled,
        "gemini_max_requests_per_minute": rate_limit,
        "export_format": export_fmt,
        "gemini_api_key_configured": bool(api_key),
        "gemini_api_key_masked": masked_key
    }

@router.post("", summary="Update application settings")
def update_settings(payload: SettingsUpdatePayload):
    db = DBService()
    
    if payload.default_fetch_amount is not None:
        db.set_setting("default_fetch_amount", str(payload.default_fetch_amount))
    if payload.default_date_window is not None:
        db.set_setting("default_date_window", payload.default_date_window)
    if payload.gemini_model is not None:
        db.set_setting("gemini_model", payload.gemini_model)
    if payload.ai_analysis_enabled is not None:
        db.set_setting("ai_analysis_enabled", str(payload.ai_analysis_enabled).lower())
    if payload.gemini_max_requests_per_minute is not None:
        db.set_setting("gemini_max_requests_per_minute", str(payload.gemini_max_requests_per_minute))
    if payload.export_format is not None:
        db.set_setting("export_format", payload.export_format)
    if payload.gemini_api_key is not None and payload.gemini_api_key.strip():
        db.set_setting("gemini_api_key", payload.gemini_api_key.strip())
        os.environ["GEMINI_API_KEY"] = payload.gemini_api_key.strip()

    return {"message": "Settings updated successfully."}

@router.post("/categories/{category_id}/toggle", summary="Enable or disable a category")
def toggle_category(category_id: str = Path(...), payload: CategoryTogglePayload = None):
    db = DBService()
    if payload is None:
        raise HTTPException(status_code=400, detail="Missing payload")
    db.set_category_enabled(category_id, payload.is_enabled)
    return {"message": f"Category {category_id} status updated.", "is_enabled": payload.is_enabled}
