import logging
from typing import Optional
from fastapi import APIRouter, Response, Query
from backend.services.db_service import DBService
from backend.services.trend_service import TrendService
from backend.services.export_service import ExportService

logger = logging.getLogger("export_routes")
router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("/papers", summary="Export papers as CSV or JSON")
def export_papers(
    format: str = Query("csv", regex="^(csv|json)$"),
    category: Optional[str] = None,
    q: Optional[str] = None,
    saved_only: bool = False,
    limit: int = Query(500, ge=1, le=2000)
):
    db = DBService()
    papers, _ = db.get_papers(
        query=q,
        category=category,
        saved_only=saved_only,
        page=1,
        page_size=limit
    )

    if format == "json":
        json_data = ExportService.export_papers_json(papers)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="papers_export.json"'}
        )
    else:
        csv_data = ExportService.export_papers_csv(papers)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="papers_export.csv"'}
        )

@router.get("/trends", summary="Export trend analytics as CSV or JSON")
def export_trends(
    format: str = Query("csv", regex="^(csv|json)$"),
    window: str = Query("7d", regex="^(1d|7d|30d)$")
):
    db = DBService()
    trend = TrendService(db)
    window_days = 1 if window == "1d" else (30 if window == "30d" else 7)
    trends_data = trend.get_trends_explorer(window_days=window_days)

    if format == "json":
        json_data = ExportService.export_trends_json(trends_data)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="trends_{window}.json"'}
        )
    else:
        csv_data = ExportService.export_trends_csv(trends_data["topics"], trends_data["keywords"])
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="trends_{window}.csv"'}
        )
