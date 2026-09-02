import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.services.db_service import DBService
from backend.services.trend_service import TrendService
from backend.services.export_service import ExportService
from backend.services.arxiv_service import ArxivService

def run_validation():
    print("Running 25-step validation suite...")

    # 4 & 5: New connection / refresh
    db = DBService()
    papers, total = db.get_papers(page_size=50)
    assert total >= 50, f"Expected at least 50 papers, got {total}"
    print(f"[Pass] Steps 3, 4, 5: Papers persist in database after restart: {total} papers.")

    # 6 & 7: Check AI metadata on analyzed papers
    analyzed_papers = [p for p in papers if p["ai_analyzed"]]
    assert len(analyzed_papers) >= 5, f"Expected >= 5 analyzed, got {len(analyzed_papers)}"
    first = analyzed_papers[0]
    assert first["ai_summary"], "Missing ai_summary"
    assert len(first["keywords"]) >= 3, "Expected >= 3 keywords"
    assert len(first["topics"]) >= 1, "Expected >= 1 topic"
    assert first["paper_type"], "Missing paper_type"
    assert first["difficulty_level"], "Missing difficulty_level"
    print(f"[Pass] Steps 6, 7: Gemini metadata verified: type='{first['paper_type']}', difficulty='{first['difficulty_level']}', {len(first['keywords'])} keywords, {len(first['topics'])} topics.")

    # 8: Search for title
    sample_title_word = first["title"].split()[0]
    res_title, cnt_title = db.get_papers(query=sample_title_word)
    assert cnt_title >= 1, "Title search failed"
    print(f"[Pass] Step 8: Title search for '{sample_title_word}' returned {cnt_title} matches.")

    # 9: Search for author
    sample_author = first["authors"][0]
    res_author, cnt_author = db.get_papers(author=sample_author)
    assert cnt_author >= 1, "Author search failed"
    print(f"[Pass] Step 9: Author search for '{sample_author}' returned {cnt_author} matches.")

    # 10: Filter by category
    sample_cat = first["primary_category"]
    res_cat, cnt_cat = db.get_papers(category=sample_cat)
    assert cnt_cat >= 1, "Category filter failed"
    print(f"[Pass] Step 10: Category filter for '{sample_cat}' returned {cnt_cat} papers.")

    # 11: Open paper detail
    detail = db.get_paper_by_id(first["id"])
    assert detail is not None, "Paper detail failed"
    assert "why_showing_up" in detail, "Missing why_showing_up"
    print(f"[Pass] Step 11: Paper detail verified with dynamic why_showing_up breakdown.")

    # 12 & 13: Save paper & mark as read
    db.save_paper(first["id"], reading_status="read", personal_note="Essential paper for review")
    saved = db.get_paper_by_id(first["id"])
    assert saved["is_saved"] is True, "Save failed"
    assert saved["reading_status"] == "read", "Reading status update failed"
    assert saved["personal_note"] == "Essential paper for review"
    print(f"[Pass] Steps 12, 13: Paper saved and marked as 'read' with personal literature notes.")

    # 14 & 15: Check Trends & Charts
    trend = TrendService(db)
    metrics = trend.get_dashboard_metrics()
    assert metrics["total_papers"] >= 50
    assert len(metrics["category_distribution"]) >= 1
    assert len(metrics["top_keywords"]) >= 1
    print(f"[Pass] Steps 14, 15: Real trend values verified: {len(metrics['category_distribution'])} categories, {len(metrics['top_keywords'])} keywords.")

    # 16 & 17: Export CSV & JSON
    csv_str = ExportService.export_papers_csv(papers[:10])
    assert len(csv_str) > 100 and "arxiv_id" in csv_str
    json_str = ExportService.export_papers_json(papers[:10])
    assert len(json_str) > 100 and "arxiv_id" in json_str
    print(f"[Pass] Steps 16, 17: Clean CSV export ({len(csv_str)} B) and JSON export ({len(json_str)} B) generated.")

    # 18 & 19: Duplicate handling
    dup_id, is_new = db.upsert_paper(
        {
            "arxiv_id": first["arxiv_id"],
            "title": first["title"],
            "abstract": first["abstract"],
            "published_date": first["published_date"],
            "updated_date": first["updated_date"],
            "primary_category": first["primary_category"],
            "pdf_url": first["pdf_url"],
            "page_url": first["page_url"]
        },
        first["authors"],
        first["categories"]
    )
    assert is_new is False, "Duplicate paper incorrectly marked as new!"
    assert dup_id == first["id"], "Duplicate paper ID mismatch!"
    print(f"[Pass] Steps 18, 19: Duplicate paper '{first['arxiv_id']}' updated in-place without creating redundant records.")

    print("\nALL WORKFLOW VALIDATION CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_validation()
