import time
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from backend.services.npu_sanitizer_service import npu_sanitizer_service, SanitizeResult
from backend.services.harmony_ws_service import harmony_ws_service
from backend.infra.ws_server import ws_manager

router = APIRouter(prefix="/api/harmony", tags=["harmony"])


class SanitizeRequest(BaseModel):
    text: str


MOCK_DEVICES = [
    {
        "device_id": "harmony-tablet-001",
        "device_name": "MatePad Pro",
        "device_type": "tablet",
        "connection_status": "discovered",
    },
    {
        "device_id": "harmony-screen-001",
        "device_name": "华为智慧屏 V5",
        "device_type": "smart_screen",
        "connection_status": "discovered",
    },
    {
        "device_id": "harmony-pc-001",
        "device_name": "MateBook X Pro",
        "device_type": "pc",
        "connection_status": "discovered",
    },
]


@router.post("/discover")
async def discover_devices():
    return {"devices": MOCK_DEVICES, "timestamp": time.time()}


@router.post("/sanitize", response_model=SanitizeResult)
async def sanitize_text(request: SanitizeRequest):
    return npu_sanitizer_service.sanitize(request.text)


@router.get("/devices")
async def get_connected_devices():
    return {"devices": harmony_ws_service.get_devices(), "count": len(harmony_ws_service.get_devices())}


@router.websocket("/ws")
async def harmony_websocket(websocket: WebSocket):
    client_id = str(uuid.uuid4())
    await ws_manager.connect(client_id, websocket)

    harmony_ws_service.register_device(client_id, {
        "client_id": client_id,
        "device_name": f"Client-{client_id[:8]}",
        "connected_at": time.time(),
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "heartbeat":
                await websocket.send_json({"type": "heartbeat_ack", "timestamp": time.time()})
            elif msg_type == "discover":
                await websocket.send_json({"type": "device_discovered", "devices": MOCK_DEVICES})
            elif msg_type == "pair":
                device_id = data.get("device_id", "")
                await websocket.send_json({"type": "pair_result", "device_id": device_id, "success": True})
            elif msg_type == "establish_channel":
                device_id = data.get("device_id", "")
                await websocket.send_json({"type": "channel_established", "device_id": device_id, "success": True})
            elif msg_type == "send_data":
                device_id = data.get("device_id", "")
                payload = data.get("payload", {})
                await harmony_ws_service.push_data(device_id, payload)
                await websocket.send_json({"type": "data_sent", "device_id": device_id, "success": True})
            elif msg_type == "close_channel":
                device_id = data.get("device_id", "")
                await websocket.send_json({"type": "channel_closed", "device_id": device_id})
    except WebSocketDisconnect:
        await harmony_ws_service.handle_disconnect(client_id)
