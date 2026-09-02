import pytest
import tempfile
import os
import xml.etree.ElementTree as ET
from backend.services.db_service import DBService
from backend.services.arxiv_service import ArxivService
from backend.services.trend_service import TrendService
from backend.services.export_service import ExportService

MOCK_ARXIV_XML = """
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
    <entry>
        <id>http://arxiv.org/abs/2405.00010v1</id>
        <title>Self-Reflective Autonomous Agents for Complex Code Generation</title>
        <summary>
            Autonomous agents using iterative tool reflection show high software synthesis capabilities.
            We benchmark our multi-agent framework across HumanEval and SWE-bench.
        </summary>
        <published>2024-05-01T10:00:00Z</published>
        <updated>2024-05-01T10:00:00Z</updated>
        <author><name>Danial Maqbool</name></author>
        <author><name>Co-Researcher</name></author>
        <arxiv:primary_category term="cs.AI"/>
        <category term="cs.AI"/>
        <category term="cs.SE"/>
        <link rel="alternate" href="https://arxiv.org/abs/2405.00010"/>
        <link rel="related" type="application/pdf" title="pdf" href="https://arxiv.org/pdf/2405.00010.pdf"/>
    </entry>
</feed>
"""

def test_full_pipeline_fetch_store_retrieve_export():
    # 1. Setup isolated database
    temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_file.close()
    db = DBService(db_path=temp_file.name)
    arxiv = ArxivService()
    trend = TrendService(db)

    # 2. Simulate arXiv parsing
    root = ET.fromstring(MOCK_ARXIV_XML)
    entry = root.find("{http://www.w3.org/2005/Atom}entry")
    record = arxiv.parse_entry(entry)
    assert record is not None

    # 3. Store in Database
    paper_id, is_new = db.upsert_paper(
        paper=record["paper"],
        authors=record["authors"],
        categories=record["categories"]
    )
    assert is_new is True
    assert paper_id > 0

    # 4. Add AI Analysis
    db.update_paper_ai_analysis(paper_id, {
        "summary": "Multi-agent autonomous systems enhance code generation benchmarks.",
        "keywords": ["autonomous agents", "code generation", "reflection"],
        "topics": ["Autonomous Agents", "Artificial Intelligence"],
        "paper_type": "system",
        "technical_difficulty": "intermediate",
        "potential_impact_area": "Software Engineering"
    })

    # 5. Score calculation
    trend.calculate_paper_scores()

    # 6. Retrieve papers with search & filters
    retrieved, total = db.get_papers(query="Autonomous Agents", category="cs.AI")
    assert total == 1
    assert retrieved[0]["arxiv_id"] == "2405.00010"
    assert "Danial Maqbool" in retrieved[0]["authors"]
    assert retrieved[0]["ai_analyzed"] is True

    # 7. Bookmark paper
    db.save_paper(paper_id, reading_status="reading", personal_note="Key paper for agentic workflow")
    saved_paper = db.get_paper_by_id(paper_id)
    assert saved_paper["is_saved"] is True
    assert saved_paper["reading_status"] == "reading"

    # 8. Export CSV & JSON
    csv_out = ExportService.export_papers_csv(retrieved)
    assert "2405.00010" in csv_out
    assert "Danial Maqbool" in csv_out

    json_out = ExportService.export_papers_json(retrieved)
    assert "Self-Reflective Autonomous Agents" in json_out

    # Clean up
    if os.path.exists(temp_file.name):
        try:
            os.remove(temp_file.name)
        except Exception:
            pass
