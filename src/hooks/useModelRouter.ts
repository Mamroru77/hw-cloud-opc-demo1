import { useState, useCallback } from 'react';

export interface TokenMetrics {
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  model_name?: string;
  provider_id?: string;
}

export interface UseModelRouterReturn {
  tokenMetrics: TokenMetrics | null;
  updateMetrics: (metrics: Partial<TokenMetrics>) => void;
  resetMetrics: () => void;
  totalTokens: number;
}

const useModelRouter = (): UseModelRouterReturn => {
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics | null>(null);

  const updateMetrics = useCallback((metrics: Partial<TokenMetrics>) => {
    setTokenMetrics(prev => {
      if (!prev) {
        return {
          input_tokens: metrics.input_tokens || 0,
          output_tokens: metrics.output_tokens || 0,
          latency_ms: metrics.latency_ms || 0,
          model_name: metrics.model_name,
          provider_id: metrics.provider_id,
        };
      }
      return {
        ...prev,
        ...metrics,
        input_tokens: metrics.input_tokens ?? prev.input_tokens,
        output_tokens: metrics.output_tokens ?? prev.output_tokens,
        latency_ms: metrics.latency_ms ?? prev.latency_ms,
      };
    });
  }, []);

  const resetMetrics = useCallback(() => {
    setTokenMetrics(null);
  }, []);

  const totalTokens = tokenMetrics ? tokenMetrics.input_tokens + tokenMetrics.output_tokens : 0;

  return {
    tokenMetrics,
    updateMetrics,
    resetMetrics,
    totalTokens,
  };
};

export default useModelRouter;
