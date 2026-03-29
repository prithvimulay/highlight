// src/content.tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Save, Check } from 'lucide-react';
import { storageService } from './services/storage';
import { getPreferredTheme } from './utils/getTheme';
import './index.css'; // Injects our Tailwind styles into the host page

const FloatingButton = () => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  const theme = getPreferredTheme();

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        // Get the coordinates of the highlighted text
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position the button slightly above and centered on the selection
        setPosition({
          top: rect.top + window.scrollY - 45,
          left: rect.left + window.scrollX + (rect.width / 2) - 40,
        });
        setSelectedText(text);
        setIsSaved(false);
      } else {
        // If the user clicks away, hide the button
        setPosition(null);
        setSelectedText('');
      }
    };

    // Listen for mouse release
    document.addEventListener('mouseup', handleMouseUp);
    
    // Hide the button if the user scrolls so it doesn't detach from the text
    const handleScroll = () => setPosition(null);
    document.addEventListener('scroll', handleScroll); 

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSave = async (e: React.MouseEvent) => {
    // Prevent the click from deselecting the user's highlighted text
    e.stopPropagation(); 
    e.preventDefault();

    if (!selectedText) return;

    await storageService.saveHighlight({
      text: selectedText,
      url: window.location.href,
      pageTitle: document.title,
    });

    setIsSaved(true);
    
    // Hide the button after a short success delay
    setTimeout(() => {
      setPosition(null);
      setIsSaved(false);
    }, 1500);
  };

  if (!position) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 2147483647, // Maximum safe z-index to ensure it sits above all website navbars
      }}
    >
      <button
        onClick={handleSave}
        className={`flex items-center gap-2 px-3 py-2 rounded-md shadow-xl font-medium text-sm transition-all hover:scale-105 cursor-pointer ${
          theme === 'dark' 
            ? 'bg-violet-700 text-white border border-violet-500 hover:bg-violet-600' 
            : 'bg-blue-600 text-white border border-blue-400 hover:bg-blue-500'
        }`}
      >
        {isSaved ? <Check size={16} /> : <Save size={16} />}
        {isSaved ? 'Saved!' : 'Save Highlight'}
      </button>
    </div>
  );
};

// --- Injection Logic ---
const injectReactApp = () => {
  // 1. Check if we already injected to prevent duplicates
  if (document.getElementById('highlight-saver-root')) return;

  // 2. Create a container for our React app
  const rootElement = document.createElement('div');
  rootElement.id = 'highlight-saver-root';
  
  // Apply theme class to the container so Tailwind's dark: variants work
  const theme = getPreferredTheme();
  if (theme === 'dark') {
    rootElement.classList.add('dark');
  }

  document.body.appendChild(rootElement);

  // 3. Render the app
  const root = createRoot(rootElement);
  root.render(<FloatingButton />);
};

// Ensure the webpage is fully loaded before we inject our UI
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectReactApp);
} else {
  injectReactApp();
}