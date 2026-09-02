import React, { useState, useEffect } from 'react';
import { Settings, Key, Shield, Sparkles, Sliders, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { SettingsData, Category } from '../types';
import { api } from '../api/client';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash');
  const [fetchAmount, setFetchAmount] = useState<number>(50);
  const [dateWindow, setDateWindow] = useState<string>('7d');
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [rateLimit, setRateLimit] = useState<number>(15);
  const [exportFormat, setExportFormat] = useState<string>('csv');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSettings = () => {
    setLoading(true);
    api.getSettings()
      .then((s) => {
        setSettings(s);
        setGeminiModel(s.gemini_model);
        setFetchAmount(s.default_fetch_amount);
        setDateWindow(s.default_date_window);
        setAiEnabled(s.ai_analysis_enabled);
        setRateLimit(s.gemini_max_requests_per_minute);
        setExportFormat(s.export_format);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleCategory = async (catId: string, currentStatus: boolean) => {
    try {
      await api.toggleCategory(catId, !currentStatus);
      if (settings) {
        setSettings({
          ...settings,
          categories: settings.categories.map((c) =>
            c.id === catId ? { ...c, is_enabled: !currentStatus } : c
          ),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.updateSettings({
        gemini_model: geminiModel,
        default_fetch_amount: fetchAmount,
        default_date_window: dateWindow,
        ai_analysis_enabled: aiEnabled,
        gemini_max_requests_per_minute: rateLimit,
        export_format: exportFormat,
        gemini_api_key: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
      });
      setSuccessMsg('Application settings saved successfully.');
      setApiKeyInput('');
      loadSettings();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400">Loading application settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 tracking-wider uppercase mb-1">
          <Settings className="w-4 h-4" />
          <span>System Configuration</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Application Preferences & AI Engine Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure default arXiv harvesting windows, discipline subscriptions, and Google Gemini 3.8 Flash analysis parameters.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gemini API & AI Settings Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white tracking-tight">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Gemini Intelligence Engine</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Enable AI Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-semibold text-slate-200 block">Automated AI Paper Synthesis</span>
                <span className="text-[11px] text-slate-400">
                  Generate structured 2-3 sentence summaries, difficulty levels, and extracted keywords
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Model Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Model</label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="gemini-2.5-flash">Gemini 3.8 / 2.5 Flash (Recommended)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  API Rate Limit (Requests / Minute)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Gemini API Key</span>
                </label>
                {settings?.gemini_api_key_configured && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Configured ({settings.gemini_api_key_masked})
                  </span>
                )}
              </div>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  settings?.gemini_api_key_configured
                    ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current key)'
                    : 'Paste your GEMINI_API_KEY from Google AI Studio...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Keys are stored locally in the application database/environment and never transmitted to external services other than the official Google API.
              </p>
            </div>
          </div>
        </div>

        {/* Harvest Defaults Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white tracking-tight">
            <Sliders className="w-4 h-4 text-brand-400" />
            <span>Default Scraper Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Default Fetch Amount</label>
              <select
                value={fetchAmount}
                onChange={(e) => setFetchAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="25">25 Papers</option>
                <option value="50">50 Papers</option>
                <option value="100">100 Papers</option>
                <option value="200">200 Papers</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Default Date Window</label>
              <select
                value={dateWindow}
                onChange={(e) => setDateWindow(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="24h">24 Hours</option>
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Default Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="csv">CSV (Comma Separated)</option>
                <option value="json">JSON (Structured)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enabled Categories Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Managed arXiv Categories
              </h3>
              <p className="text-xs text-slate-400">Toggle disciplines enabled for background and default queries</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
            {settings?.categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleToggleCategory(cat.id, cat.is_enabled)}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  cat.is_enabled
                    ? 'bg-brand-500/10 border-brand-500/30 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <div>
                  <span className="font-mono text-xs font-semibold block text-brand-400">{cat.id}</span>
                  <span className="text-[11px] block truncate max-w-[170px]">{cat.name}</span>
                </div>
                <input
                  type="checkbox"
                  checked={cat.is_enabled}
                  onChange={() => {}}
                  className="rounded text-brand-500 focus:ring-0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-brand-600/20"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save All Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
