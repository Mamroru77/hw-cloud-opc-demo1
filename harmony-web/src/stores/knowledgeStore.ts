import { create } from 'zustand';
import { BACKEND_URL } from '../lib/constants';
import { apiHeaders, fileToBase64, getActorRole } from '../lib/api';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  domain: string;
  similarity_score?: number;
  matched_terms?: string[];
  reranked?: boolean;
}

export interface PendingKnowledgeEntry {
  id: string;
  domain: string;
  filename: string;
  title: string;
  source: string;
  status: string;
  created_at: string;
  char_count?: number;
  preview?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  operator_id: string;
  target_id: string;
  before_content?: string | null;
  after_content?: string | null;
  timestamp: string;
}

export interface KnowledgeStats {
  total: number;
  by_domain: Record<string, number>;
  pending_count?: number;
  engine?: string;
}

export interface UploadResultSummary {
  entry_id: string;
  status_detail: 'pending' | 'approved';
  chunks_count: number;
  message: string;
}

interface KnowledgeStoreState {
  entries: KnowledgeEntry[];
  stats: KnowledgeStats | null;
  pendingEntries: PendingKnowledgeEntry[];
  auditLogs: AuditLogEntry[];
  searchResults: KnowledgeEntry[];
  isLoading: boolean;
  error: string | null;
  coverageWarning: boolean;
  isDegraded: boolean;

  uploadDocument: (file: File, domain: string, autoApprove?: boolean) => Promise<UploadResultSummary | null>;
  searchKnowledge: (query: string, domain?: string, topK?: number) => Promise<KnowledgeEntry[]>;
  fetchStats: () => Promise<void>;
  fetchPending: () => Promise<void>;
  approveEntry: (entryId: string, operator?: string) => Promise<string | null>;
  rejectEntry: (entryId: string, reason: string, operator?: string) => Promise<string | null>;
  fetchAuditLogs: () => Promise<void>;
  syncKnowledgeLake: () => Promise<{ status: string; message: string } | null>;
  clearError: () => void;
  clearSearchResults: () => void;
}

const initialState = {
  entries: [] as KnowledgeEntry[],
  stats: null as KnowledgeStats | null,
  pendingEntries: [] as PendingKnowledgeEntry[],
  auditLogs: [] as AuditLogEntry[],
  searchResults: [] as KnowledgeEntry[],
  isLoading: false,
  error: null as string | null,
  coverageWarning: false,
  isDegraded: false,
};

export const useKnowledgeStore = create<KnowledgeStoreState>((set, get) => ({
  ...initialState,

  uploadDocument: async (file: File, domain: string, autoApprove = false) => {
    set({ isLoading: true, error: null });
    try {
      const role = getActorRole();
      const operator = role === 'researcher' ? 'researcher_01' : 'reviewer_pi';
      const base64Data = await fileToBase64(file);
      const res = await fetch(`${BACKEND_URL}/knowledge/upload`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          filename: file.name,
          domain,
          file_base64: base64Data,
          auto_approve: role === 'researcher' ? false : autoApprove,
          operator,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.status === 'error') {
        throw new Error(json?.message || json?.detail || `上传失败 (${res.status})`);
      }

      // Unwrap backend envelope: { status, data: { entry_id, chunks_count, status_detail, message }, message }
      const payload = json.data ?? json;
      const summary: UploadResultSummary = {
        entry_id: payload.entry_id || '',
        status_detail: payload.status_detail === 'approved' ? 'approved' : 'pending',
        chunks_count: payload.chunks_count ?? payload.chunk_count ?? 0,
        message: json.message || payload.message || '上传成功',
      };

      set({ isLoading: false });
      await Promise.all([get().fetchStats(), get().fetchPending(), get().fetchAuditLogs()]);
      return summary;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '上传失败';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  searchKnowledge: async (query: string, domain?: string, topK?: number) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ query });
      if (domain) params.append('domain', domain);
      if (topK) params.append('top_k', String(topK));

      const res = await fetch(`${BACKEND_URL}/knowledge/search?${params.toString()}`, {
        headers: apiHeaders(),
      });

      if (!res.ok) {
        throw new Error(`检索失败 (${res.status})`);
      }

      const json = await res.json();
      // Unwrap backend envelope: { status, data: { status, results, coverage_warning, ... } }
      const payload = json?.data ?? json;
      const results: KnowledgeEntry[] = Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : [];
      const coverageWarning = Boolean(payload?.coverage_warning);
      const isDegraded = payload?.status === 'degraded' || Boolean(payload?.degraded);

      set({
        searchResults: results,
        isLoading: false,
        coverageWarning,
        isDegraded,
      });
      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '检索失败';
      set({ isLoading: false, error: message, searchResults: [] });
      return [];
    }
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/stats`, {
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error(`获取统计失败 (${res.status})`);
      const json = await res.json();
      const payload = json?.data ?? json;
      if (payload && typeof payload === 'object') {
        const byDomain = payload.by_domain ?? {};
        const total =
          typeof payload.total === 'number'
            ? payload.total
            : Object.values(byDomain).reduce((sum: number, v) => sum + (Number(v) || 0), 0);
        set({
          stats: {
            total,
            by_domain: byDomain,
            pending_count: payload.pending_count ?? 0,
            engine: payload.engine,
          },
        });
      }
    } catch (err) {
      console.error('Failed to fetch knowledge stats:', err);
    }
  },

  fetchPending: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/pending`, {
        headers: apiHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      set({ pendingEntries: items });
    } catch {
      // ignore offline
    }
  },

  approveEntry: async (entryId: string, operator = 'clinical_reviewer') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/approve/${encodeURIComponent(entryId)}`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ operator }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json?.message || '审批通过失败');
      }
      set({ isLoading: false });
      await Promise.all([get().fetchStats(), get().fetchPending(), get().fetchAuditLogs()]);
      return json.message || '审批通过并完成索引';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '审批失败';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  rejectEntry: async (entryId: string, reason: string, operator = 'clinical_reviewer') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/reject/${encodeURIComponent(entryId)}`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ operator, reason }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json?.message || '拒绝操作失败');
      }
      set({ isLoading: false });
      await Promise.all([get().fetchStats(), get().fetchPending(), get().fetchAuditLogs()]);
      return json.message || '已拒绝该条知识入库';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '拒绝失败';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  fetchAuditLogs: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/audit-logs?limit=15`, {
        headers: apiHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      set({ auditLogs: items });
    } catch {
      // ignore offline
    }
  },

  syncKnowledgeLake: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge/sync/lake`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const json = await res.json();
      set({ isLoading: false });
      await Promise.all([get().fetchStats(), get().fetchAuditLogs()]);
      return {
        status: json?.status || 'success',
        message: json?.message || '同步完成',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '知识湖同步请求失败';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  clearError: () => set({ error: null }),
  clearSearchResults: () => set({ searchResults: [], coverageWarning: false }),
}));
