import React, { useState } from 'react';
import { Download, FileText, Briefcase, Copy, Check } from 'lucide-react';

interface DocsTabProps {
  clinicalDoc: string;
  bpDoc: string;
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

export const DocsTab: React.FC<DocsTabProps> = ({ clinicalDoc, bpDoc, onDownload }) => {
  const [copiedKey, setCopiedKey] = useState<'clinical' | 'bp' | null>(null);

  const handleCopy = async (key: 'clinical' | 'bp', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // ignore clipboard restrictions
    }
  };

  return (
    <div className="ym-docs-split">
      {/* Clinical Trial Protocol */}
      <article className="ym-doc-card">
        <div className="ym-doc-head">
          <div className="ym-doc-title">
            <FileText size={15} style={{ color: 'var(--ym-text-accent)' }} />
            <span>临床试验设计方案草案</span>
          </div>
          <div className="ym-doc-actions">
            <button
              type="button"
              className="ym-btn-secondary ym-btn-sm"
              onClick={() => handleCopy('clinical', clinicalDoc)}
              aria-label="复制临床试验方案"
            >
              {copiedKey === 'clinical' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'clinical' ? '已复制' : '复制'}</span>
            </button>
            <button
              type="button"
              className="ym-btn-primary ym-btn-sm"
              style={{ flex: 'none' }}
              onClick={() => onDownload('临床试验设计方案草案.md', clinicalDoc)}
            >
              <Download size={13} />
              <span>导出 .md</span>
            </button>
          </div>
        </div>
        <div className="ym-doc-body">
          <MarkdownView content={clinicalDoc} />
        </div>
      </article>

      {/* Business Plan */}
      <article className="ym-doc-card">
        <div className="ym-doc-head">
          <div className="ym-doc-title">
            <Briefcase size={15} style={{ color: 'var(--ym-text-success)' }} />
            <span>商业融资计划书 (BP)</span>
          </div>
          <div className="ym-doc-actions">
            <button
              type="button"
              className="ym-btn-secondary ym-btn-sm"
              onClick={() => handleCopy('bp', bpDoc)}
              aria-label="复制商业融资计划书"
            >
              {copiedKey === 'bp' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'bp' ? '已复制' : '复制'}</span>
            </button>
            <button
              type="button"
              className="ym-btn-primary ym-btn-sm"
              style={{ flex: 'none' }}
              onClick={() => onDownload('商业融资计划书.md', bpDoc)}
            >
              <Download size={13} />
              <span>导出 .md</span>
            </button>
          </div>
        </div>
        <div className="ym-doc-body">
          <MarkdownView content={bpDoc} />
        </div>
      </article>
    </div>
  );
};
