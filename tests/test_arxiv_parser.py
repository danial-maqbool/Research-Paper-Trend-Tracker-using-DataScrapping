import pytest
import xml.etree.ElementTree as ET
from backend.services.arxiv_service import ArxivService

SAMPLE_ENTRY_XML = r"""
<entry xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
    <id>http://arxiv.org/abs/2401.12345v2</id>
    <title> Attention Is All You Need: Scalable Transformers &amp; $O(N^2)$ Complexity </title>
    <summary>
        This paper introduces a novel architecture that relies entirely on an attention mechanism.
        We demonstrate state-of-the-art results on WMT 2014 English-to-German translation.
        Mathematical bound: $\mathcal{O}(N \log N)$.
    </summary>
    <published>2024-01-15T12:00:00Z</published>
    <updated>2024-01-20T14:30:00Z</updated>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <author><name>Ashish Vaswani</name></author>
    <arxiv:primary_category term="cs.CL"/>
    <category term="cs.CL"/>
    <category term="cs.AI"/>
    <link rel="alternate" href="https://arxiv.org/abs/2401.12345"/>
    <link rel="related" type="application/pdf" title="pdf" href="https://arxiv.org/pdf/2401.12345.pdf"/>
</entry>
"""

def test_parse_arxiv_id():
    service = ArxivService()
    assert service.parse_arxiv_id("http://arxiv.org/abs/2401.12345v2") == "2401.12345"
    assert service.parse_arxiv_id("http://arxiv.org/abs/math/0702001") == "math/0702001"
    assert service.parse_arxiv_id("2305.18290v1") == "2305.18290"

def test_clean_text():
    raw = r"  Deep   Learning  &amp;   Transformers: \r\n\r\n\r\n Bounds on $\mathcal{O}(N)$  "
    cleaned = ArxivService.clean_text(raw)
    assert "&amp;" not in cleaned
    assert "&" in cleaned
    assert r"$\mathcal{O}(N)$" in cleaned
    assert "   " not in cleaned

def test_parse_entry():
    service = ArxivService()
    root = ET.fromstring(SAMPLE_ENTRY_XML)
    parsed = service.parse_entry(root)

    assert parsed is not None
    paper = parsed["paper"]
    assert paper["arxiv_id"] == "2401.12345"
    assert "Attention Is All You Need" in paper["title"]
    assert "Ashish Vaswani" in parsed["authors"]
    assert len(parsed["authors"]) == 2 # Duplicate removed
    assert paper["primary_category"] == "cs.CL"
    assert "cs.AI" in parsed["categories"]
    assert paper["pdf_url"] == "https://arxiv.org/pdf/2401.12345.pdf"

def test_build_query():
    service = ArxivService()
    q = service.build_query(categories=["cs.AI", "cs.LG"], date_window="all")
    assert "cat:cs.AI" in q
    assert "cat:cs.LG" in q
