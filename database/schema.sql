-- SQLite Database Schema for Research Paper Trend Tracker

-- Papers table: Main entity storing paper metadata
CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arxiv_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    published_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    primary_category TEXT NOT NULL,
    doi TEXT,
    journal_ref TEXT,
    pdf_url TEXT NOT NULL,
    page_url TEXT NOT NULL,
    comment TEXT,
    ai_summary TEXT,
    paper_type TEXT,
    difficulty_level TEXT,
    impact_area TEXT,
    ai_analyzed INTEGER DEFAULT 0,
    ai_analyzed_at TEXT,
    trend_score REAL DEFAULT 0.0,
    freshness_score REAL DEFAULT 0.0,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Authors table: Normalized authors
CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

-- Paper-Authors junction
CREATE TABLE IF NOT EXISTS paper_authors (
    paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (paper_id, author_id)
);

-- Categories table: arXiv categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled INTEGER DEFAULT 1
);

-- Paper-Categories junction
CREATE TABLE IF NOT EXISTS paper_categories (
    paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (paper_id, category_id)
);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL
);

-- Paper-Keywords junction
CREATE TABLE IF NOT EXISTS paper_keywords (
    paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (paper_id, keyword_id)
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
);

-- Paper-Topics junction
CREATE TABLE IF NOT EXISTS paper_topics (
    paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (paper_id, topic_id)
);

-- Saved Papers: Bookmarks with notes and reading status
CREATE TABLE IF NOT EXISTS saved_papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id INTEGER UNIQUE NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    saved_date TEXT NOT NULL,
    reading_status TEXT CHECK(reading_status IN ('unread', 'reading', 'read')) DEFAULT 'unread',
    personal_note TEXT DEFAULT '',
    updated_at TEXT NOT NULL
);

-- Scrape Runs: Audit log of data collection runs
CREATE TABLE IF NOT EXISTS scrape_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    selected_categories TEXT NOT NULL,
    requested_count INTEGER NOT NULL,
    fetched_count INTEGER DEFAULT 0,
    new_papers INTEGER DEFAULT 0,
    updated_papers INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    ai_analyses_completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running',
    error_message TEXT
);

-- Trend Snapshots: Point-in-time trend metrics
CREATE TABLE IF NOT EXISTS trend_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,
    category_counts TEXT,
    top_topics TEXT,
    top_keywords TEXT,
    total_papers INTEGER DEFAULT 0
);

-- App Settings: Key-value configuration store
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_published ON papers(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_papers_primary_cat ON papers(primary_category);
CREATE INDEX IF NOT EXISTS idx_papers_trend_score ON papers(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_papers_ai_analyzed ON papers(ai_analyzed);
CREATE INDEX IF NOT EXISTS idx_paper_authors_paper ON paper_authors(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_authors_author ON paper_authors(author_id);
CREATE INDEX IF NOT EXISTS idx_paper_categories_cat ON paper_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_paper_keywords_kw ON paper_keywords(keyword_id);
CREATE INDEX IF NOT EXISTS idx_paper_topics_topic ON paper_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_saved_papers_status ON saved_papers(reading_status);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_time ON scrape_runs(start_time DESC);

-- Seed Default arXiv Categories
INSERT OR IGNORE INTO categories (id, name, description, is_enabled) VALUES
('cs.AI', 'Artificial Intelligence', 'Covers all areas of AI except Natural Language, Robotics, and Vision', 1),
('cs.LG', 'Machine Learning', 'Papers on all aspects of machine learning, deep learning, statistical learning', 1),
('cs.CL', 'Computation and Language', 'Natural language processing, computational linguistics, speech', 1),
('cs.CV', 'Computer Vision', 'Image processing, computer vision, pattern recognition, scene understanding', 1),
('cs.RO', 'Robotics', 'Robotics systems, kinematics, control, planning, navigation, manipulation', 1),
('cs.CR', 'Cryptography and Security', 'Cryptography, system security, privacy, network security, authentication', 1),
('cs.HC', 'Human-Computer Interaction', 'User interfaces, interactive systems, accessibility, collaborative work', 1),
('cs.DC', 'Distributed Computing', 'Distributed systems, cloud computing, parallel algorithms, cluster computing', 1),
('cs.IR', 'Information Retrieval', 'Search engines, indexing, ranking, recommender systems, web mining', 1);
