import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  FileText,
  Bookmark,
  BookmarkCheck,
  Quote,
  Flame,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Tag,
  BookOpen,
  Send
} from 'lucide-react';
import { PaperDetail } from '../types';
import { api } from '../api/client';

interface PaperDetailModalProps {
  paperId: number | null;
  onClose: () => void;
  onOpenCitation: (id: number) => void;
  onSelectTopic?: (topic: string) => void;
  onPaperUpdated?: () => void;
}

export const PaperDetailModal: React.FC<PaperDetailModalProps> = ({
  paperId,
  onClose,
  onOpenCitation,
  onSelectTopic,
  onPaperUpdated,
}) => {
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [readingStatus, setReadingStatus] = useState<'unread' | 'reading' | 'read'>('unread');
  const [personalNote, setPersonalNote] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savingNote, setSavingNote] = useState<boolean>(false);

  useEffect(() => {
    if (!paperId) return;
    setLoading(true);
    api.getPaperById(paperId)
      .then((data) => {
        setPaper(data);
        setIsSaved(data.is_saved);
        setReadingStatus(data.reading_status || 'unread');
        setPersonalNote(data.personal_note || '');
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [paperId]);

  if (!paperId) return null;

  const handleToggleSave = async () => {
    if (!paper) return;
    try {
      if (isSaved) {
        await api.removeSavedPaper(paper.id);
        setIsSaved(false);
      } else {
        await api.savePaper(paper.id, readingStatus, personalNote);
        setIsSaved(true);
      }
      if (onPaperUpdated) onPaperUpdated();
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  const handleUpdateNoteAndStatus = async (status: 'unread' | 'reading' | 'read') => {
    if (!paper) return;
    setSavingNote(true);
    try {
      if (!isSaved) {
        await api.savePaper(paper.id, status, personalNote);
        setIsSaved(true);
      } else {
        await api.updateSavedPaper(paper.id, status, personalNote);
      }
      setReadingStatus(status);
      if (onPaperUpdated) onPaperUpdated();
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!paper) return;
    setAnalyzing(true);
    try {
      const res = await api.analyzePaper(paper.id);
      setPaper(res.paper);
      if (onPaperUpdated) onPaperUpdated();
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                arXiv:{paper?.arxiv_id || '...'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {paper?.primary_category}
              </span>
              {paper?.paper_type && (
                <span className="px-2 py-0.5 rounded text-xs uppercase font-mono tracking-wide bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {paper.paper_type}
                </span>
              )}
              {paper?.difficulty_level && (
                <span className="px-2 py-0.5 rounded text-xs capitalize bg-slate-800 text-slate-400 border border-slate-700">
                  {paper.difficulty_level}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
              {loading ? 'Loading paper metadata...' : paper?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Retrieving academic record...</p>
            </div>
          ) : paper ? (
            <>
              {/* Authors & Dates Bar */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Authors
                  </span>
                  <p className="text-xs font-medium text-slate-200">
                    {paper.authors.length > 0 ? paper.authors.join(', ') : 'Not listed'}
                  </p>
                </div>
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Published
                    </span>
                    <p className="text-xs font-mono text-slate-300">
                      {paper.published_date.slice(0, 10)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" /> Trend Score
                    </span>
                    <p className="text-xs font-mono text-orange-400 font-semibold">
                      {paper.trend_score.toFixed(1)} / 100
                    </p>
                  </div>
                </div>
              </div>

              {/* Gemini Structured Synthesis */}
              <div className="p-5 rounded-xl bg-brand-950/20 border border-brand-500/20 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-brand-400 font-semibold text-xs tracking-wide uppercase">
                    <Sparkles className="w-4 h-4" />
                    <span>Gemini 3.8 Flash Synthesis</span>
                  </div>
                  <button
                    onClick={handleTriggerAnalysis}
                    disabled={analyzing}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
                    <span>{analyzing ? 'Generating...' : paper.ai_analyzed ? 'Re-analyze' : 'Analyze Now'}</span>
                  </button>
                </div>

                {paper.ai_summary ? (
                  <>
                    <p className="text-slate-200 text-sm leading-relaxed">{paper.ai_summary}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-brand-500/10">
                      <div>
                        <span className="text-slate-500">Target Impact Area: </span>
                        <span className="text-slate-300 font-medium">{paper.impact_area || 'General AI'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Prerequisite Difficulty: </span>
                        <span className="text-slate-300 font-medium capitalize">{paper.difficulty_level || 'Intermediate'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    AI summary and taxonomy have not yet been generated for this paper. Click "Analyze Now" to trigger structured evaluation.
                  </p>
                )}
              </div>

              {/* Topics & Keywords */}
              <div className="space-y-3">
                {paper.topics && paper.topics.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Detected Topics
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {paper.topics.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            onClose();
                            if (onSelectTopic) onSelectTopic(t);
                          }}
                          className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paper.keywords && paper.keywords.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Extracted Keywords
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {paper.keywords.map((k) => (
                        <span
                          key={k}
                          className="px-2.5 py-1 rounded text-xs bg-slate-800/80 text-slate-300 border border-slate-700/60"
                        >
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Original Abstract */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Original Abstract
                </span>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs leading-relaxed text-slate-300 select-text whitespace-pre-line font-sans">
                  {paper.abstract}
                </div>
              </div>

              {/* "Why is this paper showing up?" Section */}
              {paper.why_showing_up && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
                    <span>Why is this paper showing up?</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>{paper.why_showing_up.recency_factor}</li>
                    <li>{paper.why_showing_up.category_activity}</li>
                    <li>{paper.why_showing_up.trend_index}</li>
                    <li>{paper.why_showing_up.topic_relevance}</li>
                  </ul>
                </div>
              )}

              {/* Saved Notes & Reading Status */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reading Status & Notes</span>
                  </div>
                  <div className="flex space-x-1">
                    {(['unread', 'reading', 'read'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateNoteAndStatus(status)}
                        className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-all ${
                          readingStatus === status && isSaved
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder="Add personal notes or literature review thoughts..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => handleUpdateNoteAndStatus(readingStatus)}
                    disabled={savingNote}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <button
            onClick={handleToggleSave}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              isSaved
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span>{isSaved ? 'Saved in Library' : 'Save to Library'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenCitation(paperId)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Cite</span>
            </button>

            {paper && (
              <>
                <a
                  href={paper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <a
                  href={paper.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>arXiv</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
