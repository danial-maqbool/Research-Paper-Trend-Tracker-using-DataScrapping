import pytest
import tempfile
import os
from datetime import datetime, timezone, timedelta
from backend.services.db_service import DBService
from backend.services.trend_service import TrendService

@pytest.fixture
def populated_db():
    temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_file.close()
    db = DBService(db_path=temp_file.name)

    now = datetime.now(timezone.utc)
    # Insert 3 papers
    p1 = {
        "arxiv_id": "2401.00001",
        "title": "Recent Vision Transformer Advance",
        "abstract": "A breakthrough in transformer vision models.",
        "published_date": (now - timedelta(days=1)).isoformat(),
        "updated_date": (now - timedelta(days=1)).isoformat(),
        "primary_category": "cs.CV",
        "pdf_url": "https://arxiv.org/pdf/2401.00001.pdf",
        "page_url": "https://arxiv.org/abs/2401.00001"
    }
    pid1, _ = db.upsert_paper(p1, ["Yann LeCun"], ["cs.CV"])
    db.update_paper_ai_analysis(pid1, {
        "summary": "Novel vision transformer.",
        "keywords": ["vision transformer", "attention"],
        "topics": ["Computer Vision", "Transformers"],
        "paper_type": "new method",
        "technical_difficulty": "intermediate",
        "potential_impact_area": "Perception"
    })

    p2 = {
        "arxiv_id": "2401.00002",
        "title": "Older NLP Paper",
        "abstract": "Analysis of language syntax representations.",
        "published_date": (now - timedelta(days=25)).isoformat(),
        "updated_date": (now - timedelta(days=25)).isoformat(),
        "primary_category": "cs.CL",
        "pdf_url": "https://arxiv.org/pdf/2401.00002.pdf",
        "page_url": "https://arxiv.org/abs/2401.00002"
    }
    pid2, _ = db.upsert_paper(p2, ["Noam Chomsky"], ["cs.CL"])
    db.update_paper_ai_analysis(pid2, {
        "summary": "Syntax study.",
        "keywords": ["syntax", "grammar"],
        "topics": ["Computation and Language"],
        "paper_type": "theoretical work",
        "technical_difficulty": "advanced",
        "potential_impact_area": "Linguistics"
    })

    yield db
    if os.path.exists(temp_file.name):
        try:
            os.remove(temp_file.name)
        except Exception:
            pass

def test_trend_calculation_and_freshness(populated_db):
    trend = TrendService(populated_db)
    trend.calculate_paper_scores()

    papers, _ = populated_db.get_papers(sort_by="newest")
    assert len(papers) == 2

    # Recent paper should have higher freshness and trend score than older paper
    recent_paper = next(p for p in papers if p["arxiv_id"] == "2401.00001")
    older_paper = next(p for p in papers if p["arxiv_id"] == "2401.00002")

    assert recent_paper["freshness_score"] > older_paper["freshness_score"]
    assert recent_paper["trend_score"] >= older_paper["trend_score"]

def test_dashboard_metrics(populated_db):
    trend = TrendService(populated_db)
    metrics = trend.get_dashboard_metrics()

    assert metrics["total_papers"] == 2
    assert metrics["unique_authors_count"] == 2
    assert len(metrics["category_distribution"]) >= 2
    assert len(metrics["top_keywords"]) >= 2

def test_topic_detail_and_comparison(populated_db):
    trend = TrendService(populated_db)
    detail = trend.get_topic_detail("Computer Vision")

    assert detail is not None
    assert detail["name"] == "Computer Vision"
    assert detail["total_papers"] >= 1

    comparison = trend.compare_topics("Computer Vision", "Computation and Language")
    assert "comparison" in comparison
    assert "topic_a" in comparison
    assert "topic_b" in comparison
