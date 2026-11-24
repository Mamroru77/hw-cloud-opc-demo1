from typing import Optional
from fastapi import APIRouter, Header
from backend.models.schemas import SessionState

router = APIRouter(prefix="/api", tags=["state"])


def get_state_dep() -> SessionState:
    from backend.main import current_state
    return current_state


@router.get("/state", response_model=SessionState)
def get_state(x_session_id: Optional[str] = Header(default=None)):
    import backend.main as main_mod
    return main_mod.get_session_state(x_session_id)


@router.post("/state", response_model=SessionState)
def update_state(state: SessionState, x_session_id: Optional[str] = Header(default=None)):
    import backend.main as main_mod
    return main_mod.save_session_state(state, x_session_id)
