import pytest
import tempfile
import os
from backend.services.db_service import DBService

@pytest.fixture
def temp_db():
    temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_file.close()
    db = DBService(db_path=temp_file.name)
    yield db
    if os.path.exists(temp_file.name):
        try:
            os.remove(temp_file.name)
        except Exception:
            pass

def test_db_init_and_categories(temp_db):
    cats = temp_db.get_categories()
    assert len(cats) >= 9
    cat_ids = [c["id"] for c in cats]
    assert "cs.AI" in cat_ids
    assert "cs.LG" in cat_ids

def test_upsert_new_and_duplicate(temp_db):
    paper_data = {
        "arxiv_id": "2401.99999",
        "title": "Initial Title for Test Paper",
        "abstract": "Initial abstract describing testing methodology.",
        "published_date": "2024-01-01T00:00:00Z",
        "updated_date": "2024-01-01T00:00:00Z",
        "primary_category": "cs.AI",
        "pdf_url": "https://arxiv.org/pdf/2401.99999.pdf",
        "page_url": "https://arxiv.org/abs/2401.99999",
        "doi": None,
        "journal_ref": None,
        "comment": None
    }
    authors = ["Alice Smith", "Bob Jones"]
    categories = ["cs.AI", "cs.LG"]

    pid1, is_new1 = temp_db.upsert_paper(paper_data, authors, categories)
    assert is_new1 is True
    assert pid1 > 0

    # Upsert same paper with updated title
    paper_data["title"] = "Updated Title for Test Paper"
    pid2, is_new2 = temp_db.upsert_paper(paper_data, authors, categories)
    assert is_new2 is False
    assert pid1 == pid2

    paper = temp_db.get_paper_by_id(pid1)
    assert paper["title"] == "Updated Title for Test Paper"
    assert len(paper["authors"]) == 2

def test_ai_analysis_storage(temp_db):
    paper_data = {
        "arxiv_id": "2402.11111",
        "title": "Diffusion for Molecule Design",
        "abstract": "We explore score-based generative models for molecular property optimization.",
        "published_date": "2024-02-01T00:00:00Z",
        "updated_date": "2024-02-01T00:00:00Z",
        "primary_category": "cs.LG",
        "pdf_url": "https://arxiv.org/pdf/2402.11111.pdf",
        "page_url": "https://arxiv.org/abs/2402.11111"
    }
    pid, _ = temp_db.upsert_paper(paper_data, ["Dr. Chem"], ["cs.LG"])

    analysis = {
        "summary": "This paper proposes molecular diffusion models. It achieves strong sample validity.",
        "keywords": ["diffusion models", "molecular chemistry", "generative ai"],
        "topics": ["Diffusion Models", "Machine Learning"],
        "paper_type": "new method",
        "technical_difficulty": "advanced",
        "potential_impact_area": "Drug Discovery"
    }
    temp_db.update_paper_ai_analysis(pid, analysis)

    paper = temp_db.get_paper_by_id(pid)
    assert paper["ai_analyzed"] is True
    assert paper["paper_type"] == "new method"
    assert "diffusion models" in paper["keywords"]
    assert "Diffusion Models" in paper["topics"]

def test_saved_papers_workflow(temp_db):
    paper_data = {
        "arxiv_id": "2403.22222",
        "title": "Saved Paper Testing",
        "abstract": "Testing bookmarks and reading status functionality.",
        "published_date": "2024-03-01T00:00:00Z",
        "updated_date": "2024-03-01T00:00:00Z",
        "primary_category": "cs.CV",
        "pdf_url": "https://arxiv.org/pdf/2403.22222.pdf",
        "page_url": "https://arxiv.org/abs/2403.22222"
    }
    pid, _ = temp_db.upsert_paper(paper_data, ["John Doe"], ["cs.CV"])

    # Save
    temp_db.save_paper(pid, reading_status="unread", personal_note="Must read for literature review")
    paper = temp_db.get_paper_by_id(pid)
    assert paper["is_saved"] is True
    assert paper["reading_status"] == "unread"
    assert paper["personal_note"] == "Must read for literature review"

    # Update reading status
    temp_db.update_saved_paper(pid, reading_status="read", personal_note="Completed reading.")
    paper = temp_db.get_paper_by_id(pid)
    assert paper["reading_status"] == "read"

    # Remove
    temp_db.remove_saved_paper(pid)
    paper = temp_db.get_paper_by_id(pid)
    assert paper["is_saved"] is False
