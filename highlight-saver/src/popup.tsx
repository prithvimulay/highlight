// src/popup.tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Trash2, Sparkles, Copy, ExternalLink, Loader2, Check } from 'lucide-react';
import { storageService, type Highlight } from './services/storage';
import { getPreferredTheme } from './utils/getTheme';
import './index.css';

const PopupApp = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHighlights = async () => {
      const data = await storageService.getHighlights();
      setHighlights(data);
    };
    fetchHighlights();

    // Apply theme class to root for Tailwind dark mode
    const theme = getPreferredTheme();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleDelete = async (id: string) => {
    await storageService.deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSummarize = async (id: string, text: string) => {
    setLoadingId(id);
    try {
      const response = await fetch('http://127.0.0.1:8787', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      // Better Error Logging: Catch the actual message from the proxy
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await storageService.updateSummary(id, data.summary);
      setHighlights((prev) => 
        prev.map((h) => (h.id === id ? { ...h, summary: data.summary } : h))
      );
    } catch (error) {
      console.error("Summarization Failed:", error);
      alert(`Summarization failed. Check the console for details. Error: ${error}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Helper to get a clean hostname for the UI
  const getHostName = (url: string) => new URL(url).hostname.replace('www.', '');

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      {/* Premium Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-10">
        <h1 className="font-bold text-lg flex items-center gap-2 tracking-tight">
          <div className="p-1.5 bg-blue-100 dark:bg-violet-900/50 rounded-lg">
            <Sparkles className="text-blue-600 dark:text-violet-400" size={18} />
          </div>
          Highlight Saver
        </h1>
        <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
          {highlights.length} Saved
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {highlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-12">
            <Sparkles size={40} className="opacity-20 mb-4" />
            <p className="text-sm font-medium">Your collection is empty.</p>
            <p className="text-xs text-center mt-1 opacity-70">Highlight text on any page to save it here.</p>
          </div>
        ) : (
          highlights.map((highlight) => (
            <div 
              key={highlight.id} 
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-3 group"
            >
              {/* Card Header (Favicon + Domain + Title) */}
              <a 
                href={highlight.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 dark:hover:text-violet-400 transition-colors"
              >
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${getHostName(highlight.url)}&sz=32`} 
                  alt="favicon" 
                  className="w-4 h-4 rounded-sm"
                />
                <span className="truncate max-w-[280px]">{highlight.pageTitle}</span>
                <ExternalLink size={12} className="opacity-50" />
              </a>

              {/* The Highlight */}
              <div className="pl-3 border-l-2 border-slate-300 dark:border-slate-600">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                  "{highlight.text}"
                </p>
              </div>

              {/* AI Summary Box */}
              {highlight.summary && (
                <div className="mt-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-violet-900/20 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 border border-blue-100 dark:border-violet-800/30 shadow-inner">
                  <div className="font-semibold text-blue-700 dark:text-violet-400 flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider">
                    <Sparkles size={12} /> AI Summary
                  </div>
                  <p className="leading-relaxed opacity-90">{highlight.summary}</p>
                </div>
              )}

              {/* Action Footer */}
              <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleCopy(highlight.id, highlight.text)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-all"
                    title="Copy Text"
                  >
                    {copiedId === highlight.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(highlight.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {!highlight.summary && (
                  <button 
                    onClick={() => handleSummarize(highlight.id, highlight.text)}
                    disabled={loadingId === highlight.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingId === highlight.id ? (
                      <Loader2 size={14} className="animate-spin text-blue-600 dark:text-violet-400" />
                    ) : (
                      <Sparkles size={14} className="text-blue-600 dark:text-violet-400" />
                    )}
                    Summarize
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = (rootElement as any)._reactRoot || createRoot(rootElement);
  (rootElement as any)._reactRoot = root;
  root.render(<PopupApp />);
}