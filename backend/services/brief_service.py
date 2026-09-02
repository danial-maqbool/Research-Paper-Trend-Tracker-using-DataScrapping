import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from backend.services.db_service import DBService
from backend.services.gemini_service import GeminiService

logger = logging.getLogger("brief_service")

class BriefService:
    def __init__(self, db_service: DBService, gemini_service: GeminiService):
        self.db = db_service
        self.gemini = gemini_service

    def generate_daily_brief(self) -> Dict[str, Any]:
        """
        Generates a rigorous Daily Research Brief based on stored papers and trend statistics.
        """
        now = datetime.now(timezone.utc)
        today_date = now.strftime("%B %d, %Y")
        recent_cutoff = (now - timedelta(days=3)).isoformat()

        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Total papers in recent window
            cursor.execute("SELECT COUNT(*) as c FROM papers WHERE published_date >= ?", (recent_cutoff,))
            recent_count = cursor.fetchone()["c"]

            # 2. Top categories
            cursor.execute(
                """
                SELECT primary_category, COUNT(*) as count
                FROM papers
                WHERE published_date >= ?
                GROUP BY primary_category
                ORDER BY count DESC
                LIMIT 5
                """,
                (recent_cutoff,)
            )
            top_categories = [{"category": r["primary_category"], "count": r["count"]} for r in cursor.fetchall()]

            # 3. Fastest-growing topic
            cursor.execute(
                """
                SELECT t.name, COUNT(p.id) as count
                FROM topics t
                JOIN paper_topics pt ON pt.topic_id = t.id
                JOIN papers p ON p.id = pt.paper_id
                WHERE p.published_date >= ?
                GROUP BY t.id
                ORDER BY count DESC
                LIMIT 1
                """,
                (recent_cutoff,)
            )
            top_topic_row = cursor.fetchone()
            fastest_topic = top_topic_row["name"] if top_topic_row else "Machine Learning Systems"

            # 4. Top 5 notable papers by trend_score
            cursor.execute(
                """
                SELECT p.id, p.title, p.arxiv_id, p.primary_category, p.trend_score, p.ai_summary, p.paper_type
                FROM papers p
                WHERE p.published_date >= ?
                ORDER BY p.trend_score DESC, p.published_date DESC
                LIMIT 5
                """,
                (recent_cutoff,)
            )
            notable_papers = [dict(r) for r in cursor.fetchall()]

            # 5. Top keywords
            cursor.execute(
                """
                SELECT k.keyword, COUNT(pk.paper_id) as count
                FROM keywords k
                JOIN paper_keywords pk ON pk.keyword_id = k.id
                JOIN papers p ON p.id = pk.paper_id
                WHERE p.published_date >= ?
                GROUP BY k.id
                ORDER BY count DESC
                LIMIT 8
                """,
                (recent_cutoff,)
            )
            top_keywords = [r["keyword"] for r in cursor.fetchall()]

        # Generate intelligent synthesis narrative
        narrative = self._synthesize_narrative(
            today_date, recent_count, top_categories, fastest_topic, notable_papers, top_keywords
        )

        return {
            "date": today_date,
            "period": "Last 72 Hours",
            "new_papers_count": recent_count,
            "top_categories": top_categories,
            "fastest_growing_topic": fastest_topic,
            "notable_papers": notable_papers,
            "top_keywords": top_keywords,
            "executive_summary": narrative
        }

    def _synthesize_narrative(
        self,
        date_str: str,
        count: int,
        categories: List[Dict[str, Any]],
        top_topic: str,
        papers: List[Dict[str, Any]],
        keywords: List[str]
    ) -> str:
        """Generates executive summary using Gemini or algorithmic template."""
        cat_summary = ", ".join([f"{c['category']} ({c['count']} papers)" for c in categories[:3]])
        kw_summary = ", ".join(keywords[:5]) if keywords else "deep learning, optimization, evaluation"

        if self.gemini.client:
            prompt = f"""
Write a 3-paragraph executive daily research intelligence brief for machine learning researchers for {date_str}.
Statistics from our collected database:
- Total new preprints in last 72 hours: {count}
- Leading research categories: {cat_summary}
- Dominant trending topic: {top_topic}
- Key emerging keywords: {kw_summary}
- Notable high-velocity papers: {', '.join([p['title'] for p in papers[:3]])}

Strict constraint: Report only on these verified facts. Keep tone objective, concise, and academic.
"""
            try:
                resp = self.gemini.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                if resp and resp.text:
                    return resp.text.strip()
            except Exception as e:
                logger.warning(f"Could not generate Gemini brief: {e}")

        # Deterministic fallback narrative
        top_paper_titles = " and ".join([f"'{p['title']}'" for p in papers[:2]]) if papers else "emerging preprint releases"
        return (
            f"During the last 72 hours, {count} new research preprints were tracked across arXiv computer science disciplines. "
            f"Research activity was strongly concentrated in {cat_summary or 'Artificial Intelligence and Machine Learning'}. "
            f"The fastest growing area of investigation is {top_topic}, characterized by rapid iterations in {kw_summary}. "
            f"Key high-velocity publications include {top_paper_titles}, demonstrating continued advancement across foundation model architectures and empirical evaluations."
        )
