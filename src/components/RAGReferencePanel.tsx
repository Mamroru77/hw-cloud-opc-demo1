import React from 'react';

interface RAGReferenceItem {
  source: string;
  title: string;
  content: string;
  similarity_score?: number;
  domain?: string;
}

interface RAGReferencePanelProps {
  references: RAGReferenceItem[];
  coverageWarning?: boolean;
  isDegraded?: boolean;
}

function SimilarityBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;

  const display = score.toFixed(2);

  if (score >= 0.8) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        color: '#10b981',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {display} 高相关性
      </span>
    );
  }

  if (score >= 0.5) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        color: '#f59e0b',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {display} 中相关性
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'rgba(107, 114, 128, 0.12)',
      border: '1px solid rgba(107, 114, 128, 0.3)',
      color: '#6b7280',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {display} 低相关性
    </span>
  );
}

function RAGReferencePanel({ references, coverageWarning, isDegraded }: RAGReferencePanelProps) {
  if (!references || references.length === 0) return null;

  return (
    <div className="rag-reference-box" style={{ marginTop: '20px', gridColumn: 'span 2', width: '100%' }}>
      <div className="rag-reference-header">
        <div className="rag-reference-badge">
          <span className="rag-badge-dot"></span>
          <span>RAG 知识库比对核验凭据</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>检索到 {references.length} 项法规与学术基准参考</span>
      </div>

      {coverageWarning && (
        <div style={{
          margin: '8px 12px',
          padding: '8px 12px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#f59e0b',
          fontWeight: 500,
        }}>
          ⚠️ 知识库覆盖不足
        </div>
      )}

      {isDegraded && (
        <div style={{
          margin: '8px 12px',
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#ef4444',
          fontWeight: 500,
        }}>
          ⚠️ 向量检索服务不可用，已降级至基础知识库模式
        </div>
      )}

      <div className="rag-reference-list">
        {references.map((ref, idx) => {
          const isLow = ref.similarity_score !== undefined && ref.similarity_score < 0.5;
          return (
            <div
              key={idx}
              className="rag-ref-item"
              style={isLow ? { opacity: 0.5 } : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div className="rag-ref-source">📄 数据依据来源：{ref.source}</div>
                <SimilarityBadge score={ref.similarity_score} />
              </div>
              <div className="rag-ref-title">参考条目：{ref.title}</div>
              <div className="rag-ref-content">{ref.content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const renderRAGBadge = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-green)' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></span>
      <span>已连接知识库 (RAG-Enabled)</span>
    </div>
  );
};

export default RAGReferencePanel;
