import { useState, useRef, useCallback, useEffect } from 'react';
import { useKnowledgeStore, KnowledgeEntry } from '../stores/knowledgeStore';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  domain?: string;
  similarity_score?: number;
}

interface UseVectorSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  coverageWarning: boolean;
  search: (query: string, domain?: string, topK?: number) => Promise<void>;
}

export function useVectorSearch(): UseVectorSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverageWarning, setCoverageWarning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (query: string, domain?: string, topK?: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (!query.trim()) {
        setResults([]);
        setError(null);
        setCoverageWarning(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const store = useKnowledgeStore.getState();
          const entries = await store.searchKnowledge(query, domain, topK);

          if (controller.signal.aborted) return;

          const mapped: SearchResult[] = entries.map((e: KnowledgeEntry) => ({
            id: e.id,
            title: e.title,
            content: e.content,
            source: e.source,
            domain: e.domain,
            similarity_score: e.similarity_score,
          }));

          setResults(mapped);
          setCoverageWarning(store.coverageWarning);
          setIsLoading(false);
        } catch (err: any) {
          if (controller.signal.aborted) return;
          setError(err.message || '检索失败');
          setIsLoading(false);
        }
      }, 300);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, isLoading, error, coverageWarning, search };
}
