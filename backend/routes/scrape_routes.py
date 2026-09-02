import threading
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from backend.models.schemas import ScrapeRequest, ScrapeRunItem
from backend.services.db_service import DBService
from backend.services.arxiv_service import ArxivService
from backend.services.gemini_service import GeminiService
from backend.services.trend_service import TrendService

logger = logging.getLogger("scrape_routes")
router = APIRouter(prefix="/api/scrape", tags=["Scraping"])

# Global scrape state lock
is_scraping_active = False
scrape_lock = threading.Lock()

def perform_scrape_task(
    db: DBService,
    arxiv: ArxivService,
    gemini: GeminiService,
    trend: TrendService,
    run_id: int,
    categories: List[str],
    max_results: int,
    date_window: str,
    start_date: Optional[str],
    end_date: Optional[str],
    sort_by: str,
    sort_order: str,
    run_ai: bool
):
    global is_scraping_active
    new_count = 0
    updated_count = 0
    failed_count = 0
    ai_count = 0
    total_fetched = 0

    try:
        logger.info(f"Starting scrape run {run_id} for categories: {categories}")
        records, total_arxiv = arxiv.fetch_papers(
            categories=categories,
            max_results=max_results,
            date_window=date_window,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
            sort_order=sort_order
        )

        total_fetched = len(records)
        logger.info(f"Run {run_id}: Fetched {total_fetched} records from arXiv.")

        saved_paper_ids = []
        for record in records:
            try:
                p_id, is_new = db.upsert_paper(
                    paper=record["paper"],
                    authors=record["authors"],
                    categories=record["categories"]
                )
                saved_paper_ids.append((p_id, record["paper"]["title"], record["paper"]["abstract"]))
                if is_new:
                    new_count += 1
                else:
                    updated_count += 1
            except Exception as pe:
                logger.error(f"Failed to upsert paper: {pe}")
                failed_count += 1

        # Run AI analysis if enabled
        if run_ai:
            for pid, title, abstract in saved_paper_ids:
                try:
                    # Check if already analyzed
                    paper_data = db.get_paper_by_id(pid)
                    if paper_data and not paper_data.get("ai_analyzed"):
                        analysis = gemini.analyze_paper(title, abstract)
                        if analysis:
                            db.update_paper_ai_analysis(pid, analysis)
                            ai_count += 1
                except Exception as ae:
                    logger.warning(f"AI analysis failed for paper {pid}: {ae}")

        # Recalculate trend and freshness scores
        trend.calculate_paper_scores()

        db.update_scrape_run(
            run_id=run_id,
            fetched_count=total_fetched,
            new_papers=new_count,
            updated_papers=updated_count,
            failed_records=failed_count,
            ai_completed=ai_count,
            status="completed"
        )
        logger.info(f"Run {run_id} completed: {new_count} new, {updated_count} updated, {ai_count} AI processed.")

    except Exception as e:
        logger.error(f"Scrape run {run_id} failed: {e}")
        db.update_scrape_run(
            run_id=run_id,
            fetched_count=total_fetched,
            new_papers=new_count,
            updated_papers=updated_count,
            failed_records=failed_count,
            ai_completed=ai_count,
            status="failed",
            error_message=str(e)
        )
    finally:
        with scrape_lock:
            is_scraping_active = False

@router.post("", summary="Start a new paper scraping run")
def start_scrape(
    request: ScrapeRequest,
    background_tasks: BackgroundTasks
):
    global is_scraping_active
    db = DBService()
    arxiv = ArxivService()
    gemini = GeminiService()
    trend = TrendService(db)

    with scrape_lock:
        if is_scraping_active:
            raise HTTPException(status_code=409, detail="A scraping run is already in progress.")
        is_scraping_active = True

    # Categories to scrape
    categories = request.categories
    if not categories:
        categories = [c["id"] for c in db.get_categories(enabled_only=True)]

    run_id = db.create_scrape_run(
        categories=categories,
        requested_count=request.max_results
    )

    background_tasks.add_task(
        perform_scrape_task,
        db=db,
        arxiv=arxiv,
        gemini=gemini,
        trend=trend,
        run_id=run_id,
        categories=categories,
        max_results=request.max_results,
        date_window=request.date_window,
        start_date=request.start_date,
        end_date=request.end_date,
        sort_by=request.sort_by,
        sort_order=request.sort_order,
        run_ai=request.run_ai
    )

    return {
        "message": "Scraping task initiated successfully.",
        "run_id": run_id,
        "categories": categories,
        "requested_count": request.max_results
    }

@router.get("/status", summary="Check if scraping is active")
def get_scrape_status():
    global is_scraping_active
    return {"is_active": is_scraping_active}

@router.get("/runs", summary="Get scrape run history")
def get_scrape_runs(limit: int = Query(20, ge=1, le=100)):
    db = DBService()
    return db.get_scrape_runs(limit=limit)
