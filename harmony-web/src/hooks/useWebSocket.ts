import { useState, useEffect, useCallback, useRef } from 'react';

const WS_CACHE_KEY = 'harmony_reconnect_buffer';
const WS_MAX_CACHE = 100;

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: object) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: object) => void;
  connect: () => void;
  disconnect: () => void;
}

function wsLoadCache(): object[] {
  try {
    const raw = localStorage.getItem(WS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function wsSaveCache(items: object[]): void {
  try {
    localStorage.setItem(WS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable
  }
}

function wsPushCache(data: object): void {
  const items = wsLoadCache();
  items.push(data);
  while (items.length > WS_MAX_CACHE) {
    items.shift();
  }
  wsSaveCache(items);
}

function wsDrainCache(): object[] {
  const items = wsLoadCache();
  if (items.length > 0) {
    localStorage.removeItem(WS_CACHE_KEY);
  }
  return items;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { url, onMessage, onOpen, onClose, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBufferRef = useRef<object[]>([]);

  const flushPendingBuffer = useCallback((ws: WebSocket) => {
    const cached = wsDrainCache();
    const all = [...pendingBufferRef.current, ...cached];
    for (const data of all) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }
    pendingBufferRef.current = [];
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        flushPendingBuffer(ws);
        onOpen?.();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'heartbeat_ack') return;
          onMessage?.(data);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (e) => {
        onError?.(e);
      };

      wsRef.current = ws;
    } catch {
      // connection failed
    }
  }, [url, onMessage, onOpen, onClose, onError, flushPendingBuffer]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    if (pendingBufferRef.current.length > 0) {
      wsSaveCache(pendingBufferRef.current);
      pendingBufferRef.current = [];
    }
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      pendingBufferRef.current.push(data);
      wsPushCache(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, send, connect, disconnect };
}
