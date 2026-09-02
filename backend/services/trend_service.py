import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import sqlite3

logger = logging.getLogger("trend_service")

class TrendService:
    def __init__(self, db_service):
        self.db = db_service

    def calculate_paper_scores(self):
        """
        Calculates and updates freshness_score and trend_score for all papers.
        Formula:
        - Freshness = exp(-days_since_pub / 14) * 100
        - Category Velocity = (recent_cat_count / max(1, baseline_cat_count)) * 50
        - Trend Score = 0.5 * Freshness + 0.3 * Category Velocity + 0.2 * Keyword Activity
        """
        now = datetime.now(timezone.utc)
        recent_cutoff = (now - timedelta(days=7)).isoformat()
        prior_cutoff = (now - timedelta(days=14)).isoformat()

        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Compute category velocities
            cursor.execute(
                """
                SELECT primary_category,
                       SUM(CASE WHEN published_date >= ? THEN 1 ELSE 0 END) as recent_count,
                       SUM(CASE WHEN published_date >= ? AND published_date < ? THEN 1 ELSE 0 END) as prior_count
                FROM papers
                GROUP BY primary_category
                """,
                (recent_cutoff, prior_cutoff, recent_cutoff)
            )
            cat_velocity: Dict[str, float] = {}
            for row in cursor.fetchall():
                recent_c = row["recent_count"]
                prior_c = row["prior_count"]
                ratio = recent_c / max(1, prior_c)
                cat_velocity[row["primary_category"]] = min(100.0, ratio * 50.0)

            # 2. Compute keyword frequency in recent papers
            cursor.execute(
                """
                SELECT k.id, COUNT(pk.paper_id) as freq
                FROM keywords k
                JOIN paper_keywords pk ON pk.keyword_id = k.id
                JOIN papers p ON p.id = pk.paper_id
                WHERE p.published_date >= ?
                GROUP BY k.id
                """,
                (recent_cutoff,)
            )
            keyword_freq = {row["id"]: row["freq"] for row in cursor.fetchall()}

            # 3. Update each paper
            cursor.execute("SELECT id, published_date, primary_category FROM papers")
            papers = cursor.fetchall()

            for p in papers:
                pid = p["id"]
                p_date_str = p["published_date"]
                cat = p["primary_category"]

                # Days since published
                try:
                    p_date = datetime.fromisoformat(p_date_str.replace("Z", "+00:00"))
                    days = max(0.0, (now - p_date).total_seconds() / 86400.0)
                except Exception:
                    days = 7.0

                freshness = math.exp(-days / 14.0) * 100.0
                c_vel = cat_velocity.get(cat, 50.0)

                # Keyword activity
                cursor.execute("SELECT keyword_id FROM paper_keywords WHERE paper_id = ?", (pid,))
                k_ids = [r["keyword_id"] for r in cursor.fetchall()]
                kw_score = sum(keyword_freq.get(kid, 0) for kid in k_ids)
                kw_component = min(100.0, kw_score * 15.0)

                trend_score = round((0.50 * freshness) + (0.30 * c_vel) + (0.20 * kw_component), 1)

                cursor.execute(
                    "UPDATE papers SET freshness_score = ?, trend_score = ? WHERE id = ?",
                    (round(freshness, 2), trend_score, pid)
                )

            conn.commit()

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Returns aggregated dashboard KPIs and charts."""
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        recent_7d = (now - timedelta(days=7)).isoformat()
        prior_7d = (now - timedelta(days=14)).isoformat()

        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Total papers
            cursor.execute("SELECT COUNT(*) as c FROM papers")
            total_papers = cursor.fetchone()["c"]

            # Papers today
            cursor.execute("SELECT COUNT(*) as c FROM papers WHERE published_date LIKE ?", (f"{today_str}%",))
            papers_today = cursor.fetchone()["c"]

            # Active categories
            cursor.execute("SELECT COUNT(DISTINCT primary_category) as c FROM papers")
            active_categories_count = cursor.fetchone()["c"]

            # Unique authors
            cursor.execute("SELECT COUNT(*) as c FROM authors")
            unique_authors_count = cursor.fetchone()["c"]

            # Fastest-growing topic (comparing last 7d vs prior 7d)
            cursor.execute(
                """
                SELECT t.name,
                       SUM(CASE WHEN p.published_date >= ? THEN 1 ELSE 0 END) as recent_count,
                       SUM(CASE WHEN p.published_date >= ? AND p.published_date < ? THEN 1 ELSE 0 END) as prior_count
                FROM topics t
                JOIN paper_topics pt ON pt.topic_id = t.id
                JOIN papers p ON p.id = pt.paper_id
                GROUP BY t.id
                HAVING recent_count > 0
                ORDER BY (CAST(recent_count AS REAL) / MAX(1, prior_count)) DESC, recent_count DESC
                LIMIT 1
                """,
                (recent_7d, prior_7d, recent_7d)
            )
            fastest_topic_row = cursor.fetchone()
            fastest_growing_topic = {
                "name": fastest_topic_row["name"] if fastest_topic_row else "LLM Reasoning",
                "growth": round(((fastest_topic_row["recent_count"] - (fastest_topic_row["prior_count"] or 0)) / max(1, fastest_topic_row["prior_count"] or 1)) * 100, 1) if fastest_topic_row else 0.0,
                "count": fastest_topic_row["recent_count"] if fastest_topic_row else 0
            }

            # Most active category
            cursor.execute(
                """
                SELECT c.id, c.name, COUNT(p.id) as count
                FROM categories c
                JOIN papers p ON p.primary_category = c.id
                GROUP BY c.id
                ORDER BY count DESC
                LIMIT 1
                """
            )
            most_active_cat_row = cursor.fetchone()
            most_active_category = {
                "id": most_active_cat_row["id"] if most_active_cat_row else "cs.AI",
                "name": most_active_cat_row["name"] if most_active_cat_row else "Artificial Intelligence",
                "count": most_active_cat_row["count"] if most_active_cat_row else 0
            }

            # Papers per day (last 14 days)
            cursor.execute(
                """
                SELECT substr(published_date, 1, 10) as day, COUNT(*) as count
                FROM papers
                GROUP BY day
                ORDER BY day DESC
                LIMIT 14
                """
            )
            papers_per_day = [{"date": r["day"], "count": r["count"]} for r in cursor.fetchall()][::-1]

            # Papers by category
            cursor.execute(
                """
                SELECT c.id, c.name, COUNT(p.id) as count
                FROM categories c
                LEFT JOIN papers p ON p.primary_category = c.id
                GROUP BY c.id
                ORDER BY count DESC
                """
            )
            category_distribution = [{"id": r["id"], "name": r["name"], "count": r["count"]} for r in cursor.fetchall()]

            # Top keywords
            cursor.execute(
                """
                SELECT k.keyword, COUNT(pk.paper_id) as count
                FROM keywords k
                JOIN paper_keywords pk ON pk.keyword_id = k.id
                GROUP BY k.id
                ORDER BY count DESC
                LIMIT 15
                """
            )
            top_keywords = [{"keyword": r["keyword"], "count": r["count"]} for r in cursor.fetchall()]

            # Trending topics (top 10 by current count & growth)
            cursor.execute(
                """
                SELECT t.name, t.slug,
                       SUM(CASE WHEN p.published_date >= ? THEN 1 ELSE 0 END) as current_count,
                       SUM(CASE WHEN p.published_date >= ? AND p.published_date < ? THEN 1 ELSE 0 END) as prior_count,
                       COUNT(p.id) as total_count
                FROM topics t
                JOIN paper_topics pt ON pt.topic_id = t.id
                JOIN papers p ON p.id = pt.paper_id
                GROUP BY t.id
                ORDER BY current_count DESC, total_count DESC
                LIMIT 10
                """,
                (recent_7d, prior_7d, recent_7d)
            )
            trending_topics = []
            for r in cursor.fetchall():
                curr = r["current_count"]
                prev = r["prior_count"]
                pct_change = round(((curr - prev) / max(1, prev)) * 100, 1) if prev > 0 else (100.0 if curr > 0 else 0.0)
                trending_topics.append({
                    "name": r["name"],
                    "slug": r["slug"],
                    "current_count": curr,
                    "previous_count": prev,
                    "percentage_change": pct_change,
                    "total_count": r["total_count"]
                })

            return {
                "total_papers": total_papers,
                "papers_today": papers_today,
                "active_categories_count": active_categories_count,
                "unique_authors_count": unique_authors_count,
                "fastest_growing_topic": fastest_growing_topic,
                "most_active_category": most_active_category,
                "papers_per_day": papers_per_day,
                "category_distribution": category_distribution,
                "top_keywords": top_keywords,
                "trending_topics": trending_topics
            }

    def get_trends_explorer(self, window_days: int = 7) -> Dict[str, Any]:
        """Provides deep trend data across topics, keywords, categories, and authors."""
        now = datetime.now(timezone.utc)
        current_cutoff = (now - timedelta(days=window_days)).isoformat()
        prior_cutoff = (now - timedelta(days=window_days * 2)).isoformat()

        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Trending Topics
            cursor.execute(
                """
                SELECT t.name, t.slug,
                       SUM(CASE WHEN p.published_date >= ? THEN 1 ELSE 0 END) as current_count,
                       SUM(CASE WHEN p.published_date >= ? AND p.published_date < ? THEN 1 ELSE 0 END) as prior_count,
                       COUNT(p.id) as total_count
                FROM topics t
                JOIN paper_topics pt ON pt.topic_id = t.id
                JOIN papers p ON p.id = pt.paper_id
                GROUP BY t.id
                ORDER BY current_count DESC, total_count DESC
                LIMIT 20
                """,
                (current_cutoff, prior_cutoff, current_cutoff)
            )
            topics = []
            for r in cursor.fetchall():
                curr = r["current_count"]
                prev = r["prior_count"]
                change = round(((curr - prev) / max(1, prev)) * 100, 1) if prev > 0 else (100.0 if curr > 0 else 0.0)
                topics.append({
                    "name": r["name"],
                    "slug": r["slug"],
                    "current_count": curr,
                    "prior_count": prev,
                    "percentage_change": change,
                    "total_count": r["total_count"]
                })

            # Trending Keywords
            cursor.execute(
                """
                SELECT k.keyword,
                       SUM(CASE WHEN p.published_date >= ? THEN 1 ELSE 0 END) as current_count,
                       SUM(CASE WHEN p.published_date >= ? AND p.published_date < ? THEN 1 ELSE 0 END) as prior_count,
                       COUNT(p.id) as total_count
                FROM keywords k
                JOIN paper_keywords pk ON pk.keyword_id = k.id
                JOIN papers p ON p.id = pk.paper_id
                GROUP BY k.id
                ORDER BY current_count DESC, total_count DESC
                LIMIT 25
                """,
                (current_cutoff, prior_cutoff, current_cutoff)
            )
            keywords = []
            for r in cursor.fetchall():
                curr = r["current_count"]
                prev = r["prior_count"]
                change = round(((curr - prev) / max(1, prev)) * 100, 1) if prev > 0 else (100.0 if curr > 0 else 0.0)
                keywords.append({
                    "keyword": r["keyword"],
                    "current_count": curr,
                    "prior_count": prev,
                    "percentage_change": change,
                    "total_count": r["total_count"]
                })

            # Active Categories
            cursor.execute(
                """
                SELECT c.id, c.name,
                       SUM(CASE WHEN p.published_date >= ? THEN 1 ELSE 0 END) as current_count,
                       SUM(CASE WHEN p.published_date >= ? AND p.published_date < ? THEN 1 ELSE 0 END) as prior_count,
                       COUNT(p.id) as total_count
                FROM categories c
                LEFT JOIN papers p ON p.primary_category = c.id
                GROUP BY c.id
                ORDER BY current_count DESC
                """,
                (current_cutoff, prior_cutoff, current_cutoff)
            )
            categories = []
            for r in cursor.fetchall():
                curr = r["current_count"] or 0
                prev = r["prior_count"] or 0
                change = round(((curr - prev) / max(1, prev)) * 100, 1) if prev > 0 else (100.0 if curr > 0 else 0.0)
                categories.append({
                    "id": r["id"],
                    "name": r["name"],
                    "current_count": curr,
                    "prior_count": prev,
                    "percentage_change": change,
                    "total_count": r["total_count"] or 0
                })

            # Active Authors
            cursor.execute(
                """
                SELECT a.name,
                       COUNT(DISTINCT p.id) as paper_count,
                       GROUP_CONCAT(DISTINCT p.primary_category) as categories
                FROM authors a
                JOIN paper_authors pa ON pa.author_id = a.id
                JOIN papers p ON p.id = pa.paper_id
                WHERE p.published_date >= ?
                GROUP BY a.id
                ORDER BY paper_count DESC
                LIMIT 20
                """,
                (current_cutoff,)
            )
            authors = [
                {
                    "name": r["name"],
                    "paper_count": r["paper_count"],
                    "categories": r["categories"].split(",") if r["categories"] else []
                }
                for r in cursor.fetchall()
            ]

            return {
                "window_days": window_days,
                "topics": topics,
                "keywords": keywords,
                "categories": categories,
                "authors": authors
            }

    def get_topic_detail(self, slug_or_name: str) -> Optional[Dict[str, Any]]:
        """Returns deep topic analytics and associated papers."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM topics WHERE slug = ? OR name = ?",
                (slug_or_name.lower().replace(" ", "-"), slug_or_name)
            )
            topic_row = cursor.fetchone()
            if not topic_row:
                return None

            t_id = topic_row["id"]
            t_name = topic_row["name"]

            # Associated papers
            papers, total = self.db.get_papers(topic=t_name, page=1, page_size=25)

            # Activity over time (by month or date)
            cursor.execute(
                """
                SELECT substr(p.published_date, 1, 10) as day, COUNT(*) as count
                FROM papers p
                JOIN paper_topics pt ON pt.paper_id = p.id
                WHERE pt.topic_id = ?
                GROUP BY day
                ORDER BY day DESC
                LIMIT 30
                """,
                (t_id,)
            )
            timeline = [{"date": r["day"], "count": r["count"]} for r in cursor.fetchall()][::-1]

            # Related keywords
            cursor.execute(
                """
                SELECT k.keyword, COUNT(pk.paper_id) as count
                FROM keywords k
                JOIN paper_keywords pk ON pk.keyword_id = k.id
                JOIN paper_topics pt ON pt.paper_id = pk.paper_id
                WHERE pt.topic_id = ?
                GROUP BY k.id
                ORDER BY count DESC
                LIMIT 10
                """,
                (t_id,)
            )
            related_keywords = [{"keyword": r["keyword"], "count": r["count"]} for r in cursor.fetchall()]

            # Related categories
            cursor.execute(
                """
                SELECT p.primary_category, COUNT(p.id) as count
                FROM papers p
                JOIN paper_topics pt ON pt.paper_id = p.id
                WHERE pt.topic_id = ?
                GROUP BY p.primary_category
                ORDER BY count DESC
                """,
                (t_id,)
            )
            related_categories = [{"category": r["primary_category"], "count": r["count"]} for r in cursor.fetchall()]

            # Active authors
            cursor.execute(
                """
                SELECT a.name, COUNT(pa.paper_id) as count
                FROM authors a
                JOIN paper_authors pa ON pa.author_id = a.id
                JOIN paper_topics pt ON pt.paper_id = pa.paper_id
                WHERE pt.topic_id = ?
                GROUP BY a.id
                ORDER BY count DESC
                LIMIT 10
                """,
                (t_id,)
            )
            active_authors = [{"name": r["name"], "count": r["count"]} for r in cursor.fetchall()]

            return {
                "id": t_id,
                "name": t_name,
                "slug": topic_row["slug"],
                "total_papers": total,
                "timeline": timeline,
                "related_keywords": related_keywords,
                "related_categories": related_categories,
                "active_authors": active_authors,
                "papers": papers
            }

    def compare_topics(self, topic_a: str, topic_b: str) -> Dict[str, Any]:
        """Compares two topics across papers, velocity, categories, authors, and keywords."""
        detail_a = self.get_topic_detail(topic_a) or {
            "name": topic_a, "total_papers": 0, "timeline": [], "related_keywords": [], "related_categories": [], "active_authors": []
        }
        detail_b = self.get_topic_detail(topic_b) or {
            "name": topic_b, "total_papers": 0, "timeline": [], "related_keywords": [], "related_categories": [], "active_authors": []
        }

        return {
            "topic_a": detail_a,
            "topic_b": detail_b,
            "comparison": {
                "paper_difference": detail_a["total_papers"] - detail_b["total_papers"],
                "winner": topic_a if detail_a["total_papers"] >= detail_b["total_papers"] else topic_b
            }
        }

    def get_recommendations(self, limit: int = 8) -> List[Dict[str, Any]]:
        """
        'Papers You May Want to Read':
        Recommends unread papers using similarity to the user's saved/bookmarked papers
        (based on overlapping categories, topics, and keywords).
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Find user's saved papers topics, categories, keywords
            cursor.execute(
                """
                SELECT p.primary_category, pt.topic_id, pk.keyword_id
                FROM saved_papers sp
                JOIN papers p ON p.id = sp.paper_id
                LEFT JOIN paper_topics pt ON pt.paper_id = p.id
                LEFT JOIN paper_keywords pk ON pk.paper_id = p.id
                """
            )
            rows = cursor.fetchall()

            saved_cats = set()
            saved_topics = set()
            saved_keywords = set()

            for r in rows:
                if r["primary_category"]:
                    saved_cats.add(r["primary_category"])
                if r["topic_id"]:
                    saved_topics.add(r["topic_id"])
                if r["keyword_id"]:
                    saved_keywords.add(r["keyword_id"])

            # Query candidate unread/unsaved papers
            cursor.execute(
                """
                SELECT p.id, p.title, p.abstract, p.published_date, p.primary_category,
                       p.trend_score, p.ai_summary, p.paper_type
                FROM papers p
                LEFT JOIN saved_papers sp ON sp.paper_id = p.id
                WHERE sp.id IS NULL
                ORDER BY p.trend_score DESC, p.published_date DESC
                LIMIT 100
                """
            )
            candidates = cursor.fetchall()
            scored_recommendations = []

            for c in candidates:
                pid = c["id"]
                score = 0.0
                reasons = []

                # Match category
                if c["primary_category"] in saved_cats:
                    score += 40.0
                    reasons.append(f"Matches saved category {c['primary_category']}")

                # Match topics
                cursor.execute("SELECT topic_id, t.name FROM paper_topics pt JOIN topics t ON t.id = pt.topic_id WHERE pt.paper_id = ?", (pid,))
                c_topics = cursor.fetchall()
                for tr in c_topics:
                    if tr["topic_id"] in saved_topics:
                        score += 30.0
                        reasons.append(f"Shares topic '{tr['name']}' with your bookmarks")
                        break

                # Match keywords
                cursor.execute("SELECT keyword_id, k.keyword FROM paper_keywords pk JOIN keywords k ON k.id = pk.keyword_id WHERE pk.paper_id = ?", (pid,))
                c_keywords = cursor.fetchall()
                for kr in c_keywords:
                    if kr["keyword_id"] in saved_keywords:
                        score += 20.0
                        reasons.append(f"Shared keyword: {kr['keyword']}")
                        break

                # If no bookmarks yet, fallback to trend score
                if not saved_cats and not saved_topics:
                    score = c["trend_score"]
                    reasons.append(f"High trend velocity score ({c['trend_score']:.1f})")

                scored_recommendations.append({
                    "id": pid,
                    "title": c["title"],
                    "abstract": c["abstract"],
                    "published_date": c["published_date"],
                    "primary_category": c["primary_category"],
                    "trend_score": c["trend_score"],
                    "ai_summary": c["ai_summary"],
                    "paper_type": c["paper_type"],
                    "recommendation_score": round(score, 1),
                    "recommendation_reason": reasons[0] if reasons else "High overall relevance in recent literature"
                })

            scored_recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
            return scored_recommendations[:limit]
