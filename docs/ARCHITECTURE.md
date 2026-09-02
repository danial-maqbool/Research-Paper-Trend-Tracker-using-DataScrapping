# Architecture & System Design

**Research Paper Trend Tracker** is architected as an asynchronous, decoupled, academic data platform. It systematically ingests preprints from the arXiv API, normalizes relational structures into SQLite, evaluates temporal velocity metrics, and runs structured semantic synthesis via Google Gemini.

---

## 1. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              arXiv API                                  |
|                 (http://export.arxiv.org/api/query)                     |
+------------------------------------+------------------------------------+
                                     | XML / Atom Stream
                                     v
+-------------------------------------------------------------------------+
|                          arXiv Service                                  |
|   - Polite Rate Limiting (3.0s minimum request delay)                   |
|   - Atom XML Streaming Parser & Sanitizer                               |
|   - LaTeX / Math Formulation Preservation                               |
|   - Author & Category Deduplication                                     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          Database Service                               |
|   - SQLite (WAL Mode, Normalized Junctions, Indexed)                    |
|   - Tables: papers, authors, categories, keywords, topics,              |
|             saved_papers, scrape_runs, app_settings                     |
|   - Idempotent Upserts via arXiv ID                                     |
+-------------------+--------------------------------+--------------------+
                    |                                |
                    v                                v
+----------------------------+      +-------------------------------------+
|       Trend Service        |      |      Gemini Analysis Service        |
| - Temporal Decay Index     |      | - Structured JSON Output            |
| - Category Velocity Ratio  |      | - 2-3 Sentence Synthesis            |
| - Keyword Momentum Scoring |      | - Keyword & Topic Extraction        |
| - Side-by-Side Comparison  |      | - Paper Type & Prerequisite Level   |
+-------------------+--------+      +------------------+------------------+
                    |                                  |
                    +----------------+-----------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                             FastAPI REST API                            |
|   - /api/papers, /api/scrape, /api/trends, /api/topics, /api/saved,     |
|   - /api/brief, /api/recommendations, /api/export, /api/settings        |
|   - BackgroundTasks Asynchronous Scraping Worker                        |
+------------------------------------+------------------------------------+
                                     | JSON REST + Static File Delivery
                                     v
+-------------------------------------------------------------------------+
|                  React 18 + Vite + Tailwind Frontend                    |
|   - Responsive Academic UI (Desktop / Tablet / Mobile)                  |
|   - Chart.js Publication Velocity & Category Distribution               |
|   - Interactive Paper Explorer with Multi-Field Filtering               |
|   - Daily Research Brief & Side-by-Side Topic Comparison                |
+-------------------------------------------------------------------------+
```

---

## 2. Trend Scoring Methodology

The application computes an empirical **Trend Velocity Score** ($T \in [0, 100]$) to highlight preprints that combine high recency with disciplinary momentum.

$$T = w_{\text{freshness}} \cdot S_{\text{freshness}} + w_{\text{velocity}} \cdot S_{\text{velocity}} + w_{\text{keyword}} \cdot S_{\text{keyword}}$$

Where:
1. **Freshness Score ($S_{\text{freshness}}$)**:
   $$S_{\text{freshness}} = \exp\left(-\frac{\Delta t}{14}\right) \times 100$$
   where $\Delta t$ is the elapsed time in days since publication on arXiv (14-day exponential half-life).
2. **Category Velocity Score ($S_{\text{velocity}}$)**:
   $$S_{\text{velocity}} = \min\left(100, \frac{\text{Preprints in Category (Last 7 Days)}}{\max(1, \text{Preprints in Category (Prior 7 Days)})} \times 50\right)$$
3. **Keyword Momentum ($S_{\text{keyword}}$)**:
   $$S_{\text{keyword}} = \min\left(100, \sum_{k \in \text{keywords}} \text{Frequency}(k, \text{7-day window}) \times 15\right)$$

*Weights*: $w_{\text{freshness}} = 0.50$, $w_{\text{velocity}} = 0.30$, $w_{\text{keyword}} = 0.20$.

> **Notice**: The trend score measures publication and literature velocity within the application's tracked dataset, not intrinsic scientific validity.

---

## 3. Gemini 3.8 Flash Schema Enforcement

When a preprint is analyzed, only the title and clean abstract are forwarded to Gemini Flash to maintain strict cost discipline. Responses are constrained to a strict JSON Schema:

```json
{
  "summary": "2 to 3 concise sentences summarizing methodology and findings.",
  "keywords": ["array", "of", "3-8", "keywords"],
  "topics": ["1-3", "high-level", "topics"],
  "paper_type": "new method | benchmark | survey | dataset | system | theoretical work | evaluation study | application paper | position paper",
  "technical_difficulty": "beginner | intermediate | advanced | specialist",
  "potential_impact_area": "Target application field"
}
```

If an API key is not configured or an intermittent network timeout occurs, the system utilizes a rule-based heuristic extraction ladder, guaranteeing that data ingestion never halts.
