import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Smartphone, Cpu, Wifi, WifiOff } from 'lucide-react';
import { AppParams, RAGReference, PresetPaper, CustomPaper } from '../lib/types';
import { PRESET_PAPERS } from '../lib/constants';
import { WebSocketNearLinkSim, HarmonyDevice, ConnectionState } from '../lib/wsNearLinkSim';
import { npuSanitize, SanitizeResult } from '../lib/npuSanitizer';
import { useHarmonyStore } from '../stores/harmonyStore';
import NpuSandboxPanel from './NpuSandboxPanel';
import HarmonyWidget from './HarmonyWidget';

interface HarmonyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaperId: string;
  customPapers: CustomPaper[];
  state: AppParams;
  ragReferences: RAGReference[];
  harmonySynced: boolean;
  isSyncingHarmony: boolean;
  onSyncHarmony: () => void;
  onDisconnectHarmony: () => void;
}

const nearLinkSim = new WebSocketNearLinkSim();

type ConnectionPhase = 'idle' | 'discovering' | 'pairing' | 'establishing' | 'syncing' | 'completed';

function HarmonyDrawer({
  isOpen,
  onClose,
  selectedPaperId,
  customPapers,
  state,
  ragReferences,
  harmonySynced,
  isSyncingHarmony,
  onSyncHarmony,
  onDisconnectHarmony
}: HarmonyDrawerProps) {
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('idle');
  const [selectedDevice, setSelectedDevice] = useState<HarmonyDevice | null>(null);
  const [phaseLogs, setPhaseLogs] = useState<string[]>([]);
  const [sanitizeResult, setSanitizeResult] = useState<SanitizeResult | null>(null);

  const harmonyStore = useHarmonyStore();

  const addLog = useCallback((msg: string) => {
    setPhaseLogs(prev => [...prev, msg]);
  }, []);

  const handleStarLinkSync = useCallback(async () => {
    setConnectionPhase('discovering');
    setPhaseLogs([]);
    addLog('[1/3] 星闪设备发现中...');

    try {
      const devices = await nearLinkSim.discoverDevices();
      harmonyStore.setDevices(devices);
      addLog(`发现 ${devices.length} 台鸿蒙设备`);

      const targetDevice = devices[0];
      setSelectedDevice(targetDevice);

      setConnectionPhase('pairing');
      addLog(`[2/3] 正在配对设备: ${targetDevice.device_name}...`);
      await new Promise(r => setTimeout(r, 800));
      const paired = await nearLinkSim.pairDevice(targetDevice.device_id);
      if (!paired) {
        addLog('配对失败');
        setConnectionPhase('idle');
        return;
      }
      addLog(`设备配对成功: ${targetDevice.device_name}`);

      setConnectionPhase('establishing');
      addLog('[3/3] 建立星闪通道...');
      await new Promise(r => setTimeout(r, 600));
      const channelOk = await nearLinkSim.establishChannel(targetDevice.device_id);
      if (!channelOk) {
        addLog('通道建立失败');
        setConnectionPhase('idle');
        return;
      }
      addLog('星闪通道已建立');

      setConnectionPhase('syncing');
      addLog('执行NPU脱敏后推流数据...');

      const dataToSanitize = JSON.stringify({
        domain: state.domain,
        target_department: state.target_department,
        paper_title: selectedPaperId.endsWith('-default')
          ? PRESET_PAPERS.find(p => p.id === selectedPaperId)?.title
          : customPapers.find(p => p.id === selectedPaperId)?.title,
        rag_count: ragReferences.length,
      });

      const result = npuSanitize(dataToSanitize);
      setSanitizeResult(result);
      harmonyStore.setSanitizeResult(result);
      addLog(`脱敏完成: ${result.fields_sanitized} 字段已替换`);

      await nearLinkSim.sendData(targetDevice.device_id, { sanitized: result.sanitized });
      addLog('数据已推流至 ' + targetDevice.device_name);

      setConnectionPhase('completed');
      harmonyStore.setConnectionState('connected');
      harmonyStore.setLastSyncTime(Date.now());
      onSyncHarmony();
    } catch (e) {
      addLog('连接异常: ' + (e instanceof Error ? e.message : String(e)));
      setConnectionPhase('idle');
    }
  }, [state, selectedPaperId, customPapers, ragReferences, addLog, onSyncHarmony, harmonyStore]);

  const handleDisconnect = useCallback(async () => {
    if (selectedDevice) {
      await nearLinkSim.closeChannel(selectedDevice.device_id);
    }
    nearLinkSim.disconnect();
    setConnectionPhase('idle');
    setSelectedDevice(null);
    setPhaseLogs([]);
    setSanitizeResult(null);
    harmonyStore.reset();
    onDisconnectHarmony();
  }, [selectedDevice, onDisconnectHarmony, harmonyStore]);

  useEffect(() => {
    return () => {
      nearLinkSim.disconnect();
    };
  }, []);

  if (!isOpen) return null;

  const isConnecting = connectionPhase === 'discovering' || connectionPhase === 'pairing' || connectionPhase === 'establishing' || connectionPhase === 'syncing';

  return (
    <>
      <motion.div
        className="harmony-drawer-backdrop hmos-drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        onClick={onClose}
      />
      <motion.div
        className="harmony-drawer hmos-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      >
        <div className="harmony-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Share2 size={20} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>鸿蒙端云双向协同</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Distributed StarLink & NPU Sandbox</p>
            </div>
          </div>
          <button className="harmony-drawer-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="harmony-drawer-body">
          {/* 1. NearLink Connection Status */}
          <div className="harmony-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="harmony-card-tag">星闪分布式总线</span>
              <span className={`harmony-status-dot ${connectionPhase === 'completed' ? 'synced' : 'disconnected'}`}>
                {connectionPhase === 'completed' ? '已绑定投屏' : 'NearLink 就绪'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              {connectionPhase === 'completed' ? (
                <Wifi size={12} style={{ color: 'var(--accent-cyan)' }} />
              ) : (
                <WifiOff size={12} style={{ color: 'var(--text-muted)' }} />
              )}
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                当前为WebSocket模拟星闪通信
              </span>
            </div>

            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              ArkUI 智能分布式元服务卡片
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              一键将当前提取的论文关键指标及可视化 PK/ROC 曲线，实时推流并渲染至附近 HarmonyOS 设备（平板、智慧屏或 PC 端侧服务中心）。
            </p>

            {/* Distributed Card Mockup */}
            <div className="harmony-widget-preview">
              <div className="harmony-widget-header">
                <span className="widget-logo">云脉 ArkUI</span>
                <span className="widget-device">{selectedDevice?.device_name || 'MatePad Pro'}</span>
              </div>
              <div className="harmony-widget-body">
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedPaperId.endsWith('-default') ? PRESET_PAPERS.find(p => p.id === selectedPaperId)?.title : customPapers.find(p => p.id === selectedPaperId)?.title || "学术文献"}
                </div>
                <div className="widget-grid">
                  <div className="widget-cell">
                    <span className="cell-label">细分领域</span>
                    <span className="cell-val">
                      {state.domain === 'drugs' ? '创新药物' :
                       state.domain === 'ai' ? '医疗 SaMD' :
                       state.domain === 'surgical' ? '改良术式' : '荧光探针'}
                    </span>
                  </div>
                  <div className="widget-cell">
                    <span className="cell-label">目标科室</span>
                    <span className="cell-val">{state.target_department || '全科室'}</span>
                  </div>
                  <div className="widget-cell">
                    <span className="cell-label">
                      {state.domain === 'drugs' ? '消除半衰期' :
                       state.domain === 'ai' ? '模型精度' :
                       state.domain === 'surgical' ? '学习曲线' : '排泄半衰期'}
                    </span>
                    <span className="cell-val">
                      {state.domain === 'drugs' ? `${state.drug_half_life || 12.0}h` :
                       state.domain === 'ai' ? `${state.accuracy || 92.4}%` :
                       state.domain === 'surgical' ? `${state.learning_curve_cases || 25}例` : `${state.half_life || 2.4}h`}
                    </span>
                  </div>
                  <div className="widget-cell">
                    <span className="cell-label">校准凭据数</span>
                    <span className="cell-val">{ragReferences.length} 条</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HarmonyWidget - 毛玻璃服务卡片预览 */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                鸿蒙服务卡片实时预览
              </div>
              <HarmonyWidget
                paperTitle={selectedPaperId.endsWith('-default') ? PRESET_PAPERS.find(p => p.id === selectedPaperId)?.title || '' : customPapers.find(p => p.id === selectedPaperId)?.title || ''}
                paramCount={state.domain === 'drugs' ? 6 : state.domain === 'ai' ? 6 : state.domain === 'surgical' ? 6 : 6}
                ragScore={ragReferences.length > 0 ? Math.min(95, 60 + ragReferences.length * 10) : 0}
                syncStatus={connectionPhase === 'completed' ? 'synced' : connectionPhase === 'syncing' || isConnecting ? 'syncing' : 'offline'}
                domain={state.domain}
                targetDepartment={state.target_department}
              />
            </div>

            {/* Connection Phase Logs */}
            {phaseLogs.length > 0 && (
              <div className="npu-console-logs" style={{ marginTop: '12px', height: 'auto', maxHeight: '100px' }}>
                {phaseLogs.map((log, i) => (
                  <div key={i} className="npu-log-line">{log}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className={`harmony-btn primary ${isConnecting ? 'loading' : ''}`}
                disabled={isConnecting}
                onClick={handleStarLinkSync}
                style={{ flex: 1 }}
              >
                {isConnecting
                  ? `星闪总线同步中(${connectionPhase === 'discovering' ? '发现' : connectionPhase === 'pairing' ? '配对' : connectionPhase === 'establishing' ? '建连' : '推流'}...)`
                  : connectionPhase === 'completed'
                    ? '更新多端推流'
                    : '星闪一键推流'}
              </button>
              {connectionPhase === 'completed' && (
                <button
                  className="harmony-btn secondary"
                  onClick={handleDisconnect}
                  style={{ cursor: 'pointer' }}
                >
                  断开协同
                </button>
              )}
            </div>
          </div>

          {/* 2. End-side NPU sandbox Anonymizer */}
          <div style={{ background: 'rgba(241, 243, 245, 0.5)', borderRadius: '24px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="harmony-card-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
                ArkCompiler NPU 沙箱
              </span>
              <span className="npu-status-badge">
                <Cpu size={10} style={{ marginRight: '4px' }} />
                NPU 隐私保护
              </span>
            </div>

            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              本地端侧 3B 大模型隐私脱敏
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              调用设备端侧麒麟处理器内置的 NPU 神经处理单元，在本地对上传的 PDF/MD 临床数据及患者病例进行本地脱敏（替换受试者 ID、过滤隐私及医院铭牌），保证核心资产不出沙箱。
            </p>

            <NpuSandboxPanel
              selectedPaperId={selectedPaperId}
              onSanitizeComplete={(result) => {
                setSanitizeResult(result);
                harmonyStore.setSanitizeResult(result);
              }}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default HarmonyDrawer;
