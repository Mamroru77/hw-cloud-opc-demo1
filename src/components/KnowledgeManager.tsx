import React, { useCallback, useEffect, useState } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import { useVectorSearch } from '../hooks/useVectorSearch';

const ACCEPTED_EXTENSIONS = ['.pdf', '.md', '.txt'];
const DOMAIN_OPTIONS = [
  { value: 'devices', label: '医疗器械与成像分子' },
  { value: 'drugs', label: '创新药物与生物治疗' },
  { value: 'ai', label: '医疗AI与智能诊断' },
  { value: 'surgical', label: '创新临床术式与疗法' },
];

function KnowledgeManager() {
  const {
    stats,
    isLoading,
    error,
    uploadDocument,
    fetchStats,
    clearError,
  } = useKnowledgeStore();

  const { results: searchResults, isLoading: isSearching, search, coverageWarning } = useVectorSearch();

  const [selectedDomain, setSelectedDomain] = useState('devices');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDomain, setSearchDomain] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFileUpload = useCallback(async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      useKnowledgeStore.setState({ error: `不支持的文件格式 ${ext}，仅支持 ${ACCEPTED_EXTENSIONS.join('/')}` });
      return;
    }
    setUploadSuccess(null);
    const chunkCount = await uploadDocument(file, selectedDomain);
    if (chunkCount !== null) {
      setUploadSuccess(`成功入库 ${chunkCount} 条知识块`);
    }
  }, [uploadDocument, selectedDomain]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileUpload]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    search(searchQuery, searchDomain || undefined, 5);
  }, [search, searchQuery, searchDomain]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      fontSize: '13px',
      color: 'var(--text-primary, #e2e8f0)',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>📚 知识库管理</div>

      {/* Upload Area */}
      <div style={{
        border: `2px dashed ${isDragging ? 'var(--accent-green, #10b981)' : 'rgba(148, 163, 184, 0.3)'}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragging ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
        transition: 'all 0.2s',
      }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <div style={{ fontSize: '24px', marginBottom: '6px' }}>📄</div>
        <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '12px' }}>
          拖拽或点击上传 PDF / MD / TXT 文件
        </div>
      </div>

      {/* Domain Select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>入库域：</span>
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: 'var(--text-primary, #e2e8f0)',
            fontSize: '12px',
            outline: 'none',
          }}
        >
          {DOMAIN_OPTIONS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Upload Status */}
      {isLoading && (
        <div style={{ fontSize: '12px', color: 'var(--accent-green, #10b981)' }}>⏳ 上传中...</div>
      )}
      {uploadSuccess && (
        <div style={{ fontSize: '12px', color: 'var(--accent-green, #10b981)', fontWeight: 600 }}>
          ✅ {uploadSuccess}
        </div>
      )}
      {error && (
        <div style={{
          fontSize: '12px',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '6px 10px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>❌ {error}</span>
          <span style={{ cursor: 'pointer', marginLeft: '8px' }} onClick={clearError}>✕</span>
        </div>
      )}

      {/* Stats Panel */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>📊 知识库统计</div>
        {stats ? (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
              总条目数：<span style={{ color: 'var(--text-primary, #e2e8f0)', fontWeight: 600 }}>{stats.total}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(stats.by_domain).map(([domain, count]) => {
                const label = DOMAIN_OPTIONS.find(d => d.value === domain)?.label || domain;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span style={{ width: '120px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(148, 163, 184, 0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-green, #10b981)', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ color: 'var(--text-primary, #e2e8f0)', fontWeight: 600, minWidth: '28px', textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>加载中...</div>
        )}
      </div>

      {/* Search Test */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>🔍 检索测试</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="输入查询文本..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'var(--text-primary, #e2e8f0)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <select
            value={searchDomain}
            onChange={(e) => setSearchDomain(e.target.value)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'var(--text-primary, #e2e8f0)',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="">全部域</option>
            {DOMAIN_OPTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: isSearching || !searchQuery.trim() ? 'rgba(148, 163, 184, 0.15)' : 'var(--accent-green, #10b981)',
              color: isSearching || !searchQuery.trim() ? 'var(--text-muted, #94a3b8)' : '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isSearching ? '检索中...' : '检索 TOP5'}
          </button>
        </div>

        {coverageWarning && (
          <div style={{
            fontSize: '11px',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            padding: '4px 8px',
            borderRadius: '4px',
            marginBottom: '8px',
          }}>
            ⚠️ 知识库覆盖不足
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {searchResults.map((r, i) => {
              const score = r.similarity_score;
              const isLow = score !== undefined && score < 0.5;
              let badgeColor = '#6b7280';
              let badgeBg = 'rgba(107, 114, 128, 0.1)';
              let badgeLabel = '';
              if (score !== undefined) {
                if (score >= 0.8) { badgeColor = '#10b981'; badgeBg = 'rgba(16, 185, 129, 0.1)'; badgeLabel = '高'; }
                else if (score >= 0.5) { badgeColor = '#f59e0b'; badgeBg = 'rgba(245, 158, 11, 0.1)'; badgeLabel = '中'; }
                else { badgeLabel = '低'; }
              }
              return (
                <div
                  key={i}
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '6px',
                    opacity: isLow ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.source}
                    </span>
                    {score !== undefined && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: badgeColor,
                        background: badgeBg,
                        padding: '1px 6px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                      }}>
                        {score.toFixed(2)} {badgeLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeManager;
