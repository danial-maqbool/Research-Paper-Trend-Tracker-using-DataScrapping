import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layers, Users, Hash, Calendar, FileText } from 'lucide-react';
import { TopicDetail } from '../types';
import { api } from '../api/client';
import { PaperCard } from '../components/PaperCard';
import { PapersOverTimeChart } from '../components/Charts';

interface TopicDetailViewProps {
  topicName: string;
  onBack: () => void;
  onSelectPaper: (id: number) => void;
  onOpenCitation: (id: number) => void;
}

export const TopicDetailView: React.FC<TopicDetailViewProps> = ({
  topicName,
  onBack,
  onSelectPaper,
  onOpenCitation,
}) => {
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    api.getTopicDetail(topicName)
      .then((data) => setDetail(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [topicName]);

  const handleBookmark = async (paperId: number, isSaved: boolean) => {
    try {
      if (isSaved) {
        await api.removeSavedPaper(paperId);
      } else {
        await api.savePaper(paperId);
      }
      // Refresh topic papers
      const updated = await api.getTopicDetail(topicName);
      setDetail(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Back Button & Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-brand-400 font-semibold">
            Topic Deep-Dive
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>{detail?.name || topicName}</span>
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading topic analytics...</p>
        </div>
      ) : detail ? (
        <>
          {/* Timeline & Metadata Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Timeline */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Topic Activity Over Time
                  </h3>
                  <p className="text-xs text-slate-400">Preprint publications mentioning this topic</p>
                </div>
                <span className="font-mono text-xs text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded border border-brand-500/20">
                  {detail.total_papers} Papers Total
                </span>
              </div>
              {detail.timeline && detail.timeline.length > 0 ? (
                <PapersOverTimeChart data={detail.timeline} />
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  No timeline data recorded yet.
                </div>
              )}
            </div>

            {/* Sidebar: Related Keywords, Categories, Authors */}
            <div className="space-y-4">
              {/* Related Categories */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Primary arXiv Categories
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {detail.related_categories.map((c) => (
                    <span
                      key={c.category}
                      className="px-2 py-1 rounded text-[11px] font-mono bg-slate-950 border border-slate-800 text-brand-300"
                    >
                      {c.category} ({c.count})
                    </span>
                  ))}
                </div>
              </div>

              {/* Related Keywords */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Associated Keywords
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {detail.related_keywords.map((k) => (
                    <span
                      key={k.keyword}
                      className="px-2 py-0.5 rounded text-xs bg-slate-950 border border-slate-800 text-slate-300"
                    >
                      #{k.keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Authors in Topic */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Key Contributing Authors
                </span>
                <ul className="text-xs space-y-1 divide-y divide-slate-800/60">
                  {detail.active_authors.slice(0, 5).map((a) => (
                    <li key={a.name} className="pt-1.5 flex justify-between text-slate-300">
                      <span>{a.name}</span>
                      <span className="font-mono text-slate-500">{a.count} papers</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Associated Papers List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <span>Preprints Tagged in this Topic</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {detail.papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onSelectPaper={onSelectPaper}
                  onBookmark={handleBookmark}
                  onCopyCitation={onOpenCitation}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500">Topic details could not be retrieved.</p>
      )}
    </div>
  );
};
