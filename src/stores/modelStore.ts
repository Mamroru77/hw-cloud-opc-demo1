import { create } from 'zustand';
import { TokenMetrics } from '../hooks/useModelRouter';

interface ModelStoreState {
  tokenMetrics: TokenMetrics | null;
  benchmarkData: BenchmarkEntry[] | null;
  setTokenMetrics: (metrics: TokenMetrics | null) => void;
  updateTokenMetrics: (partial: Partial<TokenMetrics>) => void;
  setBenchmarkData: (data: BenchmarkEntry[]) => void;
  reset: () => void;
}

export interface BenchmarkEntry {
  provider_id: string;
  model_name: string;
  avg_latency_ms: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  accuracy_score: number;
  task_type: string;
}

const initialState = {
  tokenMetrics: null as TokenMetrics | null,
  benchmarkData: null as BenchmarkEntry[] | null,
};

export const useModelStore = create<ModelStoreState>((set) => ({
  ...initialState,

  setTokenMetrics: (tokenMetrics) => set({ tokenMetrics }),

  updateTokenMetrics: (partial) => set((state) => {
    if (!state.tokenMetrics) {
      return { tokenMetrics: { input_tokens: 0, output_tokens: 0, latency_ms: 0, ...partial } };
    }
    return { tokenMetrics: { ...state.tokenMetrics, ...partial } };
  }),

  setBenchmarkData: (benchmarkData) => set({ benchmarkData }),

  reset: () => set(initialState),
}));
