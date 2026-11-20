import React, { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Play, RotateCcw, Loader2, Check, X } from 'lucide-react';
import type { AppParams, CustomPaper, PresetPaper } from '../lib/types';

export type PaperListItem = PresetPaper | CustomPaper;

interface LeftPaperRailProps {
  papers: PaperListItem[];
  selectedPaperId: string;
  completedPaperIds: Set<string>;
  hasDeletedPresets: boolean;
  isAnalyzing: boolean;
  isUploading: boolean;
  uploadError: string | null;
  onDismissUploadError: () => void;
  onSelectPaper: (id: string, params: AppParams) => void;
  onDeletePaper: (id: string) => void;
  onRestorePresets: () => void;
  onUploadFile: (file: File) => void;
  onStartTranslation: () => void;
  onClearResults: () => void;
  mobileHidden?: boolean;
}

function getDomainTag(paper: PaperListItem): string {
  const domain = 'domain' in paper ? paper.domain : paper.params.domain;
  if (domain === 'drugs') return '新药临床';
  if (domain === 'ai') return 'SaMD 部署';
  if (domain === 'surgical') return '术式推广';
  return '术中导航';
}

export const LeftPaperRail: React.FC<LeftPaperRailProps> = ({
  papers,
  selectedPaperId,
  completedPaperIds,
  hasDeletedPresets,
  isAnalyzing,
  isUploading,
  uploadError,
  onDismissUploadError,
  onSelectPaper,
  onDeletePaper,
  onRestorePresets,
  onUploadFile,
  onStartTranslation,
  onClearResults,
  mobileHidden = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  };

  return (
    <aside
      className={`ym-left-rail ${mobileHidden ? 'mobile-hidden' : ''}`}
      aria-label="学术论文队列与转化触发"
    >
      <div className="ym-rail-head">
        <span className="ym-rail-kicker">论文队列 ({papers.length})</span>
        <button
          type="button"
          className="ym-rail-add"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Plus size={13} />
          <span>导入</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="上传学术论文文件"
        />
      </div>

      <div className="ym-paper-scroll" role="list">
        {papers.map((paper) => {
          const isActive = paper.id === selectedPaperId;
          const isCompleted = completedPaperIds.has(paper.id);
          const year = 'year' in paper ? paper.year : new Date().getFullYear();

          return (
            <div
              key={paper.id}
              role="listitem"
              className={`ym-paper-card ${isActive ? 'active' : ''}`}
              tabIndex={0}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSelectPaper(paper.id, paper.params)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPaper(paper.id, paper.params);
                }
              }}
            >
              <div className="ym-paper-card-top">
                <div className="ym-paper-title">{paper.title}</div>
                <button
                  type="button"
                  className="ym-paper-delete"
                  aria-label={`移除论文 ${paper.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePaper(paper.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="ym-paper-meta">
                <span className="ym-paper-tag">{getDomainTag(paper)}</span>
                {isCompleted ? (
                  <span className="ym-paper-done-dot">
                    <Check size={11} />
                    已转化
                  </span>
                ) : (
                  <span>{year}</span>
                )}
              </div>
            </div>
          );
        })}

        {hasDeletedPresets && (
          <button type="button" className="ym-restore-btn" onClick={onRestorePresets}>
            恢复全部预置示范论文
          </button>
        )}

        <button
          type="button"
          className={`ym-drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={15} className="ym-spin" />
              <span>正在校验与解析文献...</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>+ 拖拽 PDF / Markdown 文献</span>
            </>
          )}
        </button>

        {uploadError && (
          <div className="ym-rail-alert" role="alert">
            <span>{uploadError}</span>
            <button
              type="button"
              className="ym-icon-btn"
              style={{ width: 20, height: 20, color: 'var(--ym-text-danger)' }}
              aria-label="关闭上传提示"
              onClick={onDismissUploadError}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Sticky Footer — Primary CTA always above the fold (fixes P0-1) */}
      <div className="ym-left-footer">
        <button
          type="button"
          className="ym-btn-primary"
          disabled={isAnalyzing || papers.length === 0}
          onClick={onStartTranslation}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={15} className="ym-spin" />
              <span>Agent 分析中...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>启动 Agent 转化</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="ym-btn-secondary"
          disabled={isAnalyzing}
          onClick={onClearResults}
          aria-label="清空当前转化结果"
          title="清空当前结果"
        >
          <RotateCcw size={14} />
          <span>清空</span>
        </button>
      </div>
    </aside>
  );
};
