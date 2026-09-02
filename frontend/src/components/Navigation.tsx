import React from 'react';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Bookmark,
  Sparkles,
  History,
  Settings,
  Newspaper,
  Compass,
  DownloadCloud
} from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onOpenScrapeModal: () => void;
  isScraping: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  onOpenScrapeModal,
  isScraping,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'papers', label: 'Paper Explorer', icon: FileText },
    { id: 'trends', label: 'Trend Explorer', icon: TrendingUp },
    { id: 'saved', label: 'Saved Papers', icon: Bookmark },
    { id: 'brief', label: 'Research Brief', icon: Newspaper },
    { id: 'discovery', label: 'Discovery', icon: Compass },
    { id: 'history', label: 'Scrape History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectView('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight text-white flex items-center gap-1.5">
                PaperTrends <span className="text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono border border-brand-500/20">v1.0</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-none">Research Literature Intelligence</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-brand-300 border border-slate-700/80 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Trigger */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenScrapeModal}
              disabled={isScraping}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
                isScraping
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-not-allowed animate-pulse'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20'
              }`}
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
              <span>{isScraping ? 'Scraping Live...' : 'Fetch Papers'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center space-x-1 whitespace-nowrap px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-brand-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
