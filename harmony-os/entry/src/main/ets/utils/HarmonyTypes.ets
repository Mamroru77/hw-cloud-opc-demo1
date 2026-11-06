// 鸿蒙端云双向协同 — 类型定义
// 移植自 harmony-web/src/lib/wsNearLinkSim.ts + src/lib/npuSanitizer.ts

// -------- 连接状态 --------
export type ConnectionState = 'discovered' | 'pairing' | 'connected' | 'syncing' | 'disconnected';
export type ConnectionPhase = 'idle' | 'discovering' | 'pairing' | 'establishing' | 'sanitizing' | 'pushing' | 'completed';
export type SyncStatus = 'synced' | 'offline' | 'syncing';

// -------- 鸿蒙设备 --------
export interface HarmonyDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'tablet' | 'smart_screen' | 'pc';
  connectionStatus: ConnectionState;
}

export const MOCK_HARMONY_DEVICES: HarmonyDevice[] = [
  {
    deviceId: 'harmony-tablet-001',
    deviceName: 'MatePad Pro',
    deviceType: 'tablet',
    connectionStatus: 'discovered'
  },
  {
    deviceId: 'harmony-screen-001',
    deviceName: '华为智慧屏 V5',
    deviceType: 'smart_screen',
    connectionStatus: 'discovered'
  },
  {
    deviceId: 'harmony-pc-001',
    deviceName: 'MateBook X Pro',
    deviceType: 'pc',
    connectionStatus: 'discovered'
  }
];

// -------- NPU 隐私脱敏 --------
export interface SanitizeRule {
  name: string;
  pattern: string; // 存储为字符串，运行时构建 RegExp
  replacement: string;
}

export interface SanitizeResult {
  original: string;
  sanitized: string;
  fieldsSanitized: number;
  rulesApplied: string[];
  isSafeForTransmission: boolean;
}

// -------- WebSocket 消息 --------
export interface HarmonyWsMessage {
  type: string;
  deviceId?: string;
  payload?: Record<string, Object>;
  state?: ConnectionState;
  devices?: HarmonyDevice[];
  success?: boolean;
  timestamp?: number;
}

// -------- 星闪事件 --------
export interface NearLinkEvent {
  type: 'device_discovered' | 'pair_result' | 'channel_established' | 'data_received' | 'channel_closed' | 'state_changed';
  deviceId: string;
  payload?: Record<string, Object>;
}
