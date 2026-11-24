import json
from typing import Optional
from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse

from backend.models.schemas import ChatMessage
from backend.services.chat_service import chat_agent_service, chat_agent_stream_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat-agent")
async def chat_agent(
    payload: ChatMessage,
    x_session_id: Optional[str] = Header(default=None),
):
    import backend.main as main_mod
    sid = (x_session_id or "default").strip() or "default"
    state = main_mod.get_session_state(sid)
    result = await chat_agent_service(payload, state)
    if result.get("state_updated"):
        main_mod.save_session_state(state, sid)
    return result


@router.post("/chat-agent/stream")
async def chat_agent_stream(
    payload: ChatMessage,
    x_session_id: Optional[str] = Header(default=None),
):
    import backend.main as main_mod
    sid = (x_session_id or "default").strip() or "default"
    state = main_mod.get_session_state(sid)

    def _on_state_saved(updated_state):
        main_mod.save_session_state(updated_state, sid)

    async def event_generator():
        async for event in chat_agent_stream_service(payload, state, on_state_saved=_on_state_saved):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
