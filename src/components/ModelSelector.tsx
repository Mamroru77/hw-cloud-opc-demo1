import React from 'react';
import { Sparkles, AlertCircle, Cpu, Timer } from 'lucide-react';
import { detectProvider } from '../lib/api';
import { TokenMetrics } from '../hooks/useModelRouter';

interface ModelSelectorProps {
  apiKey: string;
  isApiConfigured: boolean;
  isOnlineMode: boolean;
  backendAvailable: boolean;
  modelProvider: string;
  tokenMetrics?: TokenMetrics | null;
  onApiKeyChange: (key: string) => void;
  onProviderChange: (provider: string) => void;
}

function ModelSelector({
  apiKey,
  isApiConfigured,
  isOnlineMode,
  backendAvailable,
  modelProvider,
  tokenMetrics,
  onApiKeyChange,
  onProviderChange
}: ModelSelectorProps) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <input
        type="password"
        placeholder={isOnlineMode ? "请输入 API Key" : "请输入 API Key 联调"}
        className="chat-input"
        style={{ fontSize: '11px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.45)', width: '100%' }}
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>模型提供商 (检测与选择):</span>
        <select
          className="chat-input"
          value={modelProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          style={{
            fontSize: '11px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.7)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none',
            width: '100%'
          }}
        >
          <option value="DeepSeek">DeepSeek (推荐)</option>
          <option value="OpenAI">OpenAI</option>
          <option value="Huawei Pangu">华为云盘古 (Huawei Pangu)</option>
          <option value="OpenRouter">OpenRouter</option>
          <option value="Google Gemini">Google Gemini</option>
        </select>
      </div>
      {apiKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 600, paddingLeft: '4px', marginTop: '2px' }}>
          <Sparkles size={10} />
          <span>当前检测提供商: {detectProvider(apiKey)}</span>
        </div>
      )}
      {isOnlineMode && !apiKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-red)', fontWeight: 600, paddingLeft: '4px' }}>
          <AlertCircle size={10} />
          <span>注意: 在大模型模式下必须配置 API Key 才能调用真实的后端接口</span>
        </div>
      )}
      {isOnlineMode && apiKey && !backendAvailable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-yellow)', fontWeight: 600, paddingLeft: '4px' }}>
          <AlertCircle size={10} />
          <span>后端服务未运行，将自动降级为 Mock 交互</span>
        </div>
      )}
      {tokenMetrics && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '8px 10px',
          borderRadius: '10px',
          background: 'rgba(139, 92, 246, 0.06)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          marginTop: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#8b5cf6', fontWeight: 700 }}>
            <Cpu size={10} />
            <span>Token消耗: 输入{tokenMetrics.input_tokens} / 输出{tokenMetrics.output_tokens}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#3b82f6', fontWeight: 700 }}>
            <Timer size={10} />
            <span>推理延迟: {tokenMetrics.latency_ms}ms</span>
          </div>
          {tokenMetrics.model_name && (
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              模型: {tokenMetrics.model_name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
