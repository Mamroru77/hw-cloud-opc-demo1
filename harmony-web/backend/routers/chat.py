from fastapi import APIRouter
from backend.models.schemas import ChatMessage
from backend.services.chat_service import chat_agent_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat-agent")
def chat_agent(payload: ChatMessage):
    import backend.main as main_mod
    return chat_agent_service(payload, main_mod.current_state)
