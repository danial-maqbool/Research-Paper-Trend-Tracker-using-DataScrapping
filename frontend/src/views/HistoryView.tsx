import React, { useState, useEffect } from 'react';
import { History, DownloadCloud, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { ScrapeRun } from '../types';
import { api } from '../api/client';

interface HistoryViewProps {
  onOpenScrapeModal: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenScrapeModal }) => {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadRuns = () => {
    setLoading(true);
    api.getScrapeRuns(30)
      .then((data) => setRuns(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 tracking-wider uppercase mb-1">
            <History className="w-4 h-4" />
            <span>Audit & Ingestion Trail</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Scrape Pipeline History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit logs of all arXiv preprint harvesting queries and Gemini analysis runs.
          </p>
        </div>

        <button
          onClick={onOpenScrapeModal}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-brand-600/20"
        >
          <DownloadCloud className="w-4 h-4" />
          <span>New Harvest Run</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">Categories</th>
                <th className="py-3 px-4 text-center">Req / Fetched</th>
                <th className="py-3 px-4 text-center">New Papers</th>
                <th className="py-3 px-4 text-center">Updated</th>
                <th className="py-3 px-4 text-center">AI Analyzed</th>
                <th className="py-3 px-4 text-center">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading && runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Loading ingestion logs...
                  </td>
                </tr>
              ) : runs.length > 0 ? (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">#{r.id}</td>
                    <td className="py-3 px-4">
                      {r.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {r.status === 'running' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                          <Clock className="w-3 h-3 animate-spin" /> Ingesting...
                        </span>
                      )}
                      {r.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20" title={r.error_message}>
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {r.start_time.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {r.selected_categories.slice(0, 3).map((c) => (
                          <span key={c} className="px-1.5 py-0.2 rounded bg-slate-950 font-mono text-[10px] text-slate-400 border border-slate-800">
                            {c}
                          </span>
                        ))}
                        {r.selected_categories.length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{r.selected_categories.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {r.requested_count} / <span className="text-slate-200 font-semibold">{r.fetched_count}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400 font-semibold">
                      +{r.new_papers}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {r.updated_papers}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-purple-400">
                      {r.ai_analyses_completed}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {r.failed_records > 0 ? (
                        <span className="text-rose-400 font-bold">{r.failed_records}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No scrape runs recorded yet. Click "New Harvest Run" to fetch preprints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
