import React from 'react';
import { Check, Loader2, Play, AlertTriangle, X } from 'lucide-react';
import { YunmaiLogo } from './icons/BrandIcons';
import { ParamsTab } from './ParamsTab';
import { MatchingTab } from './MatchingTab';
import { DocsTab } from './DocsTab';
import type { AppParams, RAGReference, RobotMatch, WorkspaceTab } from '../lib/types';

interface CenterWorkspaceProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  pipelineStep: number;
  isAnalyzing: boolean;
  analysisError: string | null;
  onDismissAnalysisError: () => void;
  selectedPaperTitle: string;
  state: AppParams;
  matchedRobots: RobotMatch[];
  clinicalDoc: string;
  bpDoc: string;
  ragReferences: RAGReference[];
  onStartTranslation: () => void;
  onInlineUpdateParam: (key: keyof AppParams, value: number | string, label: string) => void;
  onDownloadDoc: (filename: string, content: string) => void;
  mobileHidden?: boolean;
}

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'params', label: '提取指标参数' },
  { id: 'matching', label: '成果落地匹配' },
  { id: 'docs', label: '生成商业 / 临床文档' },
];

const PIPELINE_STEPS = [
  { step: 1, label: '技术理解' },
  { step: 2, label: '场景匹配' },
  { step: 3, label: '执行输出' },
];

export const CenterWorkspace: React.FC<CenterWorkspaceProps> = ({
  currentTab,
  onSelectTab,
  pipelineStep,
  isAnalyzing,
  analysisError,
  onDismissAnalysisError,
  selectedPaperTitle,
  state,
  matchedRobots,
  clinicalDoc,
  bpDoc,
  ragReferences,
  onStartTranslation,
  onInlineUpdateParam,
  onDownloadDoc,
  mobileHidden = false,
}) => {
  const getStepStatus = (stepNum: number): 'idle' | 'running' | 'done' => {
    if (pipelineStep > stepNum || (pipelineStep === 3 && !isAnalyzing)) return 'done';
    if (pipelineStep === stepNum && isAnalyzing) return 'running';
    if (pipelineStep >= stepNum) return 'done';
    return 'idle';
  };

  const renderEmptyState = (title: string, desc: string) => (
    <div className="ym-empty-state">
      <div className="ym-empty-mark">
        <YunmaiLogo size={28} />
      </div>
      <h1 className="ym-empty-title">{title}</h1>
      <p className="ym-empty-desc">
        当前选中论文：<strong>{selectedPaperTitle || '未选择文献'}</strong>。{desc}
      </p>
      <button
        type="button"
        className="ym-btn-primary"
        style={{ flex: 'none', padding: '0 22px', height: 40 }}
        disabled={isAnalyzing}
        onClick={onStartTranslation}
      >
        {isAnalyzing ? (
          <>
            <Loader2 size={15} className="ym-spin" />
            <span>正在执行三智能体流水线...</span>
          </>
        ) : (
          <>
            <Play size={14} />
            <span>立即启动 Agent 转化</span>
          </>
        )}
      </button>

      <div className="ym-empty-steps">
        <div className="ym-empty-step-card">
          <span className="ym-empty-step-num">STEP 01</span>
          <span className="ym-empty-step-name">技术理解 Agent</span>
          <span className="ym-empty-step-desc">提取 PK / ROC / 学习曲线与 6 项核心理化指标并做 RAG 法规核验。</span>
        </div>
        <div className="ym-empty-step-card">
          <span className="ym-empty-step-num">STEP 02</span>
          <span className="ym-empty-step-name">场景匹配 Agent</span>
          <span className="ym-empty-step-desc">基于波长、科室与准入要求，输出 TOP 3 医院基地或机器人系统。</span>
        </div>
        <div className="ym-empty-step-card">
          <span className="ym-empty-step-num">STEP 03</span>
          <span className="ym-empty-step-name">执行输出 Agent</span>
          <span className="ym-empty-step-desc">自动生成 Phase I 临床试验草案与商业融资计划书，支持 .md 导出。</span>
        </div>
      </div>
    </div>
  );

  return (
    <main
      className={`ym-main-sheet ${mobileHidden ? 'mobile-hidden' : ''}`}
      aria-label="核心分析与成果转化工作区"
    >
      <div className="ym-sheet-head">
        {/* Craft Segmented Tabs */}
        <div className="ym-seg-tabs" role="tablist" aria-label="转化成果视图切换">
          {TABS.map((tab) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`ym-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`ym-tabpanel-${tab.id}`}
                className={`ym-seg-tab ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Compact Horizontal 3-Agent Stepper */}
        <div className="ym-mini-steps" aria-label="多智能体流水线进度">
          {PIPELINE_STEPS.map((item) => {
            const status = getStepStatus(item.step);
            return (
              <span key={item.step} className={`ym-step-pill ${status}`}>
                <span className="ym-step-icon" aria-hidden="true">
                  {status === 'done' ? (
                    <Check size={10} strokeWidth={3} />
                  ) : status === 'running' ? (
                    <Loader2 size={10} className="ym-spin" />
                  ) : (
                    item.step
                  )}
                </span>
                <span>{item.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="ym-sheet-scroll">
        {analysisError && (
          <div className="ym-rail-alert" role="alert" style={{ marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              {analysisError}
            </span>
            <button
              type="button"
              className="ym-icon-btn"
              style={{ width: 22, height: 22, color: 'var(--ym-text-danger)' }}
              aria-label="关闭警告"
              onClick={onDismissAnalysisError}
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div
          id={`ym-tabpanel-${currentTab}`}
          role="tabpanel"
          aria-labelledby={`ym-tab-${currentTab}`}
        >
          {currentTab === 'params' &&
            (pipelineStep === 0 ? (
              renderEmptyState(
                '准备提取理化指标与药代曲线',
                '点击下方或左侧主按钮，技术理解 Agent 将自动解析论文关键指标并检索 NMPA/FDA 知识库完成校准。'
              )
            ) : (
              <ParamsTab
                state={state}
                ragReferences={ragReferences}
                onInlineUpdateParam={onInlineUpdateParam}
              />
            ))}

          {currentTab === 'matching' &&
            (pipelineStep < 2 ? (
              renderEmptyState(
                '等待场景与临床落地匹配',
                '场景匹配 Agent 将依据理化指标与目标科室，智能排序 TOP 3 兼容手术机器人、GCP 基地或 PACS 生态。'
              )
            ) : (
              <MatchingTab
                state={state}
                matchedRobots={matchedRobots}
                ragReferences={ragReferences}
              />
            ))}

          {currentTab === 'docs' &&
            (pipelineStep < 3 ? (
              renderEmptyState(
                '等待临床方案与商业计划书生成',
                '执行输出 Agent 将汇总全部参数与匹配结果，一键生成可编辑、可导出的《临床试验方案》与《商业融资计划书》。'
              )
            ) : (
              <DocsTab
                clinicalDoc={clinicalDoc}
                bpDoc={bpDoc}
                onDownload={onDownloadDoc}
              />
            ))}
        </div>
      </div>
    </main>
  );
};
