import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Quote, Download } from 'lucide-react';
import { CitationData } from '../types';
import { api } from '../api/client';

interface CitationModalProps {
  paperId: number | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ paperId, onClose }) => {
  const [citation, setCitation] = useState<CitationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'bibtex' | 'plain'>('bibtex');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!paperId) return;
    setLoading(true);
    api.getCitation(paperId)
      .then((data) => setCitation(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [paperId]);

  if (!paperId) return null;

  const currentText = activeTab === 'bibtex' ? citation?.bibtex : citation?.plain_text;

  const handleCopy = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBib = () => {
    if (!citation) return;
    const blob = new Blob([citation.bibtex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${citation.arxiv_id}.bib`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Quote className="w-4 h-4 text-brand-400" />
            <span>Cite Paper</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400 line-clamp-1 font-medium">
            {citation?.title || 'Loading citation...'}
          </p>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 space-x-4">
            <button
              onClick={() => setActiveTab('bibtex')}
              className={`pb-2 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'bibtex'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              BibTeX
            </button>
            <button
              onClick={() => setActiveTab('plain')}
              className={`pb-2 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'plain'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Plain Text (APA Style)
            </button>
          </div>

          {/* Content Box */}
          <div className="relative">
            {loading ? (
              <div className="h-36 flex items-center justify-center text-xs text-slate-500">
                Generating citation...
              </div>
            ) : (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap select-all max-h-56">
                {currentText}
              </pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            {activeTab === 'bibtex' && (
              <button
                onClick={handleDownloadBib}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .bib</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 hover:bg-brand-500 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
