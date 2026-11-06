import asyncio
import json
import time
from typing import Dict, Set
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections[client_id] = websocket

    async def disconnect(self, client_id: str):
        async with self._lock:
            if client_id in self.active_connections:
                del self.active_connections[client_id]

    async def send_to(self, client_id: str, message: dict):
        async with self._lock:
            ws = self.active_connections.get(client_id)
            if ws:
                await ws.send_json(message)

    async def broadcast(self, message: dict, exclude: Set[str] | None = None):
        exclude = exclude or set()
        async with self._lock:
            for client_id, ws in self.active_connections.items():
                if client_id not in exclude:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        pass

    def get_connection_count(self) -> int:
        return len(self.active_connections)


ws_manager = WebSocketManager()
