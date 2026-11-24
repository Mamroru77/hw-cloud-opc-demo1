import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { npuSanitize, type SanitizeResult } from '../lib/npuSanitizer';
import { sanitizeTextViaBackend } from '../lib/api';

interface NpuSandboxPanelProps {
  selectedPaperId: string;
  sampleText?: string;
  onSanitizeComplete?: (result: SanitizeResult) => void;
}

const DEFAULT_SAMPLE_TEXT =
  '患者ID P12345678，就诊于北京协和医院，主治医师 张伟，联系电话13912345678，身份证号11010119900307891X，患者：李明，确诊为非小细胞肺癌III期。';

function NpuSandboxPanel({ selectedPaperId, sampleText, onSanitizeComplete }: NpuSandboxPanelProps) {
  const [inputText, setInputText] = useState<string>(sampleText || DEFAULT_SAMPLE_TEXT);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [engineSource, setEngineSource] = useState<'backend' | 'local'>('backend');
  const [logs, setLogs] = useState<string[]>([]);
  const [sanitizeResult, setSanitizeResult] = useState<SanitizeResult | null>(null);

  useEffect(() => {
    setInputText(sampleText && sampleText.trim() ? sampleText.slice(0, 1200) : DEFAULT_SAMPLE_TEXT);
    setStatus('idle');
    setLogs([]);
    setSanitizeResult(null);
  }, [selectedPaperId, sampleText]);

  const runSandbox = useCallback(async () => {
    const textToSanitize = inputText.trim() || DEFAULT_SAMPLE_TEXT;
    setStatus('running');
    setLogs(['[1/3] 正在提交临床文本至后端脱敏引擎 (/api/harmony/sanitize)...']);
    setSanitizeResult(null);

    const startTime = performance.now();
    const backendResult = await sanitizeTextViaBackend(textToSanitize);
    const elapsedMs = Math.max(1, Math.round(performance.now() - startTime));

    let finalResult: SanitizeResult;
    let source: 'backend' | 'local';
    if (backendResult) {
      finalResult = backendResult;
      source = 'backend';
    } else {
      finalResult = npuSanitize(textToSanitize);
      source = 'local';
    }

    setEngineSource(source);
    setSanitizeResult(finalResult);
    onSanitizeComplete?.(finalResult);

    const nextLogs = [
      source === 'backend'
        ? `[1/3] 已连接 FastAPI 脱敏引擎 (/api/harmony/sanitize)，耗时 ${elapsedMs} ms`
        : '[1/3] 后端未在线，已降级为前端本地脱敏规则引擎',
      `[2/3] 扫描字符数: ${textToSanitize.length}，命中敏感字段: ${finalResult.fields_sanitized}`,
      finalResult.fields_sanitized > 0
        ? `[3/3] 命中规则: ${finalResult.rules_applied.join(', ')} · 传输安全校验: ${finalResult.is_safe_for_transmission ? '通过' : '未通过'}`
        : '[3/3] 未检测到敏感隐私字段，可直接安全上云',
    ];
    setLogs(nextLogs);
    setStatus('completed');
  }, [inputText, onSanitizeComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ym-text-muted)' }}>
          待脱敏临床/文献文本（可粘贴真实病例或直接编辑）
        </span>
        <textarea
          className="ym-input"
          rows={3}
          style={{
            background: 'var(--ym-bg-sheet)',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            padding: '8px 10px',
            height: 'auto',
          }}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="ym-btn-secondary"
        style={{ width: '100%' }}
        disabled={status === 'running'}
        onClick={runSandbox}
      >
        {status === 'running' ? (
          <>
            <Loader2 size={14} className="ym-spin" />
            <span>正在执行脱敏校验...</span>
          </>
        ) : (
          <span>{status === 'completed' ? '重新执行隐私脱敏' : '执行隐私脱敏校验'}</span>
        )}
      </button>

      {status === 'completed' && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 10,
              background: 'var(--ym-bg-success-soft)',
              color: 'var(--ym-text-success)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} />
            <span>
              {engineSource === 'backend' ? '后端引擎脱敏通过' : '本地兜底脱敏通过'} · 替换 {sanitizeResult?.fields_sanitized ?? 0} 处敏感字段
            </span>
          </div>

          {sanitizeResult && (
            <div className="ym-npu-compare">
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ym-text-muted)' }}>脱敏后安全文本</div>
              <div className="ym-npu-compare-box sanitized">{sanitizeResult.sanitized}</div>
            </div>
          )}

          <div className="ym-npu-console">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default NpuSandboxPanel;
