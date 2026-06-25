from fastapi import APIRouter, Depends
from backend.models.schemas import SessionState

router = APIRouter(prefix="/api", tags=["state"])


def get_state_dep() -> SessionState:
    from backend.main import current_state
    return current_state


@router.get("/state", response_model=SessionState)
def get_state():
    from backend.main import current_state
    return current_state


@router.post("/state", response_model=SessionState)
def update_state(state: SessionState):
    import backend.main as main_mod
    main_mod.current_state = state
    return main_mod.current_state
