from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Gemini Structured Output ---
class GeminiAnalysisResult(BaseModel):
    summary: str = Field(..., description="2 to 3 concise sentences summarizing the paper's core contributions and findings.")
    keywords: List[str] = Field(..., description="3 to 8 specific technical research keywords extracted from the paper.")
    topics: List[str] = Field(..., description="1 to 3 high-level research topics (e.g. Large Language Models, Multimodal Learning).")
    paper_type: str = Field(
        ...,
        description="One of: 'new method', 'benchmark', 'survey', 'dataset', 'system', 'theoretical work', 'evaluation study', 'application paper', 'position paper'"
    )
    technical_difficulty: str = Field(
        ...,
        description="One of: 'beginner', 'intermediate', 'advanced', 'specialist'"
    )
    potential_impact_area: str = Field(
        ...,
        description="High-level impact field, e.g. Healthcare, Edge Computing, Agentic Systems, Robotics, Security"
    )

# --- Paper Author & Category ---
class AuthorBase(BaseModel):
    id: Optional[int] = None
    name: str

class CategoryBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_enabled: Optional[bool] = True

# --- Paper Models ---
class PaperListItem(BaseModel):
    id: int
    arxiv_id: str
    title: str
    abstract: str
    published_date: str
    updated_date: str
    primary_category: str
    pdf_url: str
    page_url: str
    ai_summary: Optional[str] = None
    paper_type: Optional[str] = None
    difficulty_level: Optional[str] = None
    impact_area: Optional[str] = None
    ai_analyzed: bool
    trend_score: float
    freshness_score: float
    authors: List[str] = []
    categories: List[str] = []
    topics: List[str] = []
    keywords: List[str] = []
    is_saved: bool = False
    reading_status: Optional[str] = None

class PaperDetail(PaperListItem):
    doi: Optional[str] = None
    journal_ref: Optional[str] = None
    comment: Optional[str] = None
    first_seen: str
    last_seen: str
    personal_note: Optional[str] = None
    why_showing_up: Dict[str, Any] = {}

class PaperListResponse(BaseModel):
    papers: List[PaperListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

# --- Scraping ---
class ScrapeRequest(BaseModel):
    categories: Optional[List[str]] = None
    max_results: int = 50
    date_window: str = "7d" # 24h, 3d, 7d, 30d, all, custom
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    sort_by: str = "submittedDate" # submittedDate, lastUpdatedDate, relevance
    sort_order: str = "descending" # descending, ascending
    run_ai: bool = False # AI analysis can be run concurrently or on-demand

class ScrapeRunItem(BaseModel):
    id: int
    start_time: str
    end_time: Optional[str] = None
    selected_categories: List[str]
    requested_count: int
    fetched_count: int
    new_papers: int
    updated_papers: int
    failed_records: int
    ai_analyses_completed: int
    status: str
    error_message: Optional[str] = None

# --- Bookmarks / Saved ---
class SavedPaperCreate(BaseModel):
    paper_id: int
    reading_status: str = "unread"
    personal_note: str = ""

class SavedPaperUpdate(BaseModel):
    reading_status: Optional[str] = None
    personal_note: Optional[str] = None

# --- Citations ---
class CitationResponse(BaseModel):
    arxiv_id: str
    title: str
    plain_text: str
    bibtex: str

# --- Settings ---
class SettingsPayload(BaseModel):
    default_categories: List[str]
    default_fetch_amount: int
    default_date_window: str
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    ai_analysis_enabled: bool = True
    gemini_max_requests_per_minute: int = 15
    export_format: str = "csv"
