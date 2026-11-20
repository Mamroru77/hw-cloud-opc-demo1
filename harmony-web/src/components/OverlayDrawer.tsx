import React, { useEffect } from 'react';
import { X, Activity, BookOpen, Bot, Cpu, Radio } from 'lucide-react';
import { HuaweiIcon } from './icons/BrandIcons';
import CICDStatusPanel from './CICDStatusPanel';
import KnowledgeManager from './KnowledgeManager';
import NpuSandboxPanel from './NpuSandboxPanel';
import { RightCopilotSheet } from './RightCopilotSheet';
import type { AppParams, ChatMessage, DrawerType, RAGReference } from '../lib/types';

interface OverlayDrawerProps {
  activeDrawer: DrawerType;
  onClose: () => void;
  // Harmony props
  selectedPaperId: string;
  selectedPaperTitle: string;
  state: AppParams;
  ragReferences: RAGReference[];
  harmonySynced: boolean;
  isSyncingHarmony: boolean;
  onSyncHarmony: () => void;
  onDisconnectHarmony: () => void;
  // Mobile/Tablet Copilot props
  messages: ChatMessage[];
  chatInput: string;
  onChangeInput: (val: string) => void;
  onSendMessage: (text: string) => void;
  isSendingChat: boolean;
  modelProvider: string;
  onSelectProvider: (provider: string) => void;
  systemPrompt: string;
  onChangeSystemPrompt: (prompt: string) => void;
  onResetSystemPrompt: () => void;
}

export const OverlayDrawer: React.FC<OverlayDrawerProps> = ({
  activeDrawer,
  onClose,
  selectedPaperId,
  selectedPaperTitle,
  state,
  ragReferences,
  harmonySynced,
  isSyncingHarmony,
  onSyncHarmony,
  onDisconnectHarmony,
  messages,
  chatInput,
  onChangeInput,
  onSendMessage,
  isSendingChat,
  modelProvider,
  onSelectProvider,
  systemPrompt,
  onChangeSystemPrompt,
  onResetSystemPrompt,
}) => {
  useEffect(() => {
    if (!activeDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeDrawer, onClose]);

  if (!activeDrawer) return null;

  const headerConfig: Record<Exclude<DrawerType, null>, { icon: React.ReactNode; title: string; sub: string }> = {
    cicd: {
      icon: <Activity size={18} style={{ color: 'var(--ym-text-accent)' }} />,
      title: 'CI/CD 构建与代码质量报告',
      sub: 'CloudPipeline 实时状态与静态质量度量',
    },
    knowledge: {
      icon: <BookOpen size={18} style={{ color: 'var(--ym-text-accent)' }} />,
      title: 'RAG 医疗知识库管理',
      sub: 'NMPA / FDA / ICH 法规入库与语义检索测试',
    },
    harmony: {
      icon: <HuaweiIcon size={19} />,
      title: '鸿蒙端云双向协同',
      sub: 'NearLink 星闪元服务卡片 & 端侧 NPU 隐私沙箱',
    },
    copilot: {
      icon: <Bot size={18} style={{ color: 'var(--ym-text-accent)' }} />,
      title: '医算子 · 临床转化顾问',
      sub: '实时微调理化参数、场景权重与临床文档',
    },
  };

  const head = headerConfig[activeDrawer];
  const domainLabel =
    state.domain === 'drugs'
      ? '创新药物'
      : state.domain === 'ai'
        ? '医疗 SaMD'
        : state.domain === 'surgical'
          ? '改良术式'
          : '荧光探针';

  const keyMetricLabel =
    state.domain === 'drugs'
      ? '消除半衰期'
      : state.domain === 'ai'
        ? '模型精度'
        : state.domain === 'surgical'
          ? '学习曲线'
          : '排泄半衰期';

  const keyMetricVal =
    state.domain === 'drugs'
      ? `${state.drug_half_life} h`
      : state.domain === 'ai'
        ? `${state.accuracy}%`
        : state.domain === 'surgical'
          ? `${state.learning_curve_cases} 例`
          : `${state.half_life} h`;

  return (
    <>
      <div className="ym-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="ym-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={head.title}
      >
        <div className="ym-drawer-head">
          <div className="ym-drawer-title-group">
            {head.icon}
            <div>
              <div className="ym-drawer-title">{head.title}</div>
              <div className="ym-drawer-sub">{head.sub}</div>
            </div>
          </div>
          <button
            type="button"
            className="ym-icon-btn"
            onClick={onClose}
            aria-label={`关闭${head.title}`}
          >
            <X size={17} />
          </button>
        </div>

        {activeDrawer === 'copilot' ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <RightCopilotSheet
              messages={messages}
              chatInput={chatInput}
              onChangeInput={onChangeInput}
              onSendMessage={onSendMessage}
              isSending={isSendingChat}
              domain={state.domain}
              modelProvider={modelProvider}
              onSelectProvider={onSelectProvider}
              systemPrompt={systemPrompt}
              onChangeSystemPrompt={onChangeSystemPrompt}
              onResetSystemPrompt={onResetSystemPrompt}
              embedded={false}
            />
          </div>
        ) : (
          <div className="ym-drawer-body">
            {activeDrawer === 'cicd' && <CICDStatusPanel />}

            {activeDrawer === 'knowledge' && <KnowledgeManager />}

            {activeDrawer === 'harmony' && (
              <>
                <section className="ym-drawer-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="ym-paper-tag" style={{ background: 'var(--ym-bg-accent-soft)', color: 'var(--ym-text-accent)' }}>
                      <Radio size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
                      星闪分布式总线
                    </span>
                    <span
                      className="ym-rag-pill"
                      style={
                        harmonySynced
                          ? undefined
                          : { background: 'var(--ym-bg-segment)', color: 'var(--ym-text-secondary)' }
                      }
                    >
                      <span className={`ym-status-dot ${harmonySynced ? 'ok' : 'muted'}`} />
                      {harmonySynced ? '已绑定投屏' : 'NearLink 就绪'}
                    </span>
                  </div>

                  <div>
                    <div className="ym-sp-title">ArkUI 智能分布式元服务卡片</div>
                    <p className="ym-sp-body" style={{ marginTop: 4 }}>
                      一键将当前论文关键理化指标及 PK/ROC 曲线实时推流至附近 HarmonyOS 设备（MatePad Pro / 智慧屏 / 手术室终端）。
                    </p>
                  </div>

                  <div className="ym-arkui-preview">
                    <div className="ym-arkui-head">
                      <span style={{ fontWeight: 650, color: 'var(--ym-text-primary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <HuaweiIcon size={13} />
                        云脉 · ArkUI
                      </span>
                      <span>MatePad Pro</span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 650,
                        color: 'var(--ym-text-accent)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {selectedPaperTitle || '学术文献'}
                    </div>
                    <div className="ym-arkui-grid">
                      <div className="ym-arkui-cell">
                        <span className="ym-arkui-cell-k">细分领域</span>
                        <span className="ym-arkui-cell-v">{domainLabel}</span>
                      </div>
                      <div className="ym-arkui-cell">
                        <span className="ym-arkui-cell-k">目标科室</span>
                        <span className="ym-arkui-cell-v">{state.target_department}</span>
                      </div>
                      <div className="ym-arkui-cell">
                        <span className="ym-arkui-cell-k">{keyMetricLabel}</span>
                        <span className="ym-arkui-cell-v">{keyMetricVal}</span>
                      </div>
                      <div className="ym-arkui-cell">
                        <span className="ym-arkui-cell-k">RAG 校准凭据</span>
                        <span className="ym-arkui-cell-v">{ragReferences.length} 条</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="ym-btn-primary"
                      disabled={isSyncingHarmony}
                      onClick={onSyncHarmony}
                    >
                      {isSyncingHarmony
                        ? '星闪总线同步中...'
                        : harmonySynced
                          ? '更新多端推流'
                          : '星闪一键推流'}
                    </button>
                    {harmonySynced && (
                      <button
                        type="button"
                        className="ym-btn-secondary"
                        onClick={onDisconnectHarmony}
                      >
                        断开协同
                      </button>
                    )}
                  </div>
                </section>

                <section className="ym-drawer-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="ym-rag-pill">ArkCompiler NPU 沙箱</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ym-text-muted)', fontWeight: 500 }}>
                      <Cpu size={13} />
                      端侧隐私保护
                    </span>
                  </div>
                  <div>
                    <div className="ym-sp-title">本地端侧 3B 模型隐私脱敏</div>
                    <p className="ym-sp-body" style={{ marginTop: 4 }}>
                      调用端侧 NPU 在本地替换患者 ID、身份证号、电话及医院铭牌，确保敏感临床数据不出沙箱。
                    </p>
                  </div>
                  <NpuSandboxPanel selectedPaperId={selectedPaperId} />
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
