import React from 'react';
import {
  ExternalLink,
  FileText,
  Bookmark,
  BookmarkCheck,
  Quote,
  Flame,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import { PaperListItem } from '../types';

interface PaperCardProps {
  paper: PaperListItem;
  onSelectPaper: (paperId: number) => void;
  onBookmark: (paperId: number, isSaved: boolean) => void;
  onCopyCitation: (paperId: number) => void;
  onSelectTopic?: (topic: string) => void;
  onAnalyze?: (paperId: number) => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  onSelectPaper,
  onBookmark,
  onCopyCitation,
  onSelectTopic,
  onAnalyze,
}) => {
  const pubDateFormatted = paper.published_date
    ? new Date(paper.published_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header: Category, Date, Scores */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {paper.primary_category}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {pubDateFormatted}
            </span>
            {paper.is_saved && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 capitalize">
                {paper.reading_status || 'saved'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Trend Score */}
            <div
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"
              title="Temporal Trend Score (0-100)"
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span>{paper.trend_score.toFixed(1)}</span>
            </div>

            {/* Paper Type Tag if analyzed */}
            {paper.paper_type && (
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {paper.paper_type}
              </span>
            )}
          </div>
        </div>

        {/* Paper Title */}
        <h3
          onClick={() => onSelectPaper(paper.id)}
          className="text-base font-semibold text-slate-100 hover:text-brand-300 cursor-pointer transition-colors line-clamp-2 mb-2 leading-snug"
        >
          {paper.title}
        </h3>

        {/* Authors */}
        <p className="text-xs text-slate-400 mb-3 truncate">
          <span className="text-slate-500">By </span>
          {paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown Authors'}
        </p>

        {/* Summary or Abstract preview */}
        <div className="mb-4">
          {paper.ai_summary ? (
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-brand-500/20 text-xs text-slate-300 leading-relaxed relative">
              <div className="flex items-center gap-1 text-[11px] font-medium text-brand-400 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Synthesis</span>
              </div>
              <p className="line-clamp-3">{paper.ai_summary}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              {paper.abstract}
            </p>
          )}
        </div>

        {/* Topic & Keyword Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {paper.topics &&
            paper.topics.slice(0, 2).map((topic) => (
              <button
                key={topic}
                onClick={() => onSelectTopic && onSelectTopic(topic)}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
              >
                <Layers className="w-2.5 h-2.5" />
                <span>{topic}</span>
              </button>
            ))}

          {paper.keywords &&
            paper.keywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60"
              >
                #{kw}
              </span>
            ))}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelectPaper(paper.id)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
          >
            Details
          </button>

          {!paper.ai_analyzed && onAnalyze && (
            <button
              onClick={() => onAnalyze(paper.id)}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 font-medium transition-all"
              title="Generate Gemini Summary & Taxonomy"
            >
              <Sparkles className="w-3 h-3" />
              <span>Analyze</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Copy Citation */}
          <button
            onClick={() => onCopyCitation(paper.id)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Cite Paper (BibTeX / Plain)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={() => onBookmark(paper.id, paper.is_saved)}
            className={`p-1.5 rounded transition-all ${
              paper.is_saved
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
            }`}
            title={paper.is_saved ? 'Bookmarked (Click to modify)' : 'Save Paper'}
          >
            {paper.is_saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>

          {/* PDF Link */}
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-all"
            title="View PDF on arXiv"
          >
            <FileText className="w-3.5 h-3.5" />
          </a>

          {/* arXiv Web Link */}
          <a
            href={paper.page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Open arXiv abstract page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
