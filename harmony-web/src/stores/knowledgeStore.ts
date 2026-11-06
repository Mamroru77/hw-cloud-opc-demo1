import { create } from 'zustand';
import { BACKEND_URL } from '../lib/constants';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  domain: string;
  similarity_score?: number;
}

export interface KnowledgeStats {
  total: number;
  by_domain: Record<string, number>;
}

interface KnowledgeStoreState {
  entries: KnowledgeEntry[];
  stats: KnowledgeStats | null;
  searchResults: KnowledgeEntry[];
  isLoading: boolean;
  error: string | null;
  coverageWarning: boolean;
  isDegraded: boolean;

  uploadDocument: (file: File, domain: string) => Promise<number | null>;
  searchKnowledge: (query: string, domain?: string, topK?: number) => Promise<KnowledgeEntry[]>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  clearSearchResults: () => void;
}

const initialState = {
  entries: [] as KnowledgeEntry[],
  stats: null as KnowledgeStats | null,
  searchResults: [] as KnowledgeEntry[],
  isLoading: false,
  error: null as string | null,
  coverageWarning: false,
  isDegraded: false,
};

export const useKnowledgeStore = create<KnowledgeStoreState>((set, get) => ({
  ...initialState,

  uploadDocument: async (file: File, domain: string) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('domain', domain);

      const res = await fetch(`${BACKEND_URL}/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: '上传失败' }));
        throw new Error(errData.detail || `上传失败 (${res.status})`);
      }

      const data = await res.json();
      const chunkCount = data.chunk_count ?? data.chunks_created ?? 0;

      set({ isLoading: false });
      get().fetchStats();
      return chunkCount;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || '上传失败' });
      return null;
    }
  },

  searchKnowledge: async (query: string, domain?: string, topK?: number) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ query });
      if (domain) params.append('domain', domain);
      if (topK) params.append('top_k', String(topK));

      const res = await fetch(`${BACKEND_URL}/knowledge/search?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`检索失败 (${res.status})`);
      }

      const data = await res.json();
      const results: KnowledgeEntry[] = data.results ?? data ?? [];
      const coverageWarning = data.coverage_warning ?? false;
      const isDegraded = data.degraded ?? false;

      set({
        searchResults: results,
        isLoading: false,
        coverageWarning,
        isDegraded,
      });
      return results;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || '检索失败', searchResults: [] });
      return [];
    }
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/stats`);
      if (!res.ok) throw new Error(`获取统计失败 (${res.status})`);
      const data = await res.json();
      set({
        stats: {
          total: data.total ?? 0,
          by_domain: data.by_domain ?? {},
        },
      });
    } catch (err: any) {
      console.error('Failed to fetch knowledge stats:', err);
    }
  },

  clearError: () => set({ error: null }),
  clearSearchResults: () => set({ searchResults: [], coverageWarning: false }),
}));
