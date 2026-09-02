export interface PaperListItem {
  id: number;
  arxiv_id: string;
  title: string;
  abstract: string;
  published_date: string;
  updated_date: string;
  primary_category: string;
  pdf_url: string;
  page_url: string;
  ai_summary?: string;
  paper_type?: string;
  difficulty_level?: string;
  impact_area?: string;
  ai_analyzed: boolean;
  trend_score: number;
  freshness_score: number;
  authors: string[];
  categories: string[];
  topics: string[];
  keywords: string[];
  is_saved: boolean;
  reading_status?: 'unread' | 'reading' | 'read';
}

export interface PaperDetail extends PaperListItem {
  doi?: string;
  journal_ref?: string;
  comment?: string;
  first_seen: string;
  last_seen: string;
  personal_note?: string;
  why_showing_up?: {
    recency_factor?: string;
    category_activity?: string;
    trend_index?: string;
    topic_relevance?: string;
  };
}

export interface PaperListResponse {
  papers: PaperListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardMetrics {
  total_papers: number;
  papers_today: number;
  active_categories_count: number;
  unique_authors_count: number;
  fastest_growing_topic: {
    name: string;
    growth: number;
    count: number;
  };
  most_active_category: {
    id: string;
    name: string;
    count: number;
  };
  papers_per_day: { date: string; count: number }[];
  category_distribution: { id: string; name: string; count: number }[];
  top_keywords: { keyword: string; count: number }[];
  trending_topics: {
    name: string;
    slug: string;
    current_count: number;
    previous_count: number;
    percentage_change: number;
    total_count: number;
  }[];
}

export interface TrendsExplorerData {
  window_days: number;
  topics: {
    name: string;
    slug: string;
    current_count: number;
    prior_count: number;
    percentage_change: number;
    total_count: number;
  }[];
  keywords: {
    keyword: string;
    current_count: number;
    prior_count: number;
    percentage_change: number;
    total_count: number;
  }[];
  categories: {
    id: string;
    name: string;
    current_count: number;
    prior_count: number;
    percentage_change: number;
    total_count: number;
  }[];
  authors: {
    name: string;
    paper_count: number;
    categories: string[];
  }[];
}

export interface TopicDetail {
  id: number;
  name: string;
  slug: string;
  total_papers: number;
  timeline: { date: string; count: number }[];
  related_keywords: { keyword: string; count: number }[];
  related_categories: { category: string; count: number }[];
  active_authors: { name: string; count: number }[];
  papers: PaperListItem[];
}

export interface ScrapeRun {
  id: number;
  start_time: string;
  end_time?: string;
  selected_categories: string[];
  requested_count: number;
  fetched_count: number;
  new_papers: number;
  updated_papers: number;
  failed_records: number;
  ai_analyses_completed: number;
  status: string;
  error_message?: string;
}

export interface DailyBrief {
  date: string;
  period: string;
  new_papers_count: number;
  top_categories: { category: string; count: number }[];
  fastest_growing_topic: string;
  notable_papers: {
    id: number;
    title: string;
    arxiv_id: string;
    primary_category: string;
    trend_score: number;
    ai_summary?: string;
    paper_type?: string;
  }[];
  top_keywords: string[];
  executive_summary: string;
}

export interface RecommendedPaper {
  id: number;
  title: string;
  abstract: string;
  published_date: string;
  primary_category: string;
  trend_score: number;
  ai_summary?: string;
  paper_type?: string;
  recommendation_score: number;
  recommendation_reason: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_enabled: boolean;
}

export interface SettingsData {
  categories: Category[];
  default_fetch_amount: number;
  default_date_window: string;
  gemini_model: string;
  ai_analysis_enabled: boolean;
  gemini_max_requests_per_minute: number;
  export_format: string;
  gemini_api_key_configured: boolean;
  gemini_api_key_masked: string;
}

export interface CitationData {
  arxiv_id: string;
  title: string;
  plain_text: string;
  bibtex: string;
}
