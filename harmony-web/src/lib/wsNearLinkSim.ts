export type ConnectionState = 'discovered' | 'pairing' | 'connected' | 'syncing' | 'disconnected';

export interface HarmonyDevice {
  device_id: string;
  device_name: string;
  device_type: 'tablet' | 'smart_screen' | 'pc';
  connection_status: ConnectionState;
}

export interface NearLinkEvent {
  type: 'device_discovered' | 'pair_result' | 'channel_established' | 'data_received' | 'channel_closed' | 'state_changed';
  device_id: string;
  payload?: object;
}

export interface INearLinkAdapter {
  discoverDevices(): Promise<HarmonyDevice[]>;
  pairDevice(deviceId: string): Promise<boolean>;
  establishChannel(deviceId: string): Promise<boolean>;
  sendData(deviceId: string, data: object): Promise<boolean>;
  onDataReceived(callback: (data: object) => void): void;
  closeChannel(deviceId: string): Promise<void>;
  getState(deviceId: string): ConnectionState;
}

const WS_URL = 'ws://localhost:8765/harmony';
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 60000;
const MAX_RECONNECT_ATTEMPTS = 3;
const CACHE_KEY = 'harmony_reconnect_buffer';
const MAX_CACHE_SIZE = 100;

interface CachedItem {
  deviceId: string;
  data: object;
  timestamp: number;
}

function loadCache(): CachedItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCache(items: CachedItem[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

function pushToCache(deviceId: string, data: object): void {
  const items = loadCache();
  items.push({ deviceId, data, timestamp: Date.now() });
  while (items.length > MAX_CACHE_SIZE) {
    items.shift();
  }
  saveCache(items);
}

function drainCache(): CachedItem[] {
  const items = loadCache();
  if (items.length > 0) {
    localStorage.removeItem(CACHE_KEY);
  }
  return items;
}

export class WebSocketNearLinkSim implements INearLinkAdapter {
  private ws: WebSocket | null = null;
  private deviceStates: Map<string, ConnectionState> = new Map();
  private dataCallbacks: ((data: object) => void)[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private reconnectionBuffer: Array<{ deviceId: string; data: object }> = [];
  private connected = false;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushReconnectionBuffer();
          this.flushCachedBuffer();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.resetHeartbeatTimeout();
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'heartbeat_ack') return;
            if (msg.type === 'data_received' && msg.payload) {
              this.dataCallbacks.forEach(cb => cb(msg.payload));
            }
            if (msg.type === 'state_changed' && msg.device_id) {
              this.deviceStates.set(msg.device_id, msg.state as ConnectionState);
            }
          } catch {
            // ignore non-JSON messages
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.stopHeartbeat();
          this.cacheReconnectionBuffer();
          this.attemptReconnect();
        };

        this.ws.onerror = () => {
          if (!this.connected) {
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private cacheReconnectionBuffer(): void {
    for (const item of this.reconnectionBuffer) {
      pushToCache(item.deviceId, item.data);
    }
    this.reconnectionBuffer = [];
  }

  private async flushCachedBuffer(): Promise<void> {
    const cached = drainCache();
    for (const item of cached) {
      await this.sendData(item.deviceId, item.data);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, HEARTBEAT_INTERVAL);

    this.resetHeartbeatTimeout();
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
    }
    this.heartbeatTimeoutTimer = setTimeout(() => {
      if (this.ws) {
        this.ws.close();
      }
    }, HEARTBEAT_TIMEOUT);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => {
        // reconnect failed, will retry
      });
    }, this.reconnectAttempts * 2000);
  }

  private flushReconnectionBuffer(): void {
    while (this.reconnectionBuffer.length > 0) {
      const item = this.reconnectionBuffer.shift()!;
      this.sendData(item.deviceId, item.data).catch(() => {
        this.reconnectionBuffer.push(item);
        break;
      });
    }
  }

  private ensureConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private send(msg: object): void {
    if (this.ensureConnected()) {
      this.ws!.send(JSON.stringify(msg));
    }
  }

  async discoverDevices(): Promise<HarmonyDevice[]> {
    this.send({ type: 'discover' });
    const mockDevices: HarmonyDevice[] = [
      { device_id: 'harmony-tablet-001', device_name: 'MatePad Pro', device_type: 'tablet', connection_status: 'discovered' },
      { device_id: 'harmony-screen-001', device_name: '华为智慧屏 V5', device_type: 'smart_screen', connection_status: 'discovered' },
      { device_id: 'harmony-pc-001', device_name: 'MateBook X Pro', device_type: 'pc', connection_status: 'discovered' },
    ];
    mockDevices.forEach(d => this.deviceStates.set(d.device_id, d.connection_status));
    return mockDevices;
  }

  async pairDevice(deviceId: string): Promise<boolean> {
    this.deviceStates.set(deviceId, 'pairing');
    this.send({ type: 'pair', device_id: deviceId });
    this.deviceStates.set(deviceId, 'discovered');
    return true;
  }

  async establishChannel(deviceId: string): Promise<boolean> {
    this.deviceStates.set(deviceId, 'connected');
    this.send({ type: 'establish_channel', device_id: deviceId });
    return true;
  }

  async sendData(deviceId: string, data: object): Promise<boolean> {
    if (!this.ensureConnected()) {
      this.reconnectionBuffer.push({ deviceId, data });
      pushToCache(deviceId, data);
      return false;
    }
    this.deviceStates.set(deviceId, 'syncing');
    this.send({ type: 'send_data', device_id: deviceId, payload: data });
    this.deviceStates.set(deviceId, 'connected');
    return true;
  }

  onDataReceived(callback: (data: object) => void): void {
    this.dataCallbacks.push(callback);
  }

  async closeChannel(deviceId: string): Promise<void> {
    this.deviceStates.set(deviceId, 'disconnected');
    this.send({ type: 'close_channel', device_id: deviceId });
  }

  getState(deviceId: string): ConnectionState {
    return this.deviceStates.get(deviceId) ?? 'disconnected';
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.cacheReconnectionBuffer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}
