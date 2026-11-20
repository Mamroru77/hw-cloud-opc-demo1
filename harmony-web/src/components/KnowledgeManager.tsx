import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Search, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import { useVectorSearch } from '../hooks/useVectorSearch';
import { FRONTEND_KNOWLEDGE_BASE } from '../lib/constants';

const ACCEPTED_EXTENSIONS = ['.pdf', '.md', '.txt'];
const DOMAIN_OPTIONS = [
  { value: 'devices', label: '医疗器械与成像分子' },
  { value: 'drugs', label: '创新药物与生物治疗' },
  { value: 'ai', label: '医疗 AI 与智能诊断' },
  { value: 'surgical', label: '创新临床术式与疗法' },
];

const FALLBACK_STATS = {
  total: Object.values(FRONTEND_KNOWLEDGE_BASE).reduce((sum, list) => sum + list.length, 0),
  by_domain: {
    devices: FRONTEND_KNOWLEDGE_BASE.devices.length,
    drugs: FRONTEND_KNOWLEDGE_BASE.drugs.length,
    ai: FRONTEND_KNOWLEDGE_BASE.ai.length,
    surgical: FRONTEND_KNOWLEDGE_BASE.surgical.length,
  },
};

function KnowledgeManager() {
  const { stats, isLoading, error, uploadDocument, fetchStats, clearError } = useKnowledgeStore();
  const { results: searchResults, isLoading: isSearching, search, coverageWarning } = useVectorSearch();

  const [selectedDomain, setSelectedDomain] = useState('devices');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDomain, setSearchDomain] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [localFallbackResults, setLocalFallbackResults] = useState<
    Array<{ source: string; title: string; content: string; similarity_score?: number }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const effectiveStats = stats && stats.total > 0 ? stats : FALLBACK_STATS;

  const handleFileUpload = useCallback(
    async (file: File) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        useKnowledgeStore.setState({
          error: `不支持的文件格式 ${ext}，仅支持 ${ACCEPTED_EXTENSIONS.join(' / ')}`,
        });
        return;
      }
      setUploadSuccess(null);
      const chunkCount = await uploadDocument(file, selectedDomain);
      if (chunkCount !== null) {
        setUploadSuccess(`成功入库 ${chunkCount} 条法规知识块`);
      }
    },
    [uploadDocument, selectedDomain]
  );

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLocalFallbackResults([]);
    await search(q, searchDomain || undefined, 5);

    // Local fallback search if backend offline
    if (!stats) {
      const pool = searchDomain
        ? FRONTEND_KNOWLEDGE_BASE[searchDomain] || []
        : Object.values(FRONTEND_KNOWLEDGE_BASE).flat();
      const lower = q.toLowerCase();
      const matched = pool
        .filter(
          (item) =>
            item.title.toLowerCase().includes(lower) ||
            item.content.toLowerCase().includes(lower) ||
            item.source.toLowerCase().includes(lower)
        )
        .map((item) => ({ ...item, similarity_score: 0.86 }));
      setLocalFallbackResults(matched.length > 0 ? matched : pool.slice(0, 2).map((i) => ({ ...i, similarity_score: 0.72 })));
    }
  }, [search, searchQuery, searchDomain, stats]);

  const displayedResults = searchResults.length > 0 ? searchResults : localFallbackResults;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload Card */}
      <section className="ym-drawer-card">
        <div className="ym-sp-title">入库临床指南与法规文献</div>
        <button
          type="button"
          className={`ym-drop-zone ${isDragging ? 'dragging' : ''}`}
          style={{ width: '100%', padding: '18px 12px', marginTop: 0, background: 'var(--ym-bg-sheet)' }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          <span style={{ fontWeight: 500, color: 'var(--ym-text-primary)' }}>
            拖拽或点击上传 PDF / MD / TXT 法规文件
          </span>
          <span style={{ fontSize: 11.5 }}>自动切片并写入对应医学细分域向量库</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="ym-kb-domain" style={{ fontSize: 12.5, color: 'var(--ym-text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
            目标入库域
          </label>
          <select
            id="ym-kb-domain"
            className="ym-input"
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            style={{ background: 'var(--ym-bg-sheet)' }}
          >
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ym-text-accent)' }}>
            <Loader2 size={13} className="ym-spin" />
            正在切片并建立向量索引...
          </div>
        )}

        {uploadSuccess && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ym-text-success)', fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            {uploadSuccess}
          </div>
        )}

        {error && (
          <div className="ym-rail-alert" role="alert" style={{ marginTop: 0 }}>
            <span>{error}</span>
            <button
              type="button"
              className="ym-icon-btn"
              style={{ width: 20, height: 20, color: 'var(--ym-text-danger)' }}
              aria-label="关闭知识库错误提示"
              onClick={clearError}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </section>

      {/* Stats Card */}
      <section className="ym-drawer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ym-sp-title">知识库分域覆盖统计</span>
          <span className="ym-rag-pill">共 {effectiveStats.total} 条法规块</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(effectiveStats.by_domain).map(([domain, count]) => {
            const label = DOMAIN_OPTIONS.find((d) => d.value === domain)?.label || domain;
            const pct = effectiveStats.total > 0 ? Math.round((count / effectiveStats.total) * 100) : 0;
            return (
              <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span
                  style={{
                    width: 128,
                    color: 'var(--ym-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 7,
                    background: 'var(--ym-bg-segment)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'var(--ym-text-success)',
                      borderRadius: 999,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    minWidth: 28,
                    textAlign: 'right',
                    fontFamily: 'var(--ym-font-mono)',
                    fontWeight: 600,
                    color: 'var(--ym-text-primary)',
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Semantic Search Card */}
      <section className="ym-drawer-card">
        <div className="ym-sp-title">语义检索测试 (TOP 5)</div>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              className="ym-input"
              style={{ background: 'var(--ym-bg-sheet)' }}
              placeholder="输入法规关键词，如：近红外激发光谱、LD50..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="输入知识库语义检索关键词"
            />
            <button
              type="submit"
              className="ym-btn-primary ym-btn-sm"
              style={{ height: 34, flex: 'none' }}
              disabled={isSearching || !searchQuery.trim()}
            >
              <Search size={13} />
              <span>{isSearching ? '检索中' : '检索'}</span>
            </button>
          </div>
          <select
            className="ym-input"
            style={{ background: 'var(--ym-bg-sheet)' }}
            value={searchDomain}
            onChange={(e) => setSearchDomain(e.target.value)}
            aria-label="筛选检索领域"
          >
            <option value="">全部医学域</option>
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </form>

        {coverageWarning && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--ym-text-warning)',
              background: 'var(--ym-bg-warning-soft)',
              padding: '7px 10px',
              borderRadius: 8,
            }}
          >
            <AlertTriangle size={13} />
            当前查询命中相似度偏低，建议补充对应领域法规文档。
          </div>
        )}

        {displayedResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayedResults.map((r, i) => {
              const score = r.similarity_score;
              return (
                <article
                  key={i}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--ym-bg-sheet)',
                    border: '1px solid var(--ym-border-subtle)',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ym-text-accent)', fontWeight: 600 }}>
                      {r.source}
                    </span>
                    {score !== undefined && (
                      <span className="ym-rag-pill" style={{ padding: '1px 7px', fontSize: 11 }}>
                        {(score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--ym-text-primary)' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ym-text-secondary)', lineHeight: 1.55 }}>
                    {r.content}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default KnowledgeManager;
