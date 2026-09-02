import {
  PaperListResponse,
  PaperDetail,
  DashboardMetrics,
  TrendsExplorerData,
  TopicDetail,
  ScrapeRun,
  DailyBrief,
  RecommendedPaper,
  SettingsData,
  CitationData
} from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // fallback to status text
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Papers
  getPapers: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    return request<PaperListResponse>(`/papers?${query.toString()}`);
  },

  getPaperById: (id: number) => request<PaperDetail>(`/papers/${id}`),

  analyzePaper: (id: number) =>
    request<{ message: string; analysis: any; paper: PaperDetail }>(`/papers/${id}/analyze`, {
      method: 'POST',
    }),

  getCitation: (id: number) => request<CitationData>(`/papers/${id}/citation`),

  // Dashboard & Trends
  getDashboard: () => request<DashboardMetrics>('/trends/dashboard'),

  getTrendsExplorer: (window: string = '7d') =>
    request<TrendsExplorerData>(`/trends/explorer?window=${window}`),

  getTopicDetail: (slugOrName: string) =>
    request<TopicDetail>(`/topics/${encodeURIComponent(slugOrName)}`),

  compareTopics: (topicA: string, topicB: string) =>
    request<{ topic_a: TopicDetail; topic_b: TopicDetail; comparison: any }>('/trends/compare', {
      method: 'POST',
      body: JSON.stringify({ topic_a: topicA, topic_b: topicB }),
    }),

  // Saved / Bookmarks
  getSavedPapers: (status?: string, page: number = 1) => {
    const q = status ? `?status=${status}&page=${page}` : `?page=${page}`;
    return request<{ saved_papers: any[]; total: number }>(`/saved${q}`);
  },

  savePaper: (paperId: number, readingStatus: string = 'unread', personalNote: string = '') =>
    request<{ message: string; paper_id: number }>('/saved', {
      method: 'POST',
      body: JSON.stringify({ paper_id: paperId, reading_status: readingStatus, personal_note: personalNote }),
    }),

  updateSavedPaper: (paperId: number, readingStatus?: string, personalNote?: string) =>
    request<{ message: string }>(`/saved/${paperId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reading_status: readingStatus, personal_note: personalNote }),
    }),

  removeSavedPaper: (paperId: number) =>
    request<{ message: string }>(`/saved/${paperId}`, {
      method: 'DELETE',
    }),

  // Scraping
  startScrape: (payload: {
    categories?: string[];
    max_results?: number;
    date_window?: string;
    sort_by?: string;
    sort_order?: string;
    run_ai?: boolean;
  }) =>
    request<{ message: string; run_id: number }>('/scrape', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getScrapeStatus: () => request<{ is_active: boolean }>('/scrape/status'),

  getScrapeRuns: (limit: number = 20) => request<ScrapeRun[]>(`/scrape/runs?limit=${limit}`),

  // Daily Research Brief
  getDailyBrief: () => request<DailyBrief>('/brief'),

  // Recommendations
  getRecommendations: (limit: number = 8) =>
    request<RecommendedPaper[]>(`/recommendations?limit=${limit}`),

  // Settings
  getSettings: () => request<SettingsData>('/settings'),

  updateSettings: (payload: Partial<SettingsData> & { gemini_api_key?: string }) =>
    request<{ message: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleCategory: (categoryId: string, isEnabled: boolean) =>
    request<{ message: string; is_enabled: boolean }>(`/settings/categories/${categoryId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ is_enabled: isEnabled }),
    }),

  // Export URLs
  getExportPapersUrl: (format: 'csv' | 'json', params: Record<string, any> = {}) => {
    const query = new URLSearchParams({ format, ...params });
    return `/api/export/papers?${query.toString()}`;
  },

  getExportTrendsUrl: (format: 'csv' | 'json', window: string = '7d') => {
    return `/api/export/trends?format=${format}&window=${window}`;
  },
};
