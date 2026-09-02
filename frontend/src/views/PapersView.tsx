import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Flame,
  FileText,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PaperListItem, Category } from '../types';
import { api } from '../api/client';
import { PaperCard } from '../components/PaperCard';

interface PapersViewProps {
  onSelectPaper: (id: number) => void;
  onOpenCitation: (id: number) => void;
  onSelectTopic: (topic: string) => void;
  initialCategory?: string;
  initialTopic?: string;
}

export const PapersView: React.FC<PapersViewProps> = ({
  onSelectPaper,
  onOpenCitation,
  onSelectTopic,
  initialCategory,
  initialTopic,
}) => {
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [category, setCategory] = useState<string>(initialCategory || '');
  const [paperType, setPaperType] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [savedOnly, setSavedOnly] = useState<boolean>(false);
  const [minTrendScore, setMinTrendScore] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || '');
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  useEffect(() => {
    api.getSettings().then((s) => setCategoriesList(s.categories)).catch((e) => console.error(e));
  }, []);

  const loadPapers = () => {
    setLoading(true);
    api.getPapers({
      q: searchQuery,
      category: category || undefined,
      paper_type: paperType || undefined,
      difficulty: difficulty || undefined,
      sort_by: sortBy,
      saved_only: savedOnly,
      min_trend_score: minTrendScore ? Number(minTrendScore) : undefined,
      topic: selectedTopic || undefined,
      page: page,
      page_size: pageSize,
    })
      .then((res) => {
        setPapers(res.papers);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPapers();
  }, [page, category, paperType, difficulty, sortBy, savedOnly, selectedTopic]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPapers();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('');
    setPaperType('');
    setDifficulty('');
    setSortBy('newest');
    setSavedOnly(false);
    setMinTrendScore('');
    setSelectedTopic('');
    setPage(1);
  };

  const handleBookmark = async (paperId: number, isSaved: boolean) => {
    try {
      if (isSaved) {
        await api.removeSavedPaper(paperId);
      } else {
        await api.savePaper(paperId);
      }
      loadPapers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async (paperId: number) => {
    try {
      await api.analyzePaper(paperId);
      loadPapers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Search and Filters Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Main Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across title, abstract, authors, keywords, topics, or arXiv ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium transition-all"
            >
              Search
            </button>
          </form>

          {/* Export Dropdowns */}
          <div className="flex items-center space-x-2">
            <a
              href={api.getExportPapersUrl('csv', { q: searchQuery, category: category || undefined, saved_only: savedOnly })}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
              title="Export filtered records as CSV"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>Export CSV</span>
            </a>
            <a
              href={api.getExportPapersUrl('json', { q: searchQuery, category: category || undefined, saved_only: savedOnly })}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
              title="Export filtered records as JSON"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export JSON</span>
            </a>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
          {/* Category Filter */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Categories</option>
              {categoriesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Paper Type Filter */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Paper Type</label>
            <select
              value={paperType}
              onChange={(e) => {
                setPaperType(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Types</option>
              <option value="new method">New Method</option>
              <option value="benchmark">Benchmark</option>
              <option value="survey">Survey</option>
              <option value="dataset">Dataset</option>
              <option value="system">System</option>
              <option value="theoretical work">Theoretical Work</option>
              <option value="evaluation study">Evaluation Study</option>
              <option value="application paper">Application Paper</option>
              <option value="position paper">Position Paper</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="specialist">Specialist</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Sort Order</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="trend">Trend Score</option>
              <option value="title">Alphabetical (Title)</option>
            </select>
          </div>

          {/* Min Trend Score */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Min Trend Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={minTrendScore}
              onChange={(e) => {
                setMinTrendScore(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. 50"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Toggle Saved & Reset */}
          <div className="flex items-end space-x-1.5">
            <button
              type="button"
              onClick={() => {
                setSavedOnly(!savedOnly);
                setPage(1);
              }}
              className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                savedOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>Saved</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedTopic || category || paperType || difficulty || savedOnly || searchQuery) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px]">
            <span className="text-slate-500 font-medium mr-1">Active filters:</span>
            {selectedTopic && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                Topic: {selectedTopic}
                <button onClick={() => setSelectedTopic('')} className="hover:text-white">×</button>
              </span>
            )}
            {category && (
              <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1">
                Cat: {category}
                <button onClick={() => setCategory('')} className="hover:text-white">×</button>
              </span>
            )}
            {paperType && (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                Type: {paperType}
                <button onClick={() => setPaperType('')} className="hover:text-white">×</button>
              </span>
            )}
            {savedOnly && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                Bookmarked Only
                <button onClick={() => setSavedOnly(false)} className="hover:text-white">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <p>
          Showing <span className="font-semibold text-slate-200">{papers.length}</span> of{' '}
          <span className="font-semibold text-slate-200">{total}</span> papers
        </p>
        <p className="font-mono text-[11px]">
          Page {page} of {totalPages}
        </p>
      </div>

      {/* Papers Cards Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Querying paper database...</p>
        </div>
      ) : papers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onSelectPaper={onSelectPaper}
              onBookmark={handleBookmark}
              onCopyCitation={onOpenCitation}
              onSelectTopic={(t) => {
                setSelectedTopic(t);
                setPage(1);
              }}
              onAnalyze={handleAnalyze}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No matching preprints found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms, clearing filters, or fetching additional preprints from arXiv.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
