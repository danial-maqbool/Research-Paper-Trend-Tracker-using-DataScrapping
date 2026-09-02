import React, { useState, useEffect } from 'react';
import { Newspaper, Sparkles, Calendar, Layers, Flame, FileText, ArrowRight } from 'lucide-react';
import { DailyBrief } from '../types';
import { api } from '../api/client';

interface BriefViewProps {
  onSelectPaper: (id: number) => void;
}

export const BriefView: React.FC<BriefViewProps> = ({ onSelectPaper }) => {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    api.getDailyBrief()
      .then((data) => setBrief(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 tracking-wider uppercase mb-1">
            <Newspaper className="w-4 h-4" />
            <span>Executive Intelligence Brief</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Daily Preprint Research Synthesis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Grounded AI analysis summarizing arXiv preprint submissions and velocity spikes over the last 72 hours.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-brand-400" />
          <span>{brief?.date || 'Today'}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Synthesizing research intelligence brief...</p>
        </div>
      ) : brief ? (
        <>
          {/* KPI Mini-bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">72h Preprints</span>
              <span className="text-xl font-bold text-white font-mono">{brief.new_papers_count}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Fastest Topic</span>
              <span className="text-sm font-bold text-purple-300 truncate block mt-1">{brief.fastest_growing_topic}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Lead Category</span>
              <span className="text-sm font-bold text-brand-400 truncate block mt-1">
                {brief.top_categories[0]?.category || 'cs.AI'}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Synthesized By</span>
              <span className="text-xs font-bold text-emerald-400 block mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash
              </span>
            </div>
          </div>

          {/* AI Executive Narrative Box */}
          <div className="bg-slate-900 border border-brand-500/30 rounded-2xl p-6 space-y-4 shadow-lg shadow-brand-950/30">
            <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Executive Literature Brief</span>
            </div>
            <div className="text-sm leading-relaxed text-slate-200 font-sans space-y-3 whitespace-pre-line">
              {brief.executive_summary}
            </div>
          </div>

          {/* Notable Preprints List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Notable High-Velocity Preprints</span>
            </h3>

            <div className="divide-y divide-slate-800/60">
              {brief.notable_papers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPaper(p.id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {p.primary_category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        arXiv:{p.arxiv_id}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 hover:text-brand-300 transition-colors">
                      {p.title}
                    </p>
                    {p.ai_summary && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{p.ai_summary}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="font-mono text-orange-400 font-semibold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      {p.trend_score.toFixed(1)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Emerging Keywords in 72h */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Emerging Preprint Terminology (72h Window)
            </span>
            <div className="flex flex-wrap gap-2">
              {brief.top_keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500">Brief not available yet.</p>
      )}
    </div>
  );
};
