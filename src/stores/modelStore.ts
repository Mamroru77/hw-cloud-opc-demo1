import { create } from 'zustand';
import type { TokenMetrics } from '../lib/types';

interface ModelStoreState {
  tokenMetrics: TokenMetrics | null;
  setTokenMetrics: (metrics: TokenMetrics | null) => void;
  updateTokenMetrics: (partial: Partial<TokenMetrics>) => void;
  reset: () => void;
}

const initialState = {
  tokenMetrics: null as TokenMetrics | null,
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

  reset: () => set(initialState),
}));
