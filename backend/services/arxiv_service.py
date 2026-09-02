import re
import html
import time
import logging
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
import httpx
from backend.config import ARXIV_REQUEST_DELAY

logger = logging.getLogger("arxiv_service")

# Atom & arXiv XML namespaces
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom"
}

class ArxivService:
    BASE_URL = "http://export.arxiv.org/api/query"

    def __init__(self, delay_seconds: float = ARXIV_REQUEST_DELAY):
        self.delay_seconds = delay_seconds
        self.last_request_time: float = 0.0

    def _wait_for_rate_limit(self):
        """Respects arXiv's requested 3-second delay between queries."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay_seconds:
            time.sleep(self.delay_seconds - elapsed)
        self.last_request_time = time.time()

    @staticmethod
    def clean_text(text: Optional[str]) -> str:
        """Cleans excessive whitespace while preserving math notation and formatting."""
        if not text:
            return ""
        # Decode HTML entities like &lt;, &gt;, &amp;, &#x27;
        cleaned = html.unescape(text)
        # Normalize carriage returns and tabs
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        # Collapse multiple spaces or newlines within paragraphs
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    @staticmethod
    def parse_arxiv_id(raw_id: str) -> str:
        """Extracts clean arXiv identifier without version or http prefix."""
        # e.g., http://arxiv.org/abs/2301.01234v2 -> 2301.01234
        if not raw_id:
            return ""
        match = re.search(r"(\d{4}\.\d{4,5}|[a-zA-Z\-]+(?:\.[a-zA-Z]+)?\/\d{7})(?:v\d+)?", raw_id)
        if match:
            return match.group(1)
        # Fallback: strip URL
        return raw_id.split("/abs/")[-1].split("v")[0].strip()

    def parse_entry(self, entry: ET.Element) -> Optional[Dict[str, Any]]:
        """Parses an Atom XML entry element into a structured dictionary."""
        try:
            raw_id = entry.findtext("atom:id", default="", namespaces=NAMESPACES)
            arxiv_id = self.parse_arxiv_id(raw_id)
            if not arxiv_id:
                return None

            raw_title = entry.findtext("atom:title", default="", namespaces=NAMESPACES)
            title = self.clean_text(raw_title)

            raw_summary = entry.findtext("atom:summary", default="", namespaces=NAMESPACES)
            abstract = self.clean_text(raw_summary)

            published_date = entry.findtext("atom:published", default="", namespaces=NAMESPACES).strip()
            updated_date = entry.findtext("atom:updated", default="", namespaces=NAMESPACES).strip()

            # Authors
            authors = []
            for author_elem in entry.findall("atom:author", namespaces=NAMESPACES):
                name = author_elem.findtext("atom:name", default="", namespaces=NAMESPACES).strip()
                if name and name not in authors:
                    authors.append(name)

            # Categories
            categories = []
            primary_category = ""
            primary_cat_elem = entry.find("arxiv:primary_category", namespaces=NAMESPACES)
            if primary_cat_elem is not None:
                primary_category = primary_cat_elem.get("term", "").strip()

            for cat_elem in entry.findall("atom:category", namespaces=NAMESPACES):
                term = cat_elem.get("term", "").strip()
                if term and term not in categories:
                    categories.append(term)

            if not primary_category and categories:
                primary_category = categories[0]

            # Links (PDF & Abstract page)
            page_url = f"https://arxiv.org/abs/{arxiv_id}"
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            for link in entry.findall("atom:link", namespaces=NAMESPACES):
                rel = link.get("rel")
                title_attr = link.get("title")
                href = link.get("href")
                if title_attr == "pdf" or rel == "related" and href and href.endswith(".pdf"):
                    pdf_url = href
                elif rel == "alternate" and href:
                    page_url = href

            # Optional arXiv extensions
            doi = entry.findtext("arxiv:doi", default="", namespaces=NAMESPACES).strip() or None
            journal_ref = entry.findtext("arxiv:journal_ref", default="", namespaces=NAMESPACES).strip() or None
            comment = self.clean_text(entry.findtext("arxiv:comment", default="", namespaces=NAMESPACES)) or None

            return {
                "paper": {
                    "arxiv_id": arxiv_id,
                    "title": title,
                    "abstract": abstract,
                    "published_date": published_date,
                    "updated_date": updated_date,
                    "primary_category": primary_category,
                    "doi": doi,
                    "journal_ref": journal_ref,
                    "pdf_url": pdf_url,
                    "page_url": page_url,
                    "comment": comment
                },
                "authors": authors,
                "categories": categories
            }
        except Exception as e:
            logger.error(f"Error parsing entry: {e}")
            return None

    def build_query(
        self,
        categories: Optional[List[str]] = None,
        date_window: str = "7d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search_term: Optional[str] = None
    ) -> str:
        """Constructs an arXiv search query string."""
        query_parts = []

        if categories:
            cat_query = " OR ".join([f"cat:{c.strip()}" for c in categories if c.strip()])
            if cat_query:
                query_parts.append(f"({cat_query})")

        if search_term:
            query_parts.append(f"all:{search_term.strip()}")

        # arXiv API supports date queries in format: submittedDate:[YYYYMMDDTTTT TO YYYYMMDDTTTT]
        now = datetime.now(timezone.utc)
        filter_start = None
        filter_end = now

        if date_window == "24h":
            filter_start = now - timedelta(days=1)
        elif date_window == "3d":
            filter_start = now - timedelta(days=3)
        elif date_window == "7d":
            filter_start = now - timedelta(days=7)
        elif date_window == "30d":
            filter_start = now - timedelta(days=30)
        elif date_window == "custom" and start_date:
            try:
                filter_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            except Exception:
                pass
            if end_date:
                try:
                    filter_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                except Exception:
                    pass

        # If date filtering is specified, format as submittedDate:[start TO end]
        # arXiv uses YYYYMMDDHHMM (or YYYYMMDD)
        if filter_start:
            s_str = filter_start.strftime("%Y%m%d%H%M")
            e_str = filter_end.strftime("%Y%m%d%H%M")
            query_parts.append(f"submittedDate:[{s_str} TO {e_str}]")

        if not query_parts:
            # Default query: AI or ML
            return "cat:cs.AI OR cat:cs.LG"

        return " AND ".join(query_parts)

    def fetch_papers(
        self,
        categories: Optional[List[str]] = None,
        max_results: int = 50,
        date_window: str = "7d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        sort_by: str = "submittedDate",
        sort_order: str = "descending"
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Fetches papers from the arXiv API.
        Returns (list_of_parsed_records, total_results).
        """
        self._wait_for_rate_limit()

        search_query = self.build_query(categories, date_window, start_date, end_date)
        params = {
            "search_query": search_query,
            "start": 0,
            "max_results": min(max_results, 300),
            "sortBy": sort_by,
            "sortOrder": sort_order
        }

        url = f"{self.BASE_URL}?{urllib.parse.urlencode(params)}"
        logger.info(f"Querying arXiv API: {url}")

        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code != 200:
                raise RuntimeError(f"arXiv API error: HTTP {response.status_code} - {response.text[:200]}")

            xml_content = response.text

        root = ET.fromstring(xml_content)
        
        # Total results reported by arXiv opensearch
        total_elem = root.find("{http://a9.com/-/spec/opensearch/1.1/}totalResults")
        total_results = int(total_elem.text) if total_elem is not None and total_elem.text else 0

        parsed_records = []
        for entry in root.findall("atom:entry", namespaces=NAMESPACES):
            record = self.parse_entry(entry)
            if record:
                parsed_records.append(record)

        return parsed_records, total_results
