// src/services/storage.ts

export interface Highlight {
    id: string;
    text: string;
    url: string;
    pageTitle: string;
    summary?: string;
    createdAt: number;
}

const STORAGE_KEY = 'user_highlights';

export const storageService = {
    async getHighlights(): Promise<Highlight[]> {
        return new Promise((resolve) => {
            // Added `Record<string, any>` to fix the implicit 'any' error
            chrome.storage.local.get([STORAGE_KEY], (result: Record<string, any>) => {
                resolve(result[STORAGE_KEY] || []);
            });
        });
    },

    async saveHighlight(newHighlight: Omit<Highlight, 'id' | 'createdAt'>): Promise<Highlight> {
        const highlights = await this.getHighlights();

        const highlightToSave: Highlight = {
            ...newHighlight,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };

        const updatedHighlights = [highlightToSave, ...highlights];

        return new Promise((resolve) => {
            chrome.storage.local.set({ [STORAGE_KEY]: updatedHighlights }, () => {
                resolve(highlightToSave);
            });
        });
    },

    async deleteHighlight(id: string): Promise<void> {
        const highlights = await this.getHighlights();
        const filteredHighlights = highlights.filter(h => h.id !== id);

        return new Promise((resolve) => {
            chrome.storage.local.set({ [STORAGE_KEY]: filteredHighlights }, () => {
                resolve();
            });
        });
    },

    async updateSummary(id: string, summary: string): Promise<void> {
        const highlights = await this.getHighlights();
        const updatedHighlights = highlights.map(h =>
            h.id === id ? { ...h, summary } : h
        );

        return new Promise((resolve) => {
            chrome.storage.local.set({ [STORAGE_KEY]: updatedHighlights }, () => {
                resolve();
            });
        });
    }
};