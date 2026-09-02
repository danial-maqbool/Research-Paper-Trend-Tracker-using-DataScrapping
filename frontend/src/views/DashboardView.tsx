import React, { useEffect, useState } from 'react';
import {
  FileText,
  Calendar,
  Layers,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Flame,
  Hash,
  RefreshCw
} from 'lucide-react';
import { DashboardMetrics, PaperListItem } from '../types';
import { api } from '../api/client';
import { KpiCard } from '../components/KpiCard';
import { PapersOverTimeChart, CategoryDistributionChart } from '../components/Charts';
import { PaperCard } from '../components/PaperCard';

interface DashboardViewProps {
  onSelectPaper: (id: number) => void;
  onOpenCitation: (id: number) => void;
  onSelectTopic: (topic: string) => void;
  onViewAllPapers: () => void;
  onOpenScrapeModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectPaper,
  onOpenCitation,
  onSelectTopic,
  onViewAllPapers,
  onOpenScrapeModal,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [latestPapers, setLatestPapers] = useState<PaperListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api.getDashboard(),
      api.getPapers({ page_size: 6, sort_by: 'trend' })
    ])
      .then(([dashData, papersData]) => {
        setMetrics(dashData);
        setLatestPapers(papersData.papers);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleBookmark = async (paperId: number, isSaved: boolean) => {
    try {
      if (isSaved) {
        await api.removeSavedPaper(paperId);
      } else {
        await api.savePaper(paperId);
      }
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async (paperId: number) => {
    try {
      await api.analyzePaper(paperId);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400">Loading research trends & metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner / Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/40 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Preprint Literature Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Research Literature Pulse & Trend Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Harvesting preprints directly from arXiv with automated Gemini 3.8 Flash synthesis, keyword taxonomy extraction, and empirical trend velocity scoring.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenScrapeModal}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all shadow-md shadow-brand-600/20"
          >
            Fetch Preprints
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Total Papers"
          value={metrics?.total_papers || 0}
          icon={FileText}
          subtitle="Preprints Tracked"
          colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
        />
        <KpiCard
          title="New Today"
          value={metrics?.papers_today || 0}
          icon={Calendar}
          subtitle="Latest Submissions"
          colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />
        <KpiCard
          title="Fastest Growing"
          value={metrics?.fastest_growing_topic?.name || 'LLM Reasoning'}
          subtitle={`${metrics?.fastest_growing_topic?.count || 0} papers (7d)`}
          change={metrics?.fastest_growing_topic?.growth}
          icon={TrendingUp}
          colorClass="text-purple-400 bg-purple-500/10 border-purple-500/20"
        />
        <KpiCard
          title="Top Category"
          value={metrics?.most_active_category?.id || 'cs.AI'}
          subtitle={metrics?.most_active_category?.name || 'Artificial Intelligence'}
          icon={Layers}
          colorClass="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
        />
        <KpiCard
          title="Categories"
          value={metrics?.active_categories_count || 0}
          subtitle="Active Fields"
          icon={Layers}
          colorClass="text-sky-400 bg-sky-500/10 border-sky-500/20"
        />
        <KpiCard
          title="Unique Authors"
          value={metrics?.unique_authors_count || 0}
          subtitle="Collaborators"
          icon={Users}
          colorClass="text-amber-400 bg-amber-500/10 border-amber-500/20"
        />
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Papers Over Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Publication Velocity
              </h3>
              <p className="text-xs text-slate-400">Preprints published over the last 14 days</p>
            </div>
            <span className="text-[11px] font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              Daily Volume
            </span>
          </div>
          {metrics && metrics.papers_per_day.length > 0 ? (
            <PapersOverTimeChart data={metrics.papers_per_day} />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No daily records yet. Fetch preprints to populate timeline.
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Category Distribution
              </h3>
              <p className="text-xs text-slate-400">Papers aggregated by primary arXiv taxonomy</p>
            </div>
            <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Field Share
            </span>
          </div>
          {metrics && metrics.category_distribution.length > 0 ? (
            <CategoryDistributionChart data={metrics.category_distribution} />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No category distribution yet.
            </div>
          )}
        </div>
      </div>

      {/* Trending Topics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <span>Trending Research Topics</span>
            </h3>
            <p className="text-xs text-slate-400">
              High-growth concepts detected across current versus previous 7-day windows
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Topic Area</th>
                <th className="py-2.5 px-4 text-center">Recent (7d)</th>
                <th className="py-2.5 px-4 text-center">Previous (7d)</th>
                <th className="py-2.5 px-4 text-center">Velocity Shift</th>
                <th className="py-2.5 px-4 text-right">Total Tracked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {metrics?.trending_topics && metrics.trending_topics.length > 0 ? (
                metrics.trending_topics.map((t) => (
                  <tr
                    key={t.name}
                    onClick={() => onSelectTopic(t.name)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                      <span className="hover:text-brand-300 transition-colors">{t.name}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{t.current_count}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{t.previous_count}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          t.percentage_change >= 0
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {t.percentage_change >= 0 ? `+${t.percentage_change}%` : `${t.percentage_change}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{t.total_count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No topic trends detected yet. Trigger a scrape to populate topics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trending Keywords Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Prominent Technical Keywords
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Frequency in database</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {metrics?.top_keywords && metrics.top_keywords.length > 0 ? (
            metrics.top_keywords.map((kw) => (
              <span
                key={kw.keyword}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <span className="text-slate-500">#</span>
                <span>{kw.keyword}</span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-brand-400">
                  {kw.count}
                </span>
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-500">No keywords recorded yet.</p>
          )}
        </div>
      </div>

      {/* High-Velocity / Trending Papers Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Highest Trend Score Papers</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by our empirical formula combining recency, category velocity, and keyword prominence
            </p>
          </div>
          <button
            onClick={onViewAllPapers}
            className="flex items-center space-x-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>View All Papers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestPapers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {latestPapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onSelectPaper={onSelectPaper}
                onBookmark={handleBookmark}
                onCopyCitation={onOpenCitation}
                onSelectTopic={onSelectTopic}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">No preprints in database yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the "Fetch Papers" button to harvest the latest preprints from arXiv across machine learning disciplines.
            </p>
            <button
              onClick={onOpenScrapeModal}
              className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium"
            >
              Start Harvesting
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
