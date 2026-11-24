import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env from harmony-web root if present
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BASE_DIR, ".env"))

from backend.infra.db import init_db, load_session_state_dict, save_session_state_dict
from backend.models.schemas import SessionState
from backend.services.model_router_service import ModelRouterService

init_db()

app = FastAPI(title="Translational Medicine Agent Backend", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Default global state kept for backward compatibility with existing tests/callers
_initial_default = load_session_state_dict("default")
current_state = SessionState(**_initial_default) if _initial_default else SessionState()

model_router = ModelRouterService()
app.state.model_router = model_router


def get_session_state(session_id: str | None = None) -> SessionState:
    global current_state
    sid = (session_id or "default").strip() or "default"
    if sid == "default":
        return current_state
    stored = load_session_state_dict(sid)
    if stored:
        return SessionState(**stored)
    return SessionState()


def save_session_state(state: SessionState, session_id: str | None = None) -> SessionState:
    global current_state
    sid = (session_id or "default").strip() or "default"
    if sid == "default":
        current_state = state
    save_session_state_dict(sid, state.model_dump())
    return state


from backend.routers import state, analyze, scenarios, docs, chat, knowledge, cicd, harmony, models, papers, auth

app.include_router(state.router)
app.include_router(analyze.router)
app.include_router(scenarios.router)
app.include_router(docs.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(cicd.router)
app.include_router(harmony.router)
app.include_router(models.router)
app.include_router(papers.router)
app.include_router(auth.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
