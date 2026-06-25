import json
import time
from typing import Dict, List, Optional
from backend.infra.ws_server import ws_manager


class HarmonyWSService:
    def __init__(self):
        self.registered_devices: Dict[str, dict] = {}
        self.device_last_seen: Dict[str, float] = {}

    def register_device(self, device_id: str, device_info: dict):
        self.registered_devices[device_id] = device_info
        self.device_last_seen[device_id] = time.time()

    def unregister_device(self, device_id: str):
        self.registered_devices.pop(device_id, None)
        self.device_last_seen.pop(device_id, None)

    def get_devices(self) -> List[dict]:
        return list(self.registered_devices.values())

    async def push_data(self, device_id: str, data: dict):
        self.device_last_seen[device_id] = time.time()
        await ws_manager.broadcast({
            "type": "data_received",
            "device_id": device_id,
            "payload": data,
            "timestamp": time.time(),
        })

    async def handle_disconnect(self, client_id: str):
        devices_to_remove = [
            did for did, info in self.registered_devices.items()
            if info.get("client_id") == client_id
        ]
        for did in devices_to_remove:
            self.unregister_device(did)
        await ws_manager.disconnect(client_id)

    def handle_heartbeat(self, device_id: str):
        self.device_last_seen[device_id] = time.time()


harmony_ws_service = HarmonyWSService()
