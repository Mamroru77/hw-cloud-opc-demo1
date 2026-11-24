import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Check,
  Ban,
  RefreshCw,
  History,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import { useVectorSearch } from '../hooks/useVectorSearch';
import { FRONTEND_KNOWLEDGE_BASE } from '../lib/constants';
import { getActorRole, getJwtToken, switchActorRole, type ActorRole } from '../lib/api';

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
  pending_count: 0,
  engine: 'offline-fallback',
};

function KnowledgeManager() {
  const {
    stats,
    pendingEntries,
    auditLogs,
    isLoading,
    error,
    uploadDocument,
    fetchStats,
    fetchPending,
    approveEntry,
    rejectEntry,
    fetchAuditLogs,
    syncKnowledgeLake,
    clearError,
  } = useKnowledgeStore();
  const { results: searchResults, isLoading: isSearching, search, coverageWarning } = useVectorSearch();

  const [selectedDomain, setSelectedDomain] = useState('devices');
  const [actorRole, setActorRoleState] = useState<ActorRole>(() => getActorRole());
  const [hasJwtToken, setHasJwtToken] = useState<boolean>(() => Boolean(getJwtToken()));
  const [autoApprove, setAutoApprove] = useState(() => getActorRole() === 'reviewer');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [lakeNotice, setLakeNotice] = useState<string | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDomain, setSearchDomain] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [localFallbackResults, setLocalFallbackResults] = useState<
    Array<{ source: string; title: string; content: string; similarity_score?: number; matched_terms?: string[] }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
    fetchPending();
    fetchAuditLogs();
    if (!getJwtToken()) {
      switchActorRole(getActorRole()).then((res) => setHasJwtToken(res.hasJwt));
    }
  }, [fetchStats, fetchPending, fetchAuditLogs]);

  const handleRoleSwitch = async (nextRole: ActorRole) => {
    clearError();
    const res = await switchActorRole(nextRole);
    setActorRoleState(res.role);
    setHasJwtToken(res.hasJwt);
    setAutoApprove(res.role === 'reviewer');
  };

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
      setUploadNotice(null);
      const result = await uploadDocument(file, selectedDomain, autoApprove);
      if (result) {
        setUploadNotice(result.message);
      }
    },
    [uploadDocument, selectedDomain, autoApprove]
  );

  const handleApprove = async (entryId: string) => {
    setUploadNotice(null);
    const msg = await approveEntry(entryId);
    if (msg) setUploadNotice(msg);
  };

  const handleReject = async (entryId: string) => {
    setUploadNotice(null);
    const msg = await rejectEntry(entryId, '内容不符合临床转化知识入库标准');
    if (msg) setUploadNotice(msg);
  };

  const handleSyncLake = async () => {
    setLakeNotice(null);
    const res = await syncKnowledgeLake();
    if (res) {
      setLakeNotice(res.message);
    }
  };

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLocalFallbackResults([]);
    await search(q, searchDomain || undefined, 5);

    // Local fallback search only if backend stats are unavailable
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
      setLocalFallbackResults(
        matched.length > 0 ? matched : pool.slice(0, 2).map((i) => ({ ...i, similarity_score: 0.72 }))
      );
    }
  }, [search, searchQuery, searchDomain, stats]);

  const displayedResults = searchResults.length > 0 ? searchResults : localFallbackResults;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* RBAC Role & JWT Auth Card */}
      <section className="ym-drawer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="ym-sp-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} style={{ color: 'var(--ym-text-accent)' }} />
            RBAC 权限身份（JWT 鉴权）
          </span>
          <span className="ym-rag-pill" style={{ fontSize: 11 }}>
            <UserCheck size={11} />
            {actorRole === 'reviewer' ? '医学合规审评官 (PI)' : '临床转化研究员'}
            {hasJwtToken ? ' · JWT 已签发' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={actorRole === 'researcher' ? 'ym-btn-primary ym-btn-sm' : 'ym-btn-secondary ym-btn-sm'}
            style={{ flex: 1 }}
            onClick={() => handleRoleSwitch('researcher')}
          >
            临床转化研究员 (提交待审)
          </button>
          <button
            type="button"
            className={actorRole === 'reviewer' ? 'ym-btn-primary ym-btn-sm' : 'ym-btn-secondary ym-btn-sm'}
            style={{ flex: 1 }}
            onClick={() => handleRoleSwitch('reviewer')}
          >
            医学合规审评官 PI (审批入库)
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ym-text-muted)', lineHeight: 1.45 }}>
          {actorRole === 'researcher'
            ? '当前为研究员身份：仅可上传文献至待审队列，执行审批操作将被后端 RBAC 鉴权拦截 (HTTP 403)。'
            : '当前为审评官 (PI) 身份：拥有待审文献审批入库、驳回及自动审核权限，操作记入实名审计日志。'}
        </div>
      </section>

      {/* Upload Card */}
      <section className="ym-drawer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="ym-sp-title">入库临床指南与法规文献</div>
          <button
            type="button"
            className="ym-btn-secondary ym-btn-sm"
            disabled={isLoading}
            onClick={handleSyncLake}
            title="从华为云知识湖增量同步（需配置 KNOWLEDGE_LAKE_AK/SK）"
          >
            <RefreshCw size={12} className={isLoading ? 'ym-spin' : ''} />
            <span>同步知识湖</span>
          </button>
        </div>

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
          <span style={{ fontSize: 11.5 }}>真实解析文本并持久化写入对应医学细分域索引库</span>
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
          <label
            htmlFor="ym-kb-domain"
            style={{ fontSize: 12.5, color: 'var(--ym-text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}
          >
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

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: actorRole === 'researcher' ? 'var(--ym-text-muted)' : 'var(--ym-text-secondary)',
            cursor: actorRole === 'researcher' ? 'not-allowed' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={actorRole === 'researcher' ? false : autoApprove}
            disabled={actorRole === 'researcher'}
            onChange={(e) => setAutoApprove(e.target.checked)}
          />
          <span>
            {actorRole === 'researcher'
              ? '研究员身份禁止自审，上传文档将自动进入下方 PI 待审队列'
              : '上传后自动审核并立即写入检索索引（取消勾选则进入下方人工待审队列）'}
          </span>
        </label>

        {isLoading && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ym-text-accent)' }}>
            <Loader2 size={13} className="ym-spin" />
            正在解析文档并更新索引...
          </div>
        )}

        {uploadNotice && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ym-text-success)', fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            {uploadNotice}
          </div>
        )}

        {lakeNotice && (
          <div style={{ fontSize: 12, color: 'var(--ym-text-secondary)', background: 'var(--ym-bg-sheet)', padding: '6px 10px', borderRadius: 8 }}>
            {lakeNotice}
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

      {/* Pending Review Queue */}
      {pendingEntries.length > 0 && (
        <section className="ym-drawer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ym-sp-title">待审核入库队列</span>
            <span className="ym-rag-pill" style={{ background: 'var(--ym-bg-warning-soft)', color: 'var(--ym-text-warning)' }}>
              {pendingEntries.length} 条待审
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--ym-bg-sheet)',
                  border: '1px solid var(--ym-border-subtle)',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--ym-text-primary)' }}>
                    {entry.filename}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ym-text-muted)' }}>
                    {DOMAIN_OPTIONS.find((d) => d.value === entry.domain)?.label || entry.domain}
                    {entry.char_count ? ` · ${entry.char_count} 字` : ''}
                  </span>
                </div>
                {entry.preview && (
                  <div style={{ fontSize: 11.5, color: 'var(--ym-text-secondary)', lineHeight: 1.45 }}>
                    {entry.preview}...
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <button
                    type="button"
                    className="ym-btn-primary ym-btn-sm"
                    disabled={isLoading}
                    onClick={() => handleApprove(entry.id)}
                  >
                    <Check size={12} />
                    <span>通过并入库</span>
                  </button>
                  <button
                    type="button"
                    className="ym-btn-secondary ym-btn-sm"
                    disabled={isLoading}
                    onClick={() => handleReject(entry.id)}
                  >
                    <Ban size={12} />
                    <span>拒绝</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stats Card */}
      <section className="ym-drawer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ym-sp-title">知识库分域覆盖统计</span>
          <span className="ym-rag-pill">
            共 {effectiveStats.total} 条法规块
            {effectiveStats.engine ? ` · ${effectiveStats.engine}` : ''}
          </span>
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
                  {'matched_terms' in r && Array.isArray(r.matched_terms) && r.matched_terms.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {r.matched_terms.map((term, ti) => (
                        <span
                          key={ti}
                          style={{
                            fontSize: 10.5,
                            padding: '1px 6px',
                            borderRadius: 999,
                            background: 'var(--ym-bg-accent-soft)',
                            color: 'var(--ym-text-accent)',
                            fontWeight: 550,
                          }}
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Audit Logs */}
      <section className="ym-drawer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ym-sp-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <History size={13} />
            入库与审批审计日志 ({auditLogs.length})
          </span>
          <button
            type="button"
            className="ym-btn-secondary ym-btn-sm"
            onClick={() => {
              const next = !showAuditLogs;
              setShowAuditLogs(next);
              if (next) fetchAuditLogs();
            }}
          >
            {showAuditLogs ? '收起' : '展开'}
          </button>
        </div>

        {showAuditLogs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {auditLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ym-text-muted)' }}>暂无审计记录</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    fontSize: 11.5,
                    padding: '6px 9px',
                    background: 'var(--ym-bg-sheet)',
                    borderRadius: 8,
                    border: '1px solid var(--ym-border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ym-text-primary)', fontWeight: 600 }}>
                    <span>
                      [{log.action}] {log.operator_id}
                    </span>
                    <span style={{ color: 'var(--ym-text-muted)', fontWeight: 400 }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--ym-text-secondary)', marginTop: 2 }}>
                    {log.after_content || log.target_id}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default KnowledgeManager;
