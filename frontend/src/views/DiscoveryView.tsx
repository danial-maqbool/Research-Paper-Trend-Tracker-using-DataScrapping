import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, Flame, FileText, ArrowRight, Lightbulb } from 'lucide-react';
import { RecommendedPaper } from '../types';
import { api } from '../api/client';

interface DiscoveryViewProps {
  onSelectPaper: (id: number) => void;
  onOpenCitation: (id: number) => void;
  onSavePaper: (id: number) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  onSelectPaper,
  onOpenCitation,
  onSavePaper,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendedPaper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    api.getRecommendations(9)
      .then((data) => setRecommendations(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 tracking-wider uppercase mb-1">
          <Compass className="w-4 h-4" />
          <span>Intelligent Literature Discovery</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Papers You May Want to Read
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Content-based recommendation engine matching your reading history, saved topics, and technical keywords against high-velocity unread preprints.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Synthesizing personalized preprint recommendations...</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Why Recommended Badge */}
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-3 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-[11px]">Why this paper:</span>
                    <span className="text-[11px] text-slate-300">{rec.recommendation_reason}</span>
                  </div>
                </div>

                {/* Categories & Score */}
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {rec.primary_category}
                  </span>
                  <div className="flex items-center space-x-1 text-xs font-mono text-orange-400">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{rec.trend_score.toFixed(1)}</span>
                  </div>
                </div>

                <h3
                  onClick={() => onSelectPaper(rec.id)}
                  className="text-base font-semibold text-white hover:text-brand-300 cursor-pointer transition-colors line-clamp-2 mb-2"
                >
                  {rec.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {rec.ai_summary || rec.abstract}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectPaper(rec.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
                >
                  Inspect
                </button>
                <button
                  onClick={() => onSavePaper(rec.id)}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all"
                >
                  Save to Library
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Compass className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No recommendations ready</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Save a few papers or fetch preprints to establish your research profile.
          </p>
        </div>
      )}
    </div>
  );
};
