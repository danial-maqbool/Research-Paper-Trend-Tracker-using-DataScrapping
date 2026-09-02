import csv
import io
import json
from typing import List, Dict, Any

class ExportService:
    @staticmethod
    def export_papers_csv(papers: List[Dict[str, Any]]) -> str:
        """Generates a clean CSV string from paper records."""
        output = io.StringIO()
        fieldnames = [
            "arxiv_id", "title", "authors", "published_date", "updated_date",
            "primary_category", "categories", "doi", "paper_type", "difficulty_level",
            "impact_area", "trend_score", "pdf_url", "page_url", "ai_summary", "abstract"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()

        for p in papers:
            writer.writerow({
                "arxiv_id": p.get("arxiv_id", ""),
                "title": p.get("title", ""),
                "authors": "; ".join(p.get("authors", [])),
                "published_date": p.get("published_date", ""),
                "updated_date": p.get("updated_date", ""),
                "primary_category": p.get("primary_category", ""),
                "categories": "; ".join(p.get("categories", [])),
                "doi": p.get("doi", "") or "",
                "paper_type": p.get("paper_type", "") or "",
                "difficulty_level": p.get("difficulty_level", "") or "",
                "impact_area": p.get("impact_area", "") or "",
                "trend_score": p.get("trend_score", 0.0),
                "pdf_url": p.get("pdf_url", ""),
                "page_url": p.get("page_url", ""),
                "ai_summary": p.get("ai_summary", "") or "",
                "abstract": p.get("abstract", "")
            })

        return output.getvalue()

    @staticmethod
    def export_papers_json(papers: List[Dict[str, Any]]) -> str:
        """Generates a formatted JSON string from paper records."""
        return json.dumps(papers, indent=2, ensure_ascii=False)

    @staticmethod
    def export_trends_json(trends_data: Dict[str, Any]) -> str:
        """Generates structured JSON for trend analytics."""
        return json.dumps(trends_data, indent=2, ensure_ascii=False)

    @staticmethod
    def export_trends_csv(topics: List[Dict[str, Any]], keywords: List[Dict[str, Any]]) -> str:
        """Generates CSV summary of trending topics and keywords."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Type", "Name", "Current Count", "Prior Count", "Percentage Change", "Total Tracked"])

        for t in topics:
            writer.writerow([
                "Topic", t.get("name"), t.get("current_count"), t.get("prior_count"),
                f"{t.get('percentage_change')}%", t.get("total_count")
            ])

        for k in keywords:
            writer.writerow([
                "Keyword", k.get("keyword"), k.get("current_count"), k.get("prior_count"),
                f"{k.get('percentage_change')}%", k.get("total_count")
            ])

        return output.getvalue()
