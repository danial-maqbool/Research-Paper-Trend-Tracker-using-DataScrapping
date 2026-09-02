import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Path
from backend.models.schemas import PaperListItem, PaperDetail, PaperListResponse, CitationResponse
from backend.services.db_service import DBService
from backend.services.gemini_service import GeminiService
from backend.services.trend_service import TrendService

logger = logging.getLogger("paper_routes")
router = APIRouter(prefix="/api/papers", tags=["Papers"])

@router.get("", response_model=PaperListResponse, summary="Search and filter papers")
def list_papers(
    q: Optional[str] = Query(None, description="Search term across title, abstract, authors, keywords, topics"),
    category: Optional[str] = Query(None, description="arXiv category identifier, e.g. cs.AI"),
    start_date: Optional[str] = Query(None, description="ISO publication date cutoff"),
    end_date: Optional[str] = Query(None, description="ISO publication date upper bound"),
    paper_type: Optional[str] = Query(None, description="Filter by paper type (e.g. new method, benchmark)"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (beginner, intermediate, advanced, specialist)"),
    saved_only: bool = Query(False, description="Show only bookmarked papers"),
    min_trend_score: Optional[float] = Query(None, description="Minimum trend velocity score"),
    topic: Optional[str] = Query(None, description="Filter by research topic"),
    keyword: Optional[str] = Query(None, description="Filter by technical keyword"),
    author: Optional[str] = Query(None, description="Filter by author name"),
    sort_by: str = Query("newest", regex="^(newest|oldest|trend|title)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    db = DBService()
    papers, total = db.get_papers(
        query=q,
        category=category,
        start_date=start_date,
        end_date=end_date,
        paper_type=paper_type,
        difficulty=difficulty,
        saved_only=saved_only,
        min_trend_score=min_trend_score,
        topic=topic,
        keyword=keyword,
        author=author,
        sort_by=sort_by,
        page=page,
        page_size=page_size
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "papers": papers,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{paper_id}", response_model=PaperDetail, summary="Get full paper details")
def get_paper(paper_id: int = Path(..., ge=1)):
    db = DBService()
    paper = db.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return paper

@router.post("/{paper_id}/analyze", summary="Trigger Gemini analysis on a specific paper")
def analyze_paper(paper_id: int = Path(..., ge=1)):
    db = DBService()
    paper = db.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    gemini = GeminiService()
    analysis = gemini.analyze_paper(paper["title"], paper["abstract"])
    if not analysis:
        raise HTTPException(status_code=500, detail="Gemini analysis failed.")

    db.update_paper_ai_analysis(paper_id, analysis)
    
    # Recalculate trend scores with new keywords and topics
    trend = TrendService(db)
    trend.calculate_paper_scores()

    updated = db.get_paper_by_id(paper_id)
    return {
        "message": "Paper analyzed successfully.",
        "analysis": analysis,
        "paper": updated
    }

@router.get("/{paper_id}/citation", response_model=CitationResponse, summary="Generate citation")
def get_citation(paper_id: int = Path(..., ge=1)):
    db = DBService()
    paper = db.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    authors_str = ", ".join(paper.get("authors", [])) or "Anonymous"
    first_author_last = authors_str.split(",")[0].split()[-1].lower() if paper.get("authors") else "unknown"
    year = paper["published_date"][:4] if paper.get("published_date") else "2026"
    arxiv_id = paper["arxiv_id"]
    title = paper["title"]

    # Plain text citation
    plain_text = f"{authors_str}. ({year}). {title}. arXiv preprint arXiv:{arxiv_id}."

    # BibTeX citation
    cite_key = f"{first_author_last}{year}{arxiv_id.replace('.', '_')}"
    bibtex = f"""@article{{{cite_key},
  author    = {{{' and '.join(paper.get('authors', []))}}},
  title     = {{{title}}},
  journal   = {{arXiv preprint arXiv:{arxiv_id}}},
  year      = {{{year}}},
  eprint    = {{{arxiv_id}}},
  archivePrefix = {{arXiv}},
  primaryClass = {{{paper.get('primary_category', 'cs.AI')}}},
  url       = {{{paper['page_url']}}}
}}"""

    return {
        "arxiv_id": arxiv_id,
        "title": title,
        "plain_text": plain_text,
        "bibtex": bibtex.strip()
    }
