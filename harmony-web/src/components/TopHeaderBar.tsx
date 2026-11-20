import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  BookOpen,
  PanelRight,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import {
  YunmaiLogo,
  HuaweiIcon,
  ProviderIcon,
} from './icons/BrandIcons';
import { MODEL_PROVIDERS, getProviderMeta } from '../utils/providers';
import { detectProvider } from '../lib/api';
import { useModelStore } from '../stores/modelStore';
import type { DrawerType } from '../lib/types';

interface TopHeaderBarProps {
  modelProvider: string;
  onSelectProvider: (provider: string) => void;
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  isApiConfigured: boolean;
  onSaveApiKey: () => void;
  onClearApiKey: () => void;
  isOnlineMode: boolean;
  backendAvailable: boolean;
  onToggleMode: (online: boolean) => void;
  activeDrawer: DrawerType;
  onOpenDrawer: (drawer: DrawerType) => void;
  isCopilotCollapsed: boolean;
  onToggleCopilot: () => void;
  harmonySynced: boolean;
  cicdBackendUrl?: string;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  modelProvider,
  onSelectProvider,
  apiKey,
  onChangeApiKey,
  isApiConfigured,
  onSaveApiKey,
  onClearApiKey,
  isOnlineMode,
  backendAvailable,
  onToggleMode,
  activeDrawer,
  onOpenDrawer,
  isCopilotCollapsed,
  onToggleCopilot,
  harmonySynced,
  cicdBackendUrl = 'http://127.0.0.1:8000/api/cicd',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [cicdStatus, setCicdStatus] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const tokenMetrics = useModelStore((s) => s.tokenMetrics);

  const activeProviderMeta = getProviderMeta(modelProvider);

  // Poll CI/CD live status for top-bar pill
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`${cicdBackendUrl}/pipeline/status`);
        const json = await res.json();
        if (mounted && json?.data?.status) {
          setCicdStatus(json.data.status);
        }
      } catch {
        if (mounted) setCicdStatus(null);
      }
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [cicdBackendUrl]);

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!popoverOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [popoverOpen]);

  const cicdDotClass =
    cicdStatus === 'success' || cicdStatus === 'completed'
      ? 'ok'
      : cicdStatus === 'running'
        ? 'running ym-pulse'
        : cicdStatus === 'failed'
          ? 'err'
          : cicdStatus === 'queued'
            ? 'warn'
            : 'ok';

  const cicdLabel =
    cicdStatus === 'running'
      ? 'CI/CD 构建中'
      : cicdStatus === 'failed'
        ? 'CI/CD 异常'
        : cicdStatus === 'queued'
          ? 'CI/CD 排队中'
          : 'CI/CD 通过';

  const detected = detectProvider(apiKey);

  return (
    <header className="ym-topbar" role="banner">
      <div className="ym-brand">
        <YunmaiLogo size={22} />
        <span className="ym-brand-name">云脉·智慧医疗</span>
        <span className="ym-brand-pill">转化医学工作站</span>
      </div>

      <div className="ym-top-actions">
        {/* Model Switcher & API Settings Popover */}
        <div className="ym-popover-anchor" ref={popoverRef}>
          <button
            type="button"
            className={`ym-shell-btn elevated ${popoverOpen ? 'active' : ''}`}
            aria-expanded={popoverOpen}
            aria-haspopup="dialog"
            aria-label="切换大模型与 API 配置"
            onClick={() => setPopoverOpen((v) => !v)}
          >
            <ProviderIcon provider={modelProvider} size={15} />
            <span>{activeProviderMeta.shortLabel}</span>
            <ChevronDown size={13} style={{ color: 'var(--ym-text-muted)' }} />
          </button>

          {popoverOpen && (
            <div className="ym-popover" role="dialog" aria-label="模型路由与 API 配置">
              <div className="ym-popover-head">
                <div>
                  <div className="ym-popover-title">大模型路由与运行模式</div>
                  <div className="ym-popover-sub">
                    {backendAvailable ? 'FastAPI 后端已连接 (127.0.0.1:8000)' : '本地演示引擎运行中'}
                  </div>
                </div>
                <button
                  type="button"
                  className="ym-icon-btn"
                  aria-label="关闭模型配置面板"
                  onClick={() => setPopoverOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Run Mode Switch */}
              <div>
                <div className="ym-field-label">
                  <span>推理模式</span>
                  <span style={{ fontWeight: 500, color: 'var(--ym-text-muted)' }}>
                    {isOnlineMode && backendAvailable ? '云端联动' : '本地演示'}
                  </span>
                </div>
                <div className="ym-mode-segment" role="group" aria-label="选择推理模式">
                  <button
                    type="button"
                    className={`ym-mode-btn ${!isOnlineMode ? 'active' : ''}`}
                    onClick={() => onToggleMode(false)}
                  >
                    Demo 离线模式
                  </button>
                  <button
                    type="button"
                    className={`ym-mode-btn ${isOnlineMode ? 'active' : ''}`}
                    disabled={!backendAvailable}
                    onClick={() => onToggleMode(true)}
                  >
                    实时 API 模式
                  </button>
                </div>
              </div>

              {/* 5 Official Model Providers */}
              <div>
                <div className="ym-field-label">
                  <span>模型供应商</span>
                  <span style={{ fontWeight: 500, color: 'var(--ym-text-muted)' }}>
                    {activeProviderMeta.modelName}
                  </span>
                </div>
                <div className="ym-provider-grid">
                  {MODEL_PROVIDERS.map((p) => {
                    const isActive = activeProviderMeta.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`ym-provider-opt ${isActive ? 'active' : ''}`}
                        onClick={() => onSelectProvider(p.id)}
                      >
                        <ProviderIcon provider={p.id} size={15} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveApiKey();
                }}
              >
                <label className="ym-field-label" htmlFor="ym-api-key-input">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <KeyRound size={12} />
                    API Key（可选）
                  </span>
                  {isApiConfigured ? (
                    <span style={{ color: 'var(--ym-text-success)', fontWeight: 600 }}>已配置</span>
                  ) : detected ? (
                    <span style={{ color: 'var(--ym-text-accent)', fontWeight: 500 }}>{detected}</span>
                  ) : null}
                </label>
                <div className="ym-input-row">
                  <input
                    id="ym-api-key-input"
                    type={showKey ? 'text' : 'password'}
                    className="ym-input"
                    placeholder="sk-... / hw-...（留空走本地规则引擎）"
                    value={apiKey}
                    onChange={(e) => onChangeApiKey(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="ym-icon-btn"
                    style={{ height: 34, width: 34, border: '1px solid var(--ym-border-strong)' }}
                    aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="submit"
                    className="ym-btn-primary ym-btn-sm"
                    style={{ height: 34, flex: 'none' }}
                    aria-label="保存 API Key"
                  >
                    <Check size={14} />
                  </button>
                </div>
                {isApiConfigured && (
                  <button
                    type="button"
                    style={{
                      marginTop: 6,
                      fontSize: 11.5,
                      color: 'var(--ym-text-danger)',
                      fontWeight: 500,
                    }}
                    onClick={onClearApiKey}
                  >
                    清除已保存的 API Key
                  </button>
                )}
              </form>

              {tokenMetrics && (
                <div className="ym-token-strip" aria-label="最近一次推理指标">
                  <span>
                    Tokens: {tokenMetrics.input_tokens}↑ / {tokenMetrics.output_tokens}↓
                  </span>
                  <span>{tokenMetrics.latency_ms} ms</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CI/CD Status Trigger */}
        <button
          type="button"
          className={`ym-shell-btn ${activeDrawer === 'cicd' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'cicd' ? null : 'cicd')}
          aria-label="打开 CI/CD 构建与质量报告抽屉"
        >
          <span className={`ym-status-dot ${cicdDotClass}`} />
          <span className="ym-hide-sm">{cicdLabel}</span>
        </button>

        {/* Knowledge Base Trigger */}
        <button
          type="button"
          className={`ym-shell-btn ${activeDrawer === 'knowledge' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'knowledge' ? null : 'knowledge')}
          aria-label="打开 RAG 知识库管理抽屉"
        >
          <BookOpen size={14} />
          <span className="ym-hide-sm">知识库</span>
        </button>

        {/* HarmonyOS Synergy Trigger */}
        <button
          type="button"
          className={`ym-shell-btn ${activeDrawer === 'harmony' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'harmony' ? null : 'harmony')}
          aria-label="打开鸿蒙端云协同与 NPU 脱敏沙箱"
        >
          <HuaweiIcon size={15} />
          <span className="ym-hide-sm">鸿蒙协同</span>
          {harmonySynced && <span className="ym-status-dot ok" title="已星闪推流" />}
        </button>

        {/* Copilot Expand / Tablet Drawer Trigger */}
        {isCopilotCollapsed && (
          <button
            type="button"
            className="ym-shell-btn elevated"
            onClick={onToggleCopilot}
            aria-label="展开右侧医算子协同面板"
          >
            <PanelRight size={14} />
            <span className="ym-hide-sm">医算子</span>
          </button>
        )}

        {!isCopilotCollapsed && (
          <button
            type="button"
            className={`ym-shell-btn elevated ym-mobile-only-btn ${activeDrawer === 'copilot' ? 'active' : ''}`}
            onClick={() => onOpenDrawer(activeDrawer === 'copilot' ? null : 'copilot')}
            aria-label="打开医算子 AI 转化顾问"
          >
            <PanelRight size={14} />
            <span>医算子</span>
          </button>
        )}
      </div>
    </header>
  );
};
