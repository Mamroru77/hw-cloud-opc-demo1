import React, { useState } from 'react';
import {
  Download,
  FileText,
  Briefcase,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Edit3,
  Eye,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { exportDocAsDocx, exportDocAsPdf } from '../utils/docExporters';

interface DocsTabProps {
  clinicalDoc: string;
  bpDoc: string;
  paperTitle?: string;
  domain?: string;
  docSource?: 'llm' | 'template';
  docProviderUsed?: string | null;
  isDocsStale?: boolean;
  isRegeneratingDocs?: boolean;
  canUseLLM?: boolean;
  onRegenerateDocs?: () => void;
  onUpdateClinicalDoc?: (next: string) => void;
  onUpdateBpDoc?: (next: string) => void;
  onDownload: (filename: string, content: string) => void;
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const MarkdownView: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = (keyPrefix: number) => {
    if (listItems.length === 0 || !listType) return;
    const Tag = listType;
    elements.push(
      <Tag key={`list-${keyPrefix}`}>
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineBold(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(index);
      return;
    }

    if (line.startsWith('### ')) {
      flushList(index);
      elements.push(<h3 key={index}>{renderInlineBold(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      flushList(index);
      elements.push(<h2 key={index}>{renderInlineBold(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      flushList(index);
      elements.push(<h1 key={index}>{renderInlineBold(line.slice(2))}</h1>);
    } else if (/^[-*]\s+/.test(line)) {
      if (listType && listType !== 'ul') flushList(index);
      listType = 'ul';
      listItems.push(line.replace(/^[-*]\s+/, ''));
    } else if (/^\d+\.\s+/.test(line)) {
      if (listType && listType !== 'ol') flushList(index);
      listType = 'ol';
      listItems.push(line.replace(/^\d+\.\s+/, ''));
    } else {
      flushList(index);
      elements.push(<p key={index}>{renderInlineBold(line)}</p>);
    }
  });
  flushList(lines.length);

  return <div className="ym-md">{elements}</div>;
};

export const DocsTab: React.FC<DocsTabProps> = ({
  clinicalDoc,
  bpDoc,
  paperTitle = '转化医学项目',
  domain = 'devices',
  docSource = 'template',
  docProviderUsed,
  isDocsStale = false,
  isRegeneratingDocs = false,
  canUseLLM = false,
  onRegenerateDocs,
  onUpdateClinicalDoc,
  onUpdateBpDoc,
  onDownload,
}) => {
  const [copiedKey, setCopiedKey] = useState<'clinical' | 'bp' | null>(null);
  const [editingDoc, setEditingDoc] = useState<{ clinical: boolean; bp: boolean }>({
    clinical: false,
    bp: false,
  });
  const [exportingKey, setExportingKey] = useState<'clinical' | 'bp' | null>(null);

  const handleCopy = async (key: 'clinical' | 'bp', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleExportDocx = async (key: 'clinical' | 'bp', baseName: string, content: string) => {
    setExportingKey(key);
    try {
      await exportDocAsDocx(`${baseName}.docx`, `${paperTitle} - ${baseName}`, content, domain);
    } finally {
      setExportingKey(null);
    }
  };

  const docCards = [
    {
      key: 'clinical' as const,
      title: '临床试验设计方案草案',
      baseName: '临床试验设计方案草案',
      icon: <FileText size={15} style={{ color: 'var(--ym-text-accent)' }} />,
      content: clinicalDoc,
      isEditing: editingDoc.clinical,
      onToggleEdit: () => setEditingDoc((prev) => ({ ...prev, clinical: !prev.clinical })),
      onChangeContent: onUpdateClinicalDoc,
    },
    {
      key: 'bp' as const,
      title: '商业融资计划书 (BP)',
      baseName: '商业融资计划书',
      icon: <Briefcase size={15} style={{ color: 'var(--ym-text-success)' }} />,
      content: bpDoc,
      isEditing: editingDoc.bp,
      onToggleEdit: () => setEditingDoc((prev) => ({ ...prev, bp: !prev.bp })),
      onChangeContent: onUpdateBpDoc,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Document Source & Sync Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '9px 12px',
          borderRadius: 10,
          background: isDocsStale ? 'var(--ym-bg-warning-soft)' : 'var(--ym-bg-sheet)',
          border: `1px solid ${isDocsStale ? 'var(--ym-text-warning)' : 'var(--ym-border-subtle)'}`,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {isDocsStale ? (
            <AlertTriangle size={14} style={{ color: 'var(--ym-text-warning)' }} />
          ) : (
            <Sparkles size={14} style={{ color: 'var(--ym-text-accent)' }} />
          )}
          <span style={{ color: 'var(--ym-text-primary)', fontWeight: 550 }}>
            {docSource === 'llm'
              ? `文档来源：大模型实时生成${docProviderUsed ? ` (${docProviderUsed})` : ''}`
              : '文档来源：结构化规则模板（配置 API Key 或服务端 .env 后可由大模型生成）'}
          </span>
          {isDocsStale && (
            <span style={{ color: 'var(--ym-text-warning)', fontWeight: 600 }}>
              · 参数已调整，已保留当前大模型文档避免覆盖，可点击右侧重新生成同步最新参数
            </span>
          )}
        </div>

        {onRegenerateDocs && (isDocsStale || canUseLLM) && (
          <button
            type="button"
            className="ym-btn-primary ym-btn-sm"
            style={{ flex: 'none' }}
            disabled={isRegeneratingDocs}
            onClick={onRegenerateDocs}
          >
            <RefreshCw size={12} className={isRegeneratingDocs ? 'ym-spin' : ''} />
            <span>
              {isRegeneratingDocs
                ? '大模型生成中...'
                : isDocsStale
                  ? '同步最新参数并重新生成'
                  : '用大模型重新生成'}
            </span>
          </button>
        )}
      </div>

      <div className="ym-docs-split">
        {docCards.map((card) => (
          <article key={card.key} className="ym-doc-card">
            <div className="ym-doc-head">
              <div className="ym-doc-title">
                {card.icon}
                <span>{card.title}</span>
              </div>
              <div className="ym-doc-actions">
                <button
                  type="button"
                  className="ym-btn-secondary ym-btn-sm"
                  onClick={card.onToggleEdit}
                  aria-label={card.isEditing ? `完成编辑${card.title}` : `在线编辑${card.title}`}
                >
                  {card.isEditing ? <Eye size={13} /> : <Edit3 size={13} />}
                  <span>{card.isEditing ? '预览' : '编辑'}</span>
                </button>
                <button
                  type="button"
                  className="ym-btn-secondary ym-btn-sm"
                  onClick={() => handleCopy(card.key, card.content)}
                  aria-label={`复制${card.title}`}
                >
                  {copiedKey === card.key ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === card.key ? '已复制' : '复制'}</span>
                </button>
                <button
                  type="button"
                  className="ym-btn-secondary ym-btn-sm"
                  disabled={exportingKey === card.key}
                  onClick={() => handleExportDocx(card.key, card.baseName, card.content)}
                  aria-label={`导出 ${card.title} 为 Word (.docx)`}
                >
                  <FileSpreadsheet size={13} />
                  <span>{exportingKey === card.key ? '导出中...' : '.docx'}</span>
                </button>
                <button
                  type="button"
                  className="ym-btn-secondary ym-btn-sm"
                  onClick={() => exportDocAsPdf(`${paperTitle} - ${card.baseName}`, card.content)}
                  aria-label={`导出 ${card.title} 为 PDF`}
                >
                  <Printer size={13} />
                  <span>.pdf</span>
                </button>
                <button
                  type="button"
                  className="ym-btn-primary ym-btn-sm"
                  style={{ flex: 'none' }}
                  onClick={() => onDownload(`${card.baseName}.md`, card.content)}
                >
                  <Download size={13} />
                  <span>.md</span>
                </button>
              </div>
            </div>
            <div className="ym-doc-body">
              {card.isEditing ? (
                <textarea
                  className="ym-doc-editor"
                  value={card.content}
                  aria-label={`在线编辑${card.title} Markdown 正文`}
                  onChange={(e) => card.onChangeContent?.(e.target.value)}
                />
              ) : (
                <MarkdownView content={card.content} />
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
