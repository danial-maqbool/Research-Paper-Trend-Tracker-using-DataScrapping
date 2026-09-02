# Research Paper Trend Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini 3.8 Flash](https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

An intelligent research analytics platform and literature trend tracker that harvests, stores, analyzes, and visualizes preprint data from public research repositories (starting with **arXiv**). Powered by **Google Gemini 3.8 Flash** for automated structured paper synthesis, keyword extraction, topic taxonomy mapping, and real-time temporal trend scoring.

Built as part of a daily GitHub portfolio challenge.

---

## Table of Contents

- [Why I Built This](#why-i-built-this)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Mathematical Formulation of the Trend Score](#mathematical-formulation-of-the-trend-score)
- [Gemini 3.8 Flash Structured Analysis](#gemini-38-flash-structured-analysis)
- [Technology Stack](#technology-stack)
- [Getting Started & Installation](#getting-started--installation)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Directory Structure](#project-directory-structure)
- [Data Source Attribution & Etiquette](#data-source-attribution--etiquette)
- [Limitations & Future Roadmap](#limitations--future-roadmap)
- [License](#license)

---

## Why I Built This

The exponential pace of machine learning and computer science preprints—often exceeding hundreds of submissions daily across arXiv alone—makes manual literature monitoring overwhelming. Researchers and practitioners struggle to detect emerging paradigm shifts before they dominate major conferences.

I built **Research Paper Trend Tracker** to explore:
1. **Automated Data Harvesting**: Constructing polite, resilient ingestion pipelines interfacing with official scientific APIs.
2. **Normalized Relational Architecture**: Designing a SQLite data layer capable of fast indexing, multi-criteria filtering, and idempotent deduplication.
3. **AI-Assisted Text Synthesis**: Employing Gemini 3.8 Flash with enforced JSON schema validation to compress complex abstracts into concise takeaways without hallucinations.
4. **Empirical Trend Velocity Detection**: Designing an objective mathematical formulation combining recency decay with category and keyword acceleration.
5. **Interactive Research Analytics**: Delivering a clean, distraction-free academic interface for literature discovery, comparison, and citation generation.

---

## Key Features

### 1. Robust arXiv Harvesting Pipeline
* **Official arXiv API Feed**: Harvests live preprints via XML/Atom queries without scraping fragile HTML.
* **Flexible Date Windows**: Ingest papers from the last 24 hours, 3 days, 7 days, 30 days, or custom date ranges.
* **Discipline Filtering**: Configurable subscriptions across 9 core disciplines (`cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, `cs.RO`, `cs.CR`, `cs.HC`, `cs.DC`, `cs.IR`).
* **Idempotent Storage**: Uses arXiv ID as primary key. Duplicate submissions update existing records rather than creating redundant entries.
* **Data Sanitization**: Strips excessive whitespace, normalizes carriage returns, decodes XML entities, and preserves LaTeX/mathematical formulations (e.g. $\mathcal{O}(N^2)$).

### 2. Gemini 3.8 Flash Paper Synthesis
* **Cost-Controlled Analysis**: Only sends paper title and clean abstract.
* **Enforced JSON Schema**: Generates verified structured JSON containing:
  - 2 to 3 sentence executive summary.
  - 3 to 8 extracted technical keywords.
  - 1 to 3 high-level research topics.
  - Estimated paper contribution type (`new method`, `benchmark`, `survey`, `dataset`, `system`, `theoretical work`, etc.).
  - Technical prerequisite level (`beginner`, `intermediate`, `advanced`, `specialist`).
  - Potential target impact area.
* **Fault-Tolerant Ladder**: If the API key is unconfigured or a network timeout occurs, an intelligent rule-based heuristic extraction ladder ensures ingestion never fails.
* **Selective Processing**: Only analyzes new papers or papers with modified abstracts; prevents redundant token consumption.

### 3. Comprehensive Research Dashboard
* **Dynamic KPIs**: Total tracked papers, submissions today, active disciplines, unique authors, fastest-growing topic, and lead category.
* **Publication Velocity Chart**: Responsive time-series visual displaying daily submission volume over the last 14 days.
* **Category Share Chart**: Visualizing distribution across tracked computer science disciplines.
* **Trending Research Topics**: Interactive table showing current vs prior 7-day counts with percentage acceleration.
* **Prominent Keywords Cloud**: Frequency-weighted badges highlighting active research terminology.
* **Top Velocity Preprints**: Cards showcasing papers with the highest computed trend scores.

### 4. Interactive Paper Explorer & Full Detail View
* **Multi-Field Search**: Searches across title, abstract, authors, extracted keywords, detected topics, and arXiv identifiers.
* **Granular Filtering**: Filter by category, paper type, technical difficulty, bookmark status, and minimum trend score.
* **Transparent "Why is this paper showing up?"**: Dissects each paper's appearance based on publication recency, category volume, and keyword momentum.
* **1-Click Citations**: Instant generation and clipboard copying of both formatted Plain Text (APA style) and BibTeX blocks with `.bib` file download.
* **Direct Links**: Quick access to official arXiv abstract pages and direct PDF downloads.

### 5. Deep Trend Explorer & Topic Comparison
* **Multi-Window Analysis**: Switch between 1-day, 7-day, and 30-day velocity windows.
* **Active Authors & Categories**: Track high-volume authors and category shifts.
* **Side-by-Side Topic Comparison**: Directly compare two topics (e.g., *Large Language Models* vs. *Diffusion Models*) across publication volume, keywords, active authors, and categories.
* **Topic Detail View**: Dedicated page for any topic showing historical timeline, related concepts, contributing researchers, and associated papers.

### 6. Personal Library & Research Discovery
* **Paper Bookmarking**: Save preprints with customizable reading statuses (`unread`, `reading`, `read`).
* **Personal Notes**: Attach research notes and literature review takeaways directly to any paper.
* **"Papers You May Want to Read"**: Transparent content-based recommendation engine scoring unread papers based on taxonomy overlap with your bookmarked library.

### 7. Scrape Audit Trail & Clean Data Export
* **Run History**: Complete audit log recording timestamp, categories queried, papers requested/fetched, new vs updated records, and AI analyses completed.
* **Export Options**: Export all papers, filtered queries, saved bookmarks, or trend tables as clean CSV or formatted JSON.

---

## System Architecture

```
                                 [ arXiv Public API ]
                                          |
                              (Polite HTTP Atom Stream)
                                          v
                              [ arXiv Ingestion Engine ]
                                  - XML Parser
                                  - LaTeX Preservation
                                  - Deduplication
                                          |
                                          v
                                [ SQLite Database ]
                         - Normalized relational schema
                         - WAL Mode & composite indexes
                          /               |             \
                         v                v              v
               [ Trend Service ]  [ Gemini Service ]  [ Export Engine ]
               - Velocity Index   - 3.8 Flash Schema   - CSV & JSON
               - Freshness Decay  - Structured JSON    - Clean Formatting
               - Topic Comparison - Heuristic Fallback
                         \                |              /
                          v               v             v
                              [ FastAPI Backend Router ]
                                          |
                              (JSON REST API + Static)
                                          v
                            [ React 18 + Vite Frontend ]
                            - Academic Dark Slate Theme
                            - Chart.js Visualizations
                            - Responsive Desktop & Mobile
```

---

## Mathematical Formulation of the Trend Score

To objectively measure preprint momentum without making unsubstantiated claims regarding scientific importance, the application calculates an empirical **Trend Velocity Score** ($T \in [0, 100]$):

$$T = w_{\text{freshness}} \cdot S_{\text{freshness}} + w_{\text{velocity}} \cdot S_{\text{velocity}} + w_{\text{keyword}} \cdot S_{\text{keyword}}$$

### Component Breakdown:

1. **Freshness Score ($S_{\text{freshness}}$)**:
   Models the natural decay of publication novelty using an exponential half-life:
   $$S_{\text{freshness}} = \exp\left(-\frac{\Delta t}{14}\right) \times 100$$
   where $\Delta t$ is the elapsed time in days since publication. A paper published today receives $100.0$, while a paper published 14 days ago receives $\approx 36.8$.

2. **Category Velocity ($S_{\text{velocity}}$)**:
   Measures whether the paper's primary discipline is currently accelerating compared to the previous period:
   $$S_{\text{velocity}} = \min\left(100, \frac{N_{\text{recent}}}{ \max(1, N_{\text{prior}}) } \times 50\right)$$
   where $N_{\text{recent}}$ is the count of preprints in that category over the last 7 days, and $N_{\text{prior}}$ is the count in the prior 7 days.

3. **Keyword Prominence ($S_{\text{keyword}}$)**:
   Measures how frequently the paper's extracted keywords appear across all preprints published in the current window:
   $$S_{\text{keyword}} = \min\left(100, \sum_{k \in \text{keywords}} \text{Freq}(k) \times 15\right)$$

### Parameter Weights:
- $w_{\text{freshness}} = 0.50$ (50% weight on recency)
- $w_{\text{velocity}} = 0.30$ (30% weight on category velocity)
- $w_{\text{keyword}} = 0.20$ (20% weight on keyword cluster momentum)

---

## Gemini 3.8 Flash Structured Analysis

Paper synthesis is executed using Google's lightweight, high-speed **Gemini 3.8 Flash / 2.5 Flash** model with strict response schema constraints:

```json
{
  "summary": "2 to 3 concise sentences summarizing the paper's core contributions and findings.",
  "keywords": ["array", "of", "3-8", "technical", "keywords"],
  "topics": ["1-3", "high-level", "topics"],
  "paper_type": "new method | benchmark | survey | dataset | system | theoretical work | evaluation study | application paper | position paper",
  "technical_difficulty": "beginner | intermediate | advanced | specialist",
  "potential_impact_area": "Target application domain (e.g. Healthcare, Robotics, Agents)"
}
```

---

## Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | **Python 3.10+ / FastAPI** | High-performance asynchronous REST endpoints with Pydantic v2 validation |
| **Database** | **SQLite 3 (WAL Mode)** | Zero-configuration, atomic transactions, embedded persistence without external daemons |
| **Preprint Ingestion** | **arXiv API / Atom XML** | Standard, stable public preprint feed parsed with polite 3.0s request spacing |
| **AI Synthesis** | **Google Gemini 3.8 Flash** | Official Google GenAI SDK with structured schema generation and cost controls |
| **Frontend Framework**| **React 18 / Vite / TypeScript** | Modern component-driven UI with type-safe state management |
| **Styling & Icons** | **Tailwind CSS / Lucide React** | Academic dark-slate palette with clean typography and icons |
| **Data Visualization**| **Chart.js / react-chartjs-2** | Responsive HTML5 Canvas charts for velocity time-series and distributions |
| **Testing** | **pytest** | Unit tests for parser, database relations, scoring formulas, and integration |

---

## Getting Started & Installation

### Prerequisites
- **Python 3.10** or higher
- **Node.js v18+** and **npm**
- (Optional) **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/danial-maqbool/Research-Paper-Trend-Tracker-using-DataScrapping.git
cd Research-Paper-Trend-Tracker-using-DataScrapping
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy example environment configuration
cp .env.example .env
```

### 3. Frontend Setup
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Build static assets (served directly by FastAPI)
npm run build
cd ..
```

---

## Configuration & Environment Variables

Configure application settings in `.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOST` | `127.0.0.1` | Host address for FastAPI server |
| `PORT` | `8000` | Port for the web application |
| `DB_PATH` | `database/papers.db`| Filepath for SQLite database |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (optional, can also be configured via Settings UI) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name (`gemini-2.5-flash`, `gemini-3.8-flash`) |
| `AI_ANALYSIS_ENABLED` | `true` | Toggle for automated AI synthesis |
| `GEMINI_MAX_REQUESTS_PER_MINUTE` | `15` | Client-side rate limit for Gemini API calls |
| `ARXIV_REQUEST_DELAY` | `3.0` | Minimum delay in seconds between arXiv queries |

---

## Running the Application

### Option A: Unified Production Mode (Recommended)
Start the FastAPI server, which serves both the REST API and the built React frontend:
```bash
python run.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### Option B: Full-Stack Development Mode
Run backend and Vite frontend development servers concurrently:

**Terminal 1 (Backend):**
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend with Hot-Reload):**
```bash
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser (Vite proxies `/api` requests to port 8000).

---

## Testing

The project includes unit and end-to-end integration tests covering XML parsing, database deduplication, scoring algorithms, and schema validation.

To run the complete test suite:
```bash
pytest tests -v
```

### Test Suite Coverage:
- `tests/test_arxiv_parser.py`: Tests Atom XML extraction, author deduplication, and LaTeX formula preservation.
- `tests/test_db_service.py`: Tests SQLite table creation, paper upserting, relation junction integrity, and bookmark lifecycles.
- `tests/test_trend_service.py`: Verifies freshness half-life decay, velocity ratios, and side-by-side topic comparison logic.
- `tests/test_gemini_service.py`: Validates Pydantic schema validation and rule-based heuristic extraction fallback.
- `tests/test_integration.py`: Complete pipeline test: Mocked Ingestion $\to$ Normalization $\to$ Score Calculation $\to$ Retrieval $\to$ CSV/JSON Export.

---

## Project Directory Structure

```text
research-paper-trend-tracker/
├── README.md                      # Comprehensive project documentation
├── .env.example                   # Template environment variables
├── .gitignore                     # Git ignore rules for node, python, db
├── requirements.txt               # Backend Python dependencies
├── run.py                         # Single-command application launcher
├── backend/                       # FastAPI backend package
│   ├── main.py                    # App entry point, CORS, static file router
│   ├── config.py                  # Environment settings and category mapping
│   ├── models/                    # Pydantic data contracts
│   │   └── schemas.py             # Request, response, and Gemini schemas
│   ├── services/                  # Business logic services
│   │   ├── arxiv_service.py       # arXiv API client, parser, rate limiter
│   │   ├── db_service.py          # SQLite connection and normalized queries
│   │   ├── gemini_service.py      # Gemini 3.8 Flash structured client
│   │   ├── trend_service.py       # Mathematical trend & velocity engine
│   │   ├── brief_service.py       # Daily Research Brief synthesis
│   │   └── export_service.py      # Clean CSV and JSON generator
│   └── routes/                    # Modular API route controllers
│       ├── scrape_routes.py       # /api/scrape endpoints
│       ├── paper_routes.py        # /api/papers endpoints
│       ├── trend_routes.py        # /api/trends endpoints
│       ├── topic_routes.py        # /api/topics endpoints
│       ├── saved_routes.py        # /api/saved endpoints
│       ├── export_routes.py       # /api/export endpoints
│       ├── brief_routes.py        # /api/brief endpoints
│       ├── recommendation_routes.py # /api/recommendations endpoints
│       └── settings_routes.py     # /api/settings endpoints
├── database/
│   └── schema.sql                 # Normalized SQLite DDL and indexes
├── frontend/                      # React 18 TypeScript Vite frontend
│   ├── package.json               # Node dependencies and build scripts
│   ├── vite.config.ts             # Vite build & proxy configuration
│   ├── tsconfig.json              # TypeScript compiler configuration
│   ├── index.html                 # Main application HTML shell
│   └── src/
│       ├── main.tsx               # React root renderer
│       ├── App.tsx                # Master component & view router
│       ├── index.css              # Tailwind directives & theme styles
│       ├── types/index.ts         # TypeScript interfaces
│       ├── api/client.ts          # Type-safe fetch client for backend
│       ├── components/            # Reusable UI components
│       │   ├── Navigation.tsx     # Top responsive academic navigation
│       │   ├── KpiCard.tsx        # Responsive KPI summary metric cards
│       │   ├── PaperCard.tsx      # Rich paper cards with scores & actions
│       │   ├── PaperDetailModal.tsx # Full metadata & AI synthesis modal
│       │   ├── CitationModal.tsx  # BibTeX and plain text citation generator
│       │   ├── ScrapeModal.tsx    # arXiv harvesting control modal
│       │   └── Charts.tsx         # Chart.js time-series & distribution
│       └── views/                 # Top-level view pages
│           ├── DashboardView.tsx  # Main analytics overview
│           ├── PapersView.tsx     # Full paper explorer with multi-filter
│           ├── TrendsView.tsx     # Trend explorer & topic comparison
│           ├── TopicDetailView.tsx # Deep-dive topic analytics
│           ├── SavedPapersView.tsx # Reading list and notes
│           ├── DiscoveryView.tsx  # Personalized recommendations
│           ├── HistoryView.tsx    # Scrape audit logs
│           ├── BriefView.tsx      # Daily research executive brief
│           └── SettingsView.tsx   # System & API configuration
├── tests/                         # Automated test suite
│   ├── test_arxiv_parser.py       # Parser & cleaner unit tests
│   ├── test_db_service.py         # SQLite CRUD & relation tests
│   ├── test_trend_service.py      # Mathematical formula unit tests
│   ├── test_gemini_service.py     # Schema & fallback tests
│   └── test_integration.py       # End-to-end pipeline test
└── docs/
    └── ARCHITECTURE.md            # Deep system architecture & formulas
```

---

## Data Source Attribution & Etiquette

- Preprint metadata is retrieved via the **arXiv API** (`http://export.arxiv.org/api/query`).
- *Attribution*: Thank you to arXiv for use of its open access interoperability.
- *Etiquette*: The ingestion pipeline strictly respects arXiv's Terms of Use by enforcing an automated minimum delay of 3.0 seconds between queries and avoiding batch query bursts.

---

## Limitations & Future Roadmap

- **Single-Node SQLite**: SQLite is lightweight and fast for local single-user use, but scaling to multi-tenant write loads would benefit from PostgreSQL.
- **Preprint Coverage**: Currently focuses on computer science and machine learning preprints. Future versions will support bioRxiv, medRxiv, and OpenAlex.
- **Citation Graph Traversal**: Future releases can integrate Semantic Scholar citations to overlay citation count graphs onto the temporal trend score.

---

## License

This project is licensed under the [MIT License](LICENSE).
