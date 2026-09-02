import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { PapersView } from './views/PapersView';
import { TrendsView } from './views/TrendsView';
import { TopicDetailView } from './views/TopicDetailView';
import { SavedPapersView } from './views/SavedPapersView';
import { DiscoveryView } from './views/DiscoveryView';
import { HistoryView } from './views/HistoryView';
import { BriefView } from './views/BriefView';
import { SettingsView } from './views/SettingsView';
import { PaperDetailModal } from './components/PaperDetailModal';
import { CitationModal } from './components/CitationModal';
import { ScrapeModal } from './components/ScrapeModal';
import { api } from './api/client';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activePaperId, setActivePaperId] = useState<number | null>(null);
  const [citationPaperId, setCitationPaperId] = useState<number | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState<boolean>(false);
  const [isScraping, setIsScraping] = useState<boolean>(false);

  // Check background scrape status periodically
  useEffect(() => {
    const checkScrapeStatus = async () => {
      try {
        const res = await api.getScrapeStatus();
        setIsScraping(res.is_active);
      } catch (err) {
        // silent fail
      }
    };
    checkScrapeStatus();
    const interval = setInterval(checkScrapeStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTopic = (topic: string) => {
    setActiveTopic(topic);
    setCurrentView('topic-detail');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navigation
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        onOpenScrapeModal={() => setIsScrapeModalOpen(true)}
        isScraping={isScraping}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <DashboardView
            onSelectPaper={(id) => setActivePaperId(id)}
            onOpenCitation={(id) => setCitationPaperId(id)}
            onSelectTopic={handleSelectTopic}
            onViewAllPapers={() => setCurrentView('papers')}
            onOpenScrapeModal={() => setIsScrapeModalOpen(true)}
          />
        )}

        {currentView === 'papers' && (
          <PapersView
            onSelectPaper={(id) => setActivePaperId(id)}
            onOpenCitation={(id) => setCitationPaperId(id)}
            onSelectTopic={handleSelectTopic}
            initialTopic={activeTopic || undefined}
          />
        )}

        {currentView === 'trends' && (
          <TrendsView
            onSelectTopic={handleSelectTopic}
            onSelectCategory={(cat) => setCurrentView('papers')}
          />
        )}

        {currentView === 'topic-detail' && activeTopic && (
          <TopicDetailView
            topicName={activeTopic}
            onBack={() => setCurrentView('dashboard')}
            onSelectPaper={(id) => setActivePaperId(id)}
            onOpenCitation={(id) => setCitationPaperId(id)}
          />
        )}

        {currentView === 'saved' && (
          <SavedPapersView
            onSelectPaper={(id) => setActivePaperId(id)}
            onOpenCitation={(id) => setCitationPaperId(id)}
            onSelectTopic={handleSelectTopic}
          />
        )}

        {currentView === 'discovery' && (
          <DiscoveryView
            onSelectPaper={(id) => setActivePaperId(id)}
            onOpenCitation={(id) => setCitationPaperId(id)}
            onSavePaper={async (id) => {
              await api.savePaper(id);
              setActivePaperId(id);
            }}
          />
        )}

        {currentView === 'history' && (
          <HistoryView onOpenScrapeModal={() => setIsScrapeModalOpen(true)} />
        )}

        {currentView === 'brief' && (
          <BriefView onSelectPaper={(id) => setActivePaperId(id)} />
        )}

        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Modals */}
      <PaperDetailModal
        paperId={activePaperId}
        onClose={() => setActivePaperId(null)}
        onOpenCitation={(id) => setCitationPaperId(id)}
        onSelectTopic={handleSelectTopic}
      />

      <CitationModal
        paperId={citationPaperId}
        onClose={() => setCitationPaperId(null)}
      />

      <ScrapeModal
        isOpen={isScrapeModalOpen}
        onClose={() => setIsScrapeModalOpen(false)}
        onScrapeStarted={() => setIsScraping(true)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Research Paper Trend Tracker • Real-time arXiv metadata harvesting & Gemini analysis</p>
          <p className="font-mono text-[11px]">Academic Portfolio Challenge Project</p>
        </div>
      </footer>
    </div>
  );
};
