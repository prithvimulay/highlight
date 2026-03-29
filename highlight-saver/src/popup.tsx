// src/popup.tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Trash2, Sparkles, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { storageService, type Highlight } from './services/storage';
import './index.css';

const PopupApp = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Load highlights when the popup opens
  useEffect(() => {
    const fetchHighlights = async () => {
      const data = await storageService.getHighlights();
      setHighlights(data);
    };
    fetchHighlights();
  }, []);

  const handleDelete = async (id: string) => {
    await storageService.deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // Optional: Add a small toast notification here in a real app
  };

  const handleSummarize = async (id: string, text: string) => {
    setLoadingId(id);
    
    try {
      // 1. Hit the local Cloudflare Worker
      const response = await fetch('http://127.0.0.1:8787', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      // 2. Extract the real OpenAI text
      const data = await response.json();
      
      // 3. Save to local storage
      await storageService.updateSummary(id, data.summary);
      
      // 4. Update the UI state
      setHighlights((prev) => 
        prev.map((h) => (h.id === id ? { ...h, summary: data.summary } : h))
      );
    } catch (error) {
      console.error("Failed to summarize", error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-10">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          Highlight Saver
        </h1>
        <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
          {highlights.length} Saved
        </span>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {highlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 mt-10">
            <p className="text-sm font-medium">No highlights yet.</p>
            <p className="text-xs text-center px-4">
              Select text on any webpage to save your first highlight.
            </p>
          </div>
        ) : (
          highlights.map((highlight) => (
            <div 
              key={highlight.id} 
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md"
            >
              {/* Card Header (Source) */}
              <div className="flex items-start justify-between">
                <a 
                  href={highlight.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:hover:text-violet-400 flex items-center gap-1 line-clamp-1"
                >
                  {highlight.pageTitle}
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* The Highlighted Quote */}
              <blockquote className="border-l-4 border-blue-500 dark:border-violet-500 pl-3 italic text-sm text-slate-700 dark:text-slate-300">
                "{highlight.text}"
              </blockquote>

              {/* AI Summary Box (If exists) */}
              {highlight.summary && (
                <div className="bg-blue-50 dark:bg-violet-900/30 rounded-md p-3 text-sm text-slate-800 dark:text-slate-200 border border-blue-100 dark:border-violet-800/50">
                  <span className="font-semibold text-blue-700 dark:text-violet-400 flex items-center gap-1 mb-1 text-xs">
                    <Sparkles size={12} /> AI Summary
                  </span>
                  {highlight.summary}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCopy(highlight.text)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    title="Copy Text"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(highlight.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete Highlight"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {!highlight.summary && (
                  <button 
                    onClick={() => handleSummarize(highlight.id, highlight.text)}
                    disabled={loadingId === highlight.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded-md hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-70"
                  >
                    {loadingId === highlight.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
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

// Render the App (HMR Safe)
const rootElement = document.getElementById('root');
if (rootElement) {
  // Store the root on the DOM element so Vite HMR doesn't recreate it
  const root = (rootElement as any)._reactRoot || createRoot(rootElement);
  (rootElement as any)._reactRoot = root;
  root.render(<PopupApp />);
}