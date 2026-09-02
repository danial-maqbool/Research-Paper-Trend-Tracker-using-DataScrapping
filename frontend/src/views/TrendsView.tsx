import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Hash,
  Layers,
  Users,
  Calendar,
  Download,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Search
} from 'lucide-react';
import { TrendsExplorerData } from '../types';
import { api } from '../api/client';

interface TrendsViewProps {
  onSelectTopic: (topic: string) => void;
  onSelectAuthor?: (author: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  onSelectTopic,
  onSelectAuthor,
  onSelectCategory,
}) => {
  const [window, setWindow] = useState<'1d' | '7d' | '30d'>('7d');
  const [data, setData] = useState<TrendsExplorerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Topic Comparison states
  const [compareTopicA, setCompareTopicA] = useState<string>('');
  const [compareTopicB, setCompareTopicB] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState<boolean>(false);

  const loadTrends = () => {
    setLoading(true);
    api.getTrendsExplorer(window)
      .then((res) => {
        setData(res);
        if (res.topics && res.topics.length >= 2 && !compareTopicA) {
          setCompareTopicA(res.topics[0].name);
          setCompareTopicB(res.topics[1].name);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTrends();
  }, [window]);

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compareTopicA || !compareTopicB) return;
    setComparing(true);
    try {
      const res = await api.compareTopics(compareTopicA, compareTopicB);
      setComparisonResult(res);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header & Window Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 tracking-wider uppercase mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Temporal Trend Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Research Velocity & Concept Acceleration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze shifting interest across preprint topics, keywords, active disciplines, and high-volume contributors.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Window Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['1d', '7d', '30d'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  window === w
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w === '1d' ? '24 Hours' : w === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Export Dropdown */}
          <a
            href={api.getExportTrendsUrl('csv', window)}
            download
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all"
            title="Download CSV trend snapshot"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span>Export</span>
          </a>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Computing trend velocity metrics...</p>
        </div>
      ) : (
        <>
          {/* Top Grid: Trending Topics & Trending Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trending Topics */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>Trending Topics ({window})</span>
                  </h3>
                  <p className="text-xs text-slate-400">Comparing current vs previous {window} period</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Click to inspect</span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {data?.topics && data.topics.length > 0 ? (
                  data.topics.slice(0, 10).map((t) => (
                    <div
                      key={t.name}
                      onClick={() => onSelectTopic(t.name)}
                      className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-brand-400"></div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200 hover:text-brand-300">
                            {t.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {t.total_count} total papers tracked
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-slate-200 font-semibold">{t.current_count}</span>
                          <span className="text-slate-500 text-[10px] ml-1">({t.prior_count})</span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            t.percentage_change >= 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {t.percentage_change >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                          )}
                          {Math.abs(t.percentage_change)}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No topics recorded yet.</p>
                )}
              </div>
            </div>

            {/* Trending Keywords */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-400" />
                    <span>Trending Keywords ({window})</span>
                  </h3>
                  <p className="text-xs text-slate-400">Fastest accelerating technical keywords</p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {data?.keywords && data.keywords.length > 0 ? (
                  data.keywords.slice(0, 10).map((k) => (
                    <div
                      key={k.keyword}
                      className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500 text-xs">#</span>
                        <span className="text-xs font-medium text-slate-200">{k.keyword}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-slate-200 font-semibold">{k.current_count}</span>
                          <span className="text-slate-500 text-[10px] ml-1">({k.prior_count})</span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            k.percentage_change >= 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {k.percentage_change >= 0 ? '+' : ''}
                          {k.percentage_change}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No keywords recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Grid: Active Categories & Active Authors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Categories */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Category Growth</span>
                </h3>
                <p className="text-xs text-slate-400">Activity shifts across arXiv category classifications</p>
              </div>

              <div className="space-y-2">
                {data?.categories && data.categories.length > 0 ? (
                  data.categories.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCategory && onSelectCategory(c.id)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-semibold text-brand-400">{c.id}</span>
                          <span className="text-xs text-slate-300">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{c.total_count} papers total</span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <span className="text-slate-200 font-semibold">{c.current_count} preprints</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.percentage_change >= 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {c.percentage_change >= 0 ? `+${c.percentage_change}%` : `${c.percentage_change}%`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No categories active in window.</p>
                )}
              </div>
            </div>

            {/* Active Authors */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Most Active Authors</span>
                </h3>
                <p className="text-xs text-slate-400">Researchers with the most submissions in this window</p>
              </div>

              <div className="space-y-2">
                {data?.authors && data.authors.length > 0 ? (
                  data.authors.slice(0, 10).map((a) => (
                    <div
                      key={a.name}
                      onClick={() => onSelectAuthor && onSelectAuthor(a.name)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{a.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {a.categories.map((cat) => (
                            <span
                              key={cat}
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs">
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          {a.paper_count} papers
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No author activity detected in this window.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Side-by-Side Research Topic Comparison (Requirement #35) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                <GitCompare className="w-4 h-4" />
                <span>Feature: Side-by-Side Topic Comparison</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Compare Research Dynamics Between Two Topics
              </h3>
              <p className="text-xs text-slate-400">
                Directly compare literature volume, active researchers, taxonomy overlap, and momentum.
              </p>
            </div>

            {/* Comparison Form */}
            <form onSubmit={handleRunComparison} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={compareTopicA}
                onChange={(e) => setCompareTopicA(e.target.value)}
                placeholder="Topic A (e.g. Large Language Models)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <span className="self-center font-bold text-xs text-slate-500">VS</span>
              <input
                type="text"
                value={compareTopicB}
                onChange={(e) => setCompareTopicB(e.target.value)}
                placeholder="Topic B (e.g. Diffusion Models)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={comparing}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
              >
                <GitCompare className="w-4 h-4" />
                <span>{comparing ? 'Comparing...' : 'Compare Dynamics'}</span>
              </button>
            </form>

            {/* Comparison Result Cards */}
            {comparisonResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
                {/* Topic A Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-brand-400 text-sm">{comparisonResult.topic_a.name}</h4>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-300">
                      {comparisonResult.topic_a.total_papers} papers
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Top Keywords</span>
                    <div className="flex flex-wrap gap-1">
                      {comparisonResult.topic_a.related_keywords?.slice(0, 5).map((k: any) => (
                        <span key={k.keyword} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          #{k.keyword} ({k.count})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Top Categories</span>
                    <div className="flex flex-wrap gap-1">
                      {comparisonResult.topic_a.related_categories?.slice(0, 3).map((c: any) => (
                        <span key={c.category} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {c.category} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Topic B Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-purple-400 text-sm">{comparisonResult.topic_b.name}</h4>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                      {comparisonResult.topic_b.total_papers} papers
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Top Keywords</span>
                    <div className="flex flex-wrap gap-1">
                      {comparisonResult.topic_b.related_keywords?.slice(0, 5).map((k: any) => (
                        <span key={k.keyword} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          #{k.keyword} ({k.count})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Top Categories</span>
                    <div className="flex flex-wrap gap-1">
                      {comparisonResult.topic_b.related_categories?.slice(0, 3).map((c: any) => (
                        <span key={c.category} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {c.category} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
