import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Path, Query
from backend.models.schemas import SavedPaperCreate, SavedPaperUpdate
from backend.services.db_service import DBService

logger = logging.getLogger("saved_routes")
router = APIRouter(prefix="/api/saved", tags=["Saved Papers"])

@router.get("", summary="Get all saved papers")
def get_saved_papers(
    status: Optional[str] = Query(None, regex="^(unread|reading|read)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    db = DBService()
    papers, total = db.get_papers(saved_only=True, page=page, page_size=page_size)
    if status:
        papers = [p for p in papers if p.get("reading_status") == status]
        total = len(papers)

    return {
        "saved_papers": papers,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("", summary="Save or bookmark a paper")
def save_paper(payload: SavedPaperCreate):
    db = DBService()
    paper = db.get_paper_by_id(payload.paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    db.save_paper(
        paper_id=payload.paper_id,
        reading_status=payload.reading_status,
        personal_note=payload.personal_note
    )
    return {"message": "Paper saved successfully.", "paper_id": payload.paper_id}

@router.patch("/{paper_id}", summary="Update saved paper status or notes")
def update_saved_paper(payload: SavedPaperUpdate, paper_id: int = Path(..., ge=1)):
    db = DBService()
    paper = db.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    db.update_saved_paper(
        paper_id=paper_id,
        reading_status=payload.reading_status,
        personal_note=payload.personal_note
    )
    return {"message": "Saved paper updated successfully.", "paper_id": paper_id}

@router.delete("/{paper_id}", summary="Remove paper from bookmarks")
def remove_saved_paper(paper_id: int = Path(..., ge=1)):
    db = DBService()
    db.remove_saved_paper(paper_id)
    return {"message": "Paper removed from saved list.", "paper_id": paper_id}
