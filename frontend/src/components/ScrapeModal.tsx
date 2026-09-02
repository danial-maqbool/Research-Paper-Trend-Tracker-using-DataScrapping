import React, { useState, useEffect } from 'react';
import { X, DownloadCloud, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Category } from '../types';

interface ScrapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScrapeStarted: () => void;
}

export const ScrapeModal: React.FC<ScrapeModalProps> = ({ isOpen, onClose, onScrapeStarted }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState<number>(50);
  const [dateWindow, setDateWindow] = useState<string>('7d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('submittedDate');
  const [sortOrder, setSortOrder] = useState<string>('descending');
  const [runAi, setRunAi] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.getSettings()
      .then((settings) => {
        setCategories(settings.categories);
        setSelectedCats(settings.categories.filter((c) => c.is_enabled).map((c) => c.id));
        setMaxResults(settings.default_fetch_amount || 50);
        setDateWindow(settings.default_date_window || '7d');
        setRunAi(settings.ai_analysis_enabled);
      })
      .catch((err) => console.error(err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleCat = (catId: string) => {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCats.length === 0) {
      setError('Please select at least one arXiv category.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await api.startScrape({
        categories: selectedCats,
        max_results: maxResults,
        date_window: dateWindow,
        sort_by: sortBy,
        sort_order: sortOrder,
        run_ai: runAi,
      });
      onScrapeStarted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate scrape task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Fetch Research Papers from arXiv
              </h3>
              <p className="text-xs text-slate-400">
                Harvest preprints directly via official arXiv API feed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-300">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Categories Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Target Research Disciplines
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedCats(categories.map((c) => c.id))}
                  className="text-brand-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedCats([])}
                  className="text-slate-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const checked = selectedCats.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    onClick={() => handleToggleCat(cat.id)}
                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      checked
                        ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-slate-700 text-brand-500 focus:ring-0"
                    />
                    <div className="truncate">
                      <span className="font-mono font-medium block text-[11px]">{cat.id}</span>
                      <span className="truncate block text-[10px] text-slate-400">{cat.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Controls: Date Window & Max Papers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] block mb-1.5">
                Publication Date Window
              </label>
              <select
                value={dateWindow}
                onChange={(e) => setDateWindow(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="3d">Last 3 Days</option>
                <option value="7d">Last 7 Days (Recommended)</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Recent (Unrestricted)</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] block mb-1.5">
                Max Papers to Harvest
              </label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="25">25 Papers (Fast)</option>
                <option value="50">50 Papers (Standard)</option>
                <option value="100">100 Papers</option>
                <option value="200">200 Papers (Deep)</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs if custom selected */}
          {dateWindow === 'custom' && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Sort Controls & AI Synthesis Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] block mb-1.5">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="submittedDate">Submission Date</option>
                <option value="lastUpdatedDate">Last Updated Date</option>
                <option value="relevance">Relevance</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label
                onClick={() => setRunAi(!runAi)}
                className={`flex items-center space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  runAi
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <span className="font-semibold block text-[11px]">Generate AI Summaries</span>
                  <span className="text-[10px] text-slate-400">Run Gemini 3.8 Flash synthesis during fetch</span>
                </div>
                <input
                  type="checkbox"
                  checked={runAi}
                  onChange={() => {}}
                  className="rounded border-slate-700 text-purple-600 focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all shadow-md shadow-brand-600/20"
            >
              <DownloadCloud className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Starting Fetch...' : 'Start arXiv Harvest'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
