import { webSocket } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { HarmonyWsMessage } from './HarmonyTypes';

// WebSocket配置接口
export interface WsConfig {
  baseUrl?: string;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
  reconnectDelays?: number[];
}

// WebSocket状态枚举
enum WsState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

export class WsUtil {
  private static BASE_URL: string = '';
  private static API_KEY: string = '';
  private static HEARTBEAT_INTERVAL: number = 30000; // 30秒心跳间隔
  private static MAX_RECONNECT_ATTEMPTS: number = 5;
  private static RECONNECT_DELAYS: number[] = [1000, 2000, 4000, 8000, 16000];

  private ws: webSocket.WebSocket | null = null;
  private state: WsState = WsState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: number = 0;
  private onMessageCallback?: (data: string) => void;
  private onErrorCallback?: (err: BusinessError) => void;
  private onStateChangeCallback?: (state: string) => void;
  private onHarmonyMessageCallback?: (msg: HarmonyWsMessage) => void;
  private messageQueue: string[] = []; // 未连接时的消息队列

  // 配置方法
  static configure(config: WsConfig): void {
    if (config.baseUrl) {
      WsUtil.BASE_URL = config.baseUrl;
    }
    if (config.heartbeatInterval) {
      WsUtil.HEARTBEAT_INTERVAL = config.heartbeatInterval;
    }
    if (config.maxReconnectAttempts) {
      WsUtil.MAX_RECONNECT_ATTEMPTS = config.maxReconnectAttempts;
    }
    if (config.reconnectDelays) {
      WsUtil.RECONNECT_DELAYS = config.reconnectDelays;
    }
  }

  static setApiKey(key: string): void {
    WsUtil.API_KEY = key;
  }

  // 获取当前状态
  getState(): string {
    return this.state;
  }

  // 设置状态变化回调
  onStateChange(callback: (state: string) => void): void {
    this.onStateChangeCallback = callback;
  }

  // 更新状态并通知
  private updateState(newState: WsState): void {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  connect(
    onMessage: (data: string) => void,
    onError: (err: BusinessError) => void,
    onHarmonyMessage?: (msg: HarmonyWsMessage) => void
  ): void {
    this.onMessageCallback = onMessage;
    this.onErrorCallback = onError;
    this.onHarmonyMessageCallback = onHarmonyMessage;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.state === WsState.CONNECTING || this.state === WsState.CONNECTED) {
      return;
    }

    this.updateState(WsState.CONNECTING);
    this.ws = webSocket.createWebSocket();

    this.ws.on('open', () => {
      console.info('WebSocket connected');
      this.updateState(WsState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue(); // 发送队列中的消息
    });

    this.ws.on('message', (err: BusinessError, value: string | ArrayBuffer) => {
      if (err) {
        return;
      }
      const message: string = typeof value === 'string' ? value : '';
      if (!message) {
        return;
      }
      // Try to parse as JSON — harmony messages are JSON, chat messages are also JSON
      try {
        const msg: HarmonyWsMessage = JSON.parse(message) as HarmonyWsMessage;
        // Skip heartbeat acknowledgements
        if (msg.type === 'heartbeat_ack') {
          return;
        }
        // Route harmony-specific messages
        const harmonyTypes: string[] = [
          'device_discovered', 'pair_result', 'channel_established',
          'data_received', 'channel_closed', 'state_changed',
          'data_sent', 'discover', 'pair', 'establish_channel',
          'send_data', 'close_channel'
        ];
        if (harmonyTypes.includes(msg.type) && this.onHarmonyMessageCallback) {
          this.onHarmonyMessageCallback(msg);
          return;
        }
      } catch (_) {
        // Not JSON — ignore (old ping/pong style)
      }
      // Pass through to chat message callback for non-harmony messages
      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    });

    this.ws.on('error', (err: BusinessError) => {
      console.error('WebSocket error:', JSON.stringify(err));
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
      this.handleDisconnect();
    });

    this.ws.on('close', () => {
      console.info('WebSocket closed');
      this.handleDisconnect();
    });

    let wsUrl = WsUtil.BASE_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      + '/api/harmony/ws';
    if (WsUtil.API_KEY) {
      wsUrl += (wsUrl.includes('?') ? '&' : '?') + 'token=' + WsUtil.API_KEY;
    }
    this.ws.connect(wsUrl, (err: BusinessError) => {
      if (err) {
        console.error('WebSocket connect error:', JSON.stringify(err));
        this.handleDisconnect();
      }
    });
  }

  // 处理断开连接
  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.updateState(WsState.DISCONNECTED);
    this.scheduleReconnect();
  }

  // 开始心跳（JSON 格式，匹配后端 harmony.py 协议）
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.state === WsState.CONNECTED) {
        const heartbeatMsg: string = JSON.stringify({ type: 'heartbeat', timestamp: Date.now() });
        this.ws.send(heartbeatMsg, (err: BusinessError) => {
          if (err) {
            console.error('Heartbeat failed:', JSON.stringify(err));
            this.handleDisconnect();
          }
        });
      }
    }, WsUtil.HEARTBEAT_INTERVAL);
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = 0;
    }
  }

  // 安排重连
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WsUtil.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = WsUtil.RECONNECT_DELAYS[this.reconnectAttempts] || 
                  WsUtil.RECONNECT_DELAYS[WsUtil.RECONNECT_DELAYS.length - 1];
    this.reconnectAttempts++;
    
    this.updateState(WsState.RECONNECTING);
    console.info(`Reconnecting attempt ${this.reconnectAttempts} in ${delay}ms...`);

    setTimeout(() => {
      if (this.onMessageCallback && this.onErrorCallback) {
        this.createConnection();
      }
    }, delay);
  }

  // 发送消息
  send(data: string): void {
    if (this.ws && this.state === WsState.CONNECTED) {
      this.ws.send(data, (err: BusinessError) => {
        if (err) {
          console.error('WebSocket send error:', JSON.stringify(err));
          // 发送失败，加入队列等待重连
          this.messageQueue.push(data);
        }
      });
    } else {
      // 未连接，加入队列
      this.messageQueue.push(data);
      console.warn('WebSocket not connected, message queued');
    }
  }

  // 发送队列中的消息
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === WsState.CONNECTED) {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        this.ws.send(message, (err: BusinessError) => {
          if (err) {
            console.error('Failed to send queued message:', JSON.stringify(err));
          }
        });
      }
    }
  }

  // 发送 JSON 消息（用于鸿蒙协同操作）
  sendJson(data: object): void {
    this.send(JSON.stringify(data));
  }

  // 关闭连接
  close(): void {
    this.stopHeartbeat();
    this.messageQueue = []; // 清空消息队列
    this.reconnectAttempts = WsUtil.MAX_RECONNECT_ATTEMPTS; // 阻止重连
    
    if (this.ws) {
      this.ws.close((err: BusinessError) => {
        if (err) {
          console.error('WebSocket close error:', JSON.stringify(err));
        }
        this.updateState(WsState.DISCONNECTED);
      });
    }
  }

  // 手动重连
  reconnect(): void {
    this.close();
    this.reconnectAttempts = 0;
    if (this.onMessageCallback && this.onErrorCallback) {
      this.createConnection();
    }
  }
}
