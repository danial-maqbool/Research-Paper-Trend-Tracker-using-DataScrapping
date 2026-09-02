import React, { useState, useEffect } from 'react';
import { Bookmark, Download, BookOpen, Clock, FileText, Trash2, Edit3, Check } from 'lucide-react';
import { PaperListItem } from '../types';
import { api } from '../api/client';
import { PaperCard } from '../components/PaperCard';

interface SavedPapersViewProps {
  onSelectPaper: (id: number) => void;
  onOpenCitation: (id: number) => void;
  onSelectTopic: (topic: string) => void;
}

export const SavedPapersView: React.FC<SavedPapersViewProps> = ({
  onSelectPaper,
  onOpenCitation,
  onSelectTopic,
}) => {
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadSaved = () => {
    setLoading(true);
    api.getSavedPapers(statusFilter || undefined)
      .then((res) => setPapers(res.saved_papers))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSaved();
  }, [statusFilter]);

  const handleBookmark = async (paperId: number) => {
    try {
      await api.removeSavedPaper(paperId);
      loadSaved();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
            <Bookmark className="w-4 h-4" />
            <span>Personal Literature Library</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Saved Preprints & Reading Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Keep track of must-read papers, reading progress, and personal synthesis notes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: '', label: 'All Saved' },
              { id: 'unread', label: 'Unread' },
              { id: 'reading', label: 'In Progress' },
              { id: 'read', label: 'Finished' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export Saved Papers */}
          <a
            href={api.getExportPapersUrl('csv', { saved_only: true })}
            download
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all"
            title="Download saved papers as CSV"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span>Export</span>
          </a>
        </div>
      </div>

      {/* Grid of Saved Papers */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading your saved papers...</p>
        </div>
      ) : papers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onSelectPaper={onSelectPaper}
              onBookmark={() => handleBookmark(paper.id)}
              onCopyCitation={onOpenCitation}
              onSelectTopic={onSelectTopic}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No saved papers found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Browse the Paper Explorer or Dashboard and bookmark papers to keep track of them here.
          </p>
        </div>
      )}
    </div>
  );
};
