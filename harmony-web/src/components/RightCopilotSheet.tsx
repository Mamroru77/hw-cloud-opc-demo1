import React, { useEffect, useRef, useState } from 'react';
import { PanelRightClose, ChevronDown, ChevronUp, ArrowUp, Loader2 } from 'lucide-react';
import { ProviderIcon } from './icons/BrandIcons';
import { MODEL_PROVIDERS, getProviderMeta } from '../utils/providers';
import type { ChatMessage } from '../lib/types';

interface RightCopilotSheetProps {
  messages: ChatMessage[];
  chatInput: string;
  onChangeInput: (val: string) => void;
  onSendMessage: (text: string) => void;
  isSending: boolean;
  domain: string;
  modelProvider: string;
  onSelectProvider: (provider: string) => void;
  systemPrompt: string;
  onChangeSystemPrompt: (prompt: string) => void;
  onResetSystemPrompt: () => void;
  onCollapse?: () => void;
  embedded?: boolean;
}

function getSuggestionChips(domain: string): string[] {
  if (domain === 'drugs') {
    return ['靶点改为 EGFR', '融资调至 3000 万', '基地改北京协和'];
  }
  if (domain === 'ai') {
    return ['准确率提升至 95%', '延迟降至 12ms', '改为放射科'];
  }
  if (domain === 'surgical') {
    return ['学习曲线改为 15 例', '部位改肝脏切除区', '融资调至 1500 万'];
  }
  return ['改为脑外科', '激发波长改为 800nm', '融资调至 3000 万'];
}

function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ color: 'var(--ym-text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          style={{
            fontFamily: 'var(--ym-font-mono)',
            fontSize: '11.5px',
            background: 'var(--ym-bg-tint)',
            padding: '1px 5px',
            borderRadius: 4,
            color: 'var(--ym-text-primary)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const RightCopilotSheet: React.FC<RightCopilotSheetProps> = ({
  messages,
  chatInput,
  onChangeInput,
  onSendMessage,
  isSending,
  domain,
  modelProvider,
  onSelectProvider,
  systemPrompt,
  onChangeSystemPrompt,
  onResetSystemPrompt,
  onCollapse,
  embedded = true,
}) => {
  const [promptOpen, setPromptOpen] = useState(false);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const activeMeta = getProviderMeta(modelProvider);
  const chips = getSuggestionChips(domain);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    onSendMessage(chatInput);
  };

  return (
    <aside
      className={`ym-copilot-sheet ${embedded ? 'desktop-embedded' : ''}`}
      style={!embedded ? { height: '100%', boxShadow: 'none', borderRadius: 0 } : undefined}
      aria-label="医算子 AI 临床转化顾问"
    >
      {/* Header */}
      {embedded && (
        <div className="ym-cp-head">
          <div className="ym-cp-title-wrap">
            <span className="ym-cp-title">医算子</span>
            <span className="ym-cp-sub">临床转化顾问</span>
          </div>
          {onCollapse && (
            <button
              type="button"
              className="ym-icon-btn"
              onClick={onCollapse}
              aria-label="收起医算子面板"
              title="收起面板"
            >
              <PanelRightClose size={15} />
            </button>
          )}
        </div>
      )}

      {/* Official 5-Provider Quick Router Bar */}
      <div className="ym-provider-bar" role="group" aria-label="快捷切换大模型底座">
        <span className="ym-pb-label">模型路由</span>
        <div className="ym-pb-icons">
          {MODEL_PROVIDERS.map((provider) => {
            const isActive = activeMeta.id === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                className={`ym-pb-btn ${isActive ? 'active' : ''}`}
                title={`切换至 ${provider.label} (${provider.modelName})`}
                aria-label={`切换至 ${provider.label}`}
                aria-pressed={isActive}
                onClick={() => onSelectProvider(provider.id)}
              >
                <ProviderIcon provider={provider.id} size={14} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible System Prompt */}
      <div className="ym-cp-prompt-bar">
        <button
          type="button"
          className="ym-cp-prompt-toggle"
          aria-expanded={promptOpen}
          onClick={() => setPromptOpen((v) => !v)}
        >
          <span>System Prompt 提示词</span>
          {promptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {promptOpen && (
          <div className="ym-cp-prompt-body">
            <textarea
              className="ym-prompt-textarea"
              value={systemPrompt}
              onChange={(e) => onChangeSystemPrompt(e.target.value)}
              aria-label="编辑 System Prompt"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ym-btn-secondary ym-btn-sm"
                onClick={onResetSystemPrompt}
              >
                恢复默认提示词
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Architectural Non-Bubble Stream */}
      <div className="ym-cp-stream" role="log" aria-live="polite">
        {messages.map((msg, index) => {
          if (msg.sender === 'user') {
            return (
              <div key={index} className="ym-user-cmd">
                {msg.text}
              </div>
            );
          }

          const msgProvider = msg.provider || modelProvider;
          const msgMeta = getProviderMeta(msgProvider);

          return (
            <div key={index} className="ym-ai-row">
              <div className="ym-ai-hd">
                <ProviderIcon provider={msgProvider} size={15} />
                <span>{msgMeta.label} · 医算子</span>
                <span className="ym-ai-time">
                  {msg.diffs && msg.diffs.length > 0 ? '已同步' : msg.timestamp || '就绪'}
                </span>
              </div>
              <div className="ym-ai-txt">{renderBoldText(msg.text)}</div>
              {msg.diffs && msg.diffs.length > 0 && (
                <div className="ym-diff-card" aria-label="参数变更回执">
                  {msg.diffs.map((d, dIdx) => (
                    <div key={dIdx} className="ym-diff-row">
                      <span className="ym-diff-k">{d.label}</span>
                      <span className="ym-diff-v">
                        {d.before} → <b>{d.after}</b>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="ym-ai-row">
            <div className="ym-ai-hd">
              <ProviderIcon provider={modelProvider} size={15} />
              <span>{activeMeta.label} · 医算子</span>
              <span className="ym-ai-time">思考中</span>
            </div>
            <div
              className="ym-ai-txt"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ym-text-muted)' }}
            >
              <Loader2 size={13} className="ym-spin" />
              <span>正在联动三智能体校准参数与文档...</span>
            </div>
          </div>
        )}

        <div ref={streamEndRef} />
      </div>

      {/* Quick Chips + Composer */}
      <div className="ym-cp-foot">
        <div className="ym-chips" aria-label="快捷微调指令">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="ym-chip"
              disabled={isSending}
              onClick={() => onSendMessage(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <form className="ym-composer" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="输入微调指令，如：融资调至 3000 万..."
            value={chatInput}
            onChange={(e) => onChangeInput(e.target.value)}
            aria-label="向医算子发送微调指令"
            disabled={isSending}
          />
          <button
            type="submit"
            className="ym-send-btn"
            disabled={isSending || !chatInput.trim()}
            aria-label="发送微调指令"
          >
            {isSending ? <Loader2 size={14} className="ym-spin" /> : <ArrowUp size={15} />}
          </button>
        </form>
      </div>
    </aside>
  );
};
