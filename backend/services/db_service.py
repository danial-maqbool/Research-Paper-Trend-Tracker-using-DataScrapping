import sqlite3
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from backend.config import DB_PATH, SCHEMA_PATH, DEFAULT_CATEGORIES

logger = logging.getLogger("db_service")

class DBService:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path or DB_PATH)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        """Initializes database schema and default categories."""
        if not SCHEMA_PATH.exists():
            logger.warning(f"Schema file not found at {SCHEMA_PATH}")
            return

        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        with self.get_connection() as conn:
            conn.executescript(schema_sql)
            
            # Ensure default categories exist
            for cat in DEFAULT_CATEGORIES:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO categories (id, name, description, is_enabled)
                    VALUES (?, ?, ?, 1)
                    """,
                    (cat["id"], cat["name"], cat["description"])
                )
            conn.commit()

    def upsert_paper(self, paper: Dict[str, Any], authors: List[str], categories: List[str]) -> Tuple[int, bool]:
        """
        Upserts paper by arxiv_id.
        Returns (paper_id, is_new).
        """
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if paper already exists
            cursor.execute("SELECT id, abstract FROM papers WHERE arxiv_id = ?", (paper["arxiv_id"],))
            row = cursor.fetchone()

            if row:
                paper_id = row["id"]
                is_new = False
                old_abstract = row["abstract"]
                
                # If abstract changed, reset ai_analyzed so it can be re-analyzed
                abstract_changed = (old_abstract.strip() != paper["abstract"].strip())
                
                cursor.execute(
                    """
                    UPDATE papers
                    SET title = ?,
                        abstract = ?,
                        published_date = ?,
                        updated_date = ?,
                        primary_category = ?,
                        doi = ?,
                        journal_ref = ?,
                        pdf_url = ?,
                        page_url = ?,
                        comment = ?,
                        last_seen = ?,
                        updated_at = ?,
                        ai_analyzed = CASE WHEN ? = 1 THEN 0 ELSE ai_analyzed END
                    WHERE id = ?
                    """,
                    (
                        paper["title"],
                        paper["abstract"],
                        paper["published_date"],
                        paper["updated_date"],
                        paper["primary_category"],
                        paper.get("doi"),
                        paper.get("journal_ref"),
                        paper["pdf_url"],
                        paper["page_url"],
                        paper.get("comment"),
                        now,
                        now,
                        1 if abstract_changed else 0,
                        paper_id
                    )
                )
            else:
                is_new = True
                cursor.execute(
                    """
                    INSERT INTO papers (
                        arxiv_id, title, abstract, published_date, updated_date,
                        primary_category, doi, journal_ref, pdf_url, page_url,
                        comment, trend_score, freshness_score, first_seen, last_seen,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 1.0, ?, ?, ?, ?)
                    """,
                    (
                        paper["arxiv_id"],
                        paper["title"],
                        paper["abstract"],
                        paper["published_date"],
                        paper["updated_date"],
                        paper["primary_category"],
                        paper.get("doi"),
                        paper.get("journal_ref"),
                        paper["pdf_url"],
                        paper["page_url"],
                        paper.get("comment"),
                        now,
                        now,
                        now,
                        now
                    )
                )
                paper_id = cursor.lastrowid

            # Link Authors
            cursor.execute("DELETE FROM paper_authors WHERE paper_id = ?", (paper_id,))
            for pos, author_name in enumerate(authors):
                clean_name = author_name.strip()
                if not clean_name:
                    continue
                cursor.execute("INSERT OR IGNORE INTO authors (name, created_at) VALUES (?, ?)", (clean_name, now))
                cursor.execute("SELECT id FROM authors WHERE name = ?", (clean_name,))
                author_row = cursor.fetchone()
                if author_row:
                    cursor.execute(
                        "INSERT OR IGNORE INTO paper_authors (paper_id, author_id, position) VALUES (?, ?, ?)",
                        (paper_id, author_row["id"], pos)
                    )

            # Link Categories
            cursor.execute("DELETE FROM paper_categories WHERE paper_id = ?", (paper_id,))
            for cat_id in categories:
                clean_cat = cat_id.strip()
                if not clean_cat:
                    continue
                # Insert category if not exists
                cursor.execute(
                    "INSERT OR IGNORE INTO categories (id, name, description, is_enabled) VALUES (?, ?, ?, 1)",
                    (clean_cat, clean_cat, f"arXiv category {clean_cat}")
                )
                cursor.execute(
                    "INSERT OR IGNORE INTO paper_categories (paper_id, category_id) VALUES (?, ?)",
                    (paper_id, clean_cat)
                )

            conn.commit()
            return paper_id, is_new

    def update_paper_ai_analysis(self, paper_id: int, analysis: Dict[str, Any]) -> bool:
        """Stores Gemini structured analysis for a paper."""
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                """
                UPDATE papers
                SET ai_summary = ?,
                    paper_type = ?,
                    difficulty_level = ?,
                    impact_area = ?,
                    ai_analyzed = 1,
                    ai_analyzed_at = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    analysis.get("summary", ""),
                    analysis.get("paper_type", "new method"),
                    analysis.get("technical_difficulty", "intermediate"),
                    analysis.get("potential_impact_area", "General AI"),
                    now,
                    now,
                    paper_id
                )
            )

            # Save Keywords
            cursor.execute("DELETE FROM paper_keywords WHERE paper_id = ?", (paper_id,))
            keywords = analysis.get("keywords", [])
            for kw in keywords:
                clean_kw = kw.strip().lower()
                if not clean_kw:
                    continue
                cursor.execute("INSERT OR IGNORE INTO keywords (keyword) VALUES (?)", (clean_kw,))
                cursor.execute("SELECT id FROM keywords WHERE keyword = ?", (clean_kw,))
                kw_row = cursor.fetchone()
                if kw_row:
                    cursor.execute(
                        "INSERT OR IGNORE INTO paper_keywords (paper_id, keyword_id) VALUES (?, ?)",
                        (paper_id, kw_row["id"])
                    )

            # Save Topics
            cursor.execute("DELETE FROM paper_topics WHERE paper_id = ?", (paper_id,))
            topics = analysis.get("topics", [])
            for topic in topics:
                clean_topic = topic.strip()
                if not clean_topic:
                    continue
                slug = clean_topic.lower().replace(" ", "-").replace("/", "-")
                cursor.execute("INSERT OR IGNORE INTO topics (name, slug) VALUES (?, ?)", (clean_topic, slug))
                cursor.execute("SELECT id FROM topics WHERE name = ?", (clean_topic,))
                topic_row = cursor.fetchone()
                if topic_row:
                    cursor.execute(
                        "INSERT OR IGNORE INTO paper_topics (paper_id, topic_id) VALUES (?, ?)",
                        (paper_id, topic_row["id"])
                    )

            conn.commit()
            return True

    def get_papers(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        paper_type: Optional[str] = None,
        difficulty: Optional[str] = None,
        saved_only: bool = False,
        min_trend_score: Optional[float] = None,
        topic: Optional[str] = None,
        keyword: Optional[str] = None,
        author: Optional[str] = None,
        sort_by: str = "newest", # newest, oldest, trend, title
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Queries papers with search, filtering, and pagination."""
        offset = (page - 1) * page_size
        where_clauses = ["1=1"]
        params: List[Any] = []

        if query:
            q_pattern = f"%{query.strip()}%"
            where_clauses.append(
                """
                (p.title LIKE ? OR p.abstract LIKE ? OR p.arxiv_id LIKE ? 
                 OR p.id IN (
                     SELECT pa.paper_id FROM paper_authors pa
                     JOIN authors a ON a.id = pa.author_id WHERE a.name LIKE ?
                 )
                 OR p.id IN (
                     SELECT pk.paper_id FROM paper_keywords pk
                     JOIN keywords k ON k.id = pk.keyword_id WHERE k.keyword LIKE ?
                 )
                 OR p.id IN (
                     SELECT pt.paper_id FROM paper_topics pt
                     JOIN topics t ON t.id = pt.topic_id WHERE t.name LIKE ?
                 )
                )
                """
            )
            params.extend([q_pattern, q_pattern, q_pattern, q_pattern, q_pattern, q_pattern])

        if category:
            where_clauses.append(
                """
                (p.primary_category = ? OR p.id IN (
                    SELECT pc.paper_id FROM paper_categories pc WHERE pc.category_id = ?
                ))
                """
            )
            params.extend([category, category])

        if start_date:
            where_clauses.append("p.published_date >= ?")
            params.append(start_date)

        if end_date:
            where_clauses.append("p.published_date <= ?")
            params.append(end_date)

        if paper_type:
            where_clauses.append("p.paper_type = ?")
            params.append(paper_type)

        if difficulty:
            where_clauses.append("p.difficulty_level = ?")
            params.append(difficulty)

        if saved_only:
            where_clauses.append("sp.id IS NOT NULL")

        if min_trend_score is not None:
            where_clauses.append("p.trend_score >= ?")
            params.append(min_trend_score)

        if topic:
            where_clauses.append(
                """
                p.id IN (
                    SELECT pt.paper_id FROM paper_topics pt
                    JOIN topics t ON t.id = pt.topic_id
                    WHERE t.name = ? OR t.slug = ?
                )
                """
            )
            params.extend([topic, topic.lower().replace(" ", "-")])

        if keyword:
            where_clauses.append(
                """
                p.id IN (
                    SELECT pk.paper_id FROM paper_keywords pk
                    JOIN keywords k ON k.id = pk.keyword_id
                    WHERE k.keyword = ?
                )
                """
            )
            params.append(keyword.lower().strip())

        if author:
            where_clauses.append(
                """
                p.id IN (
                    SELECT pa.paper_id FROM paper_authors pa
                    JOIN authors a ON a.id = pa.author_id
                    WHERE a.name LIKE ?
                )
                """
            )
            params.append(f"%{author.strip()}%")

        order_by_sql = "p.published_date DESC"
        if sort_by == "oldest":
            order_by_sql = "p.published_date ASC"
        elif sort_by == "trend":
            order_by_sql = "p.trend_score DESC, p.published_date DESC"
        elif sort_by == "title":
            order_by_sql = "p.title ASC"

        where_sql = " AND ".join(where_clauses)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            count_sql = f"""
                SELECT COUNT(DISTINCT p.id) as total
                FROM papers p
                LEFT JOIN saved_papers sp ON sp.paper_id = p.id
                WHERE {where_sql}
            """
            cursor.execute(count_sql, params)
            total = cursor.fetchone()["total"]

            data_sql = f"""
                SELECT p.*, 
                       sp.reading_status,
                       (CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END) as is_saved
                FROM papers p
                LEFT JOIN saved_papers sp ON sp.paper_id = p.id
                WHERE {where_sql}
                ORDER BY {order_by_sql}
                LIMIT ? OFFSET ?
            """
            cursor.execute(data_sql, params + [page_size, offset])
            rows = cursor.fetchall()

            papers = []
            for row in rows:
                p_dict = dict(row)
                p_id = p_dict["id"]
                p_dict["ai_analyzed"] = bool(p_dict["ai_analyzed"])
                p_dict["is_saved"] = bool(p_dict["is_saved"])
                
                # Fetch authors
                cursor.execute(
                    """
                    SELECT a.name FROM authors a
                    JOIN paper_authors pa ON pa.author_id = a.id
                    WHERE pa.paper_id = ?
                    ORDER BY pa.position ASC
                    """,
                    (p_id,)
                )
                p_dict["authors"] = [r["name"] for r in cursor.fetchall()]

                # Fetch categories
                cursor.execute(
                    "SELECT category_id FROM paper_categories WHERE paper_id = ?",
                    (p_id,)
                )
                p_dict["categories"] = [r["category_id"] for r in cursor.fetchall()]

                # Fetch topics
                cursor.execute(
                    """
                    SELECT t.name FROM topics t
                    JOIN paper_topics pt ON pt.topic_id = t.id
                    WHERE pt.paper_id = ?
                    """,
                    (p_id,)
                )
                p_dict["topics"] = [r["name"] for r in cursor.fetchall()]

                # Fetch keywords
                cursor.execute(
                    """
                    SELECT k.keyword FROM keywords k
                    JOIN paper_keywords pk ON pk.keyword_id = k.id
                    WHERE pk.paper_id = ?
                    """,
                    (p_id,)
                )
                p_dict["keywords"] = [r["keyword"] for r in cursor.fetchall()]

                papers.append(p_dict)

            return papers, total

    def get_paper_by_id(self, paper_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single paper with complete relations and why_showing_up metrics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT p.*, 
                       sp.reading_status,
                       sp.personal_note,
                       (CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END) as is_saved
                FROM papers p
                LEFT JOIN saved_papers sp ON sp.paper_id = p.id
                WHERE p.id = ?
                """,
                (paper_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None

            p_dict = dict(row)
            p_dict["ai_analyzed"] = bool(p_dict["ai_analyzed"])
            p_dict["is_saved"] = bool(p_dict["is_saved"])

            # Authors
            cursor.execute(
                """
                SELECT a.name FROM authors a
                JOIN paper_authors pa ON pa.author_id = a.id
                WHERE pa.paper_id = ?
                ORDER BY pa.position ASC
                """,
                (paper_id,)
            )
            p_dict["authors"] = [r["name"] for r in cursor.fetchall()]

            # Categories
            cursor.execute(
                "SELECT category_id FROM paper_categories WHERE paper_id = ?",
                (paper_id,)
            )
            p_dict["categories"] = [r["category_id"] for r in cursor.fetchall()]

            # Topics
            cursor.execute(
                """
                SELECT t.name FROM topics t
                JOIN paper_topics pt ON pt.topic_id = t.id
                WHERE pt.paper_id = ?
                """,
                (paper_id,)
            )
            p_dict["topics"] = [r["name"] for r in cursor.fetchall()]

            # Keywords
            cursor.execute(
                """
                SELECT k.keyword FROM keywords k
                JOIN paper_keywords pk ON pk.keyword_id = k.id
                WHERE pk.paper_id = ?
                """,
                (paper_id,)
            )
            p_dict["keywords"] = [r["keyword"] for r in cursor.fetchall()]

            # Why is this paper showing up? Explain transparently based on recency, category velocity, keyword growth
            pub_date = p_dict["published_date"]
            cursor.execute(
                "SELECT COUNT(*) as cat_count FROM papers WHERE primary_category = ?",
                (p_dict["primary_category"],)
            )
            cat_count = cursor.fetchone()["cat_count"]

            p_dict["why_showing_up"] = {
                "recency_factor": f"Published on {pub_date[:10]} with a freshness index of {p_dict['freshness_score']:.2f}",
                "category_activity": f"Primary category '{p_dict['primary_category']}' contains {cat_count} tracked papers in the database",
                "trend_index": f"Calculated trend velocity score: {p_dict['trend_score']:.1f}",
                "topic_relevance": f"Associated with topics: {', '.join(p_dict['topics']) if p_dict['topics'] else 'General computer science'}"
            }

            return p_dict

    def save_paper(self, paper_id: int, reading_status: str = "unread", personal_note: str = "") -> bool:
        """Bookmarks or updates saved status of paper."""
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO saved_papers (paper_id, saved_date, reading_status, personal_note, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(paper_id) DO UPDATE SET
                    reading_status = excluded.reading_status,
                    personal_note = excluded.personal_note,
                    updated_at = excluded.updated_at
                """,
                (paper_id, now, reading_status, personal_note, now)
            )
            conn.commit()
            return True

    def remove_saved_paper(self, paper_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM saved_papers WHERE paper_id = ?", (paper_id,))
            conn.commit()
            return True

    def update_saved_paper(self, paper_id: int, reading_status: Optional[str] = None, personal_note: Optional[str] = None) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            if reading_status and personal_note is not None:
                conn.execute(
                    "UPDATE saved_papers SET reading_status = ?, personal_note = ?, updated_at = ? WHERE paper_id = ?",
                    (reading_status, personal_note, now, paper_id)
                )
            elif reading_status:
                conn.execute(
                    "UPDATE saved_papers SET reading_status = ?, updated_at = ? WHERE paper_id = ?",
                    (reading_status, now, paper_id)
                )
            elif personal_note is not None:
                conn.execute(
                    "UPDATE saved_papers SET personal_note = ?, updated_at = ? WHERE paper_id = ?",
                    (personal_note, now, paper_id)
                )
            conn.commit()
            return True

    def create_scrape_run(self, categories: List[str], requested_count: int) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO scrape_runs (
                    start_time, selected_categories, requested_count, fetched_count,
                    new_papers, updated_papers, failed_records, ai_analyses_completed, status
                ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 'running')
                """,
                (now, json.dumps(categories), requested_count)
            )
            conn.commit()
            return cursor.lastrowid

    def update_scrape_run(
        self,
        run_id: int,
        fetched_count: int,
        new_papers: int,
        updated_papers: int,
        failed_records: int,
        ai_completed: int,
        status: str = "completed",
        error_message: Optional[str] = None
    ):
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            conn.execute(
                """
                UPDATE scrape_runs
                SET end_time = ?,
                    fetched_count = ?,
                    new_papers = ?,
                    updated_papers = ?,
                    failed_records = ?,
                    ai_analyses_completed = ?,
                    status = ?,
                    error_message = ?
                WHERE id = ?
                """,
                (
                    now,
                    fetched_count,
                    new_papers,
                    updated_papers,
                    failed_records,
                    ai_completed,
                    status,
                    error_message,
                    run_id
                )
            )
            conn.commit()

    def get_scrape_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM scrape_runs ORDER BY start_time DESC LIMIT ?",
                (limit,)
            )
            runs = []
            for r in cursor.fetchall():
                d = dict(r)
                try:
                    d["selected_categories"] = json.loads(d["selected_categories"])
                except Exception:
                    d["selected_categories"] = []
                runs.append(d)
            return runs

    def get_categories(self, enabled_only: bool = False) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            sql = "SELECT * FROM categories"
            if enabled_only:
                sql += " WHERE is_enabled = 1"
            sql += " ORDER BY id ASC"
            cursor.execute(sql)
            return [dict(r) for r in cursor.fetchall()]

    def set_category_enabled(self, category_id: str, is_enabled: bool) -> bool:
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE categories SET is_enabled = ? WHERE id = ?",
                (1 if is_enabled else 0, category_id)
            )
            conn.commit()
            return True

    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> bool:
        with self.get_connection() as conn:
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, str(value))
            )
            conn.commit()
            return True
