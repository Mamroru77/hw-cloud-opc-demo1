from typing import Optional
from fastapi import APIRouter, Header

from backend.models.schemas import AnalyzePaperRequest
from backend.services.analyze_service import analyze_paper_service

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze-paper")
async def analyze_paper(
    payload: AnalyzePaperRequest,
    x_session_id: Optional[str] = Header(default=None),
):
    import backend.main as main_mod
    sid = (x_session_id or "default").strip() or "default"
    state = main_mod.get_session_state(sid)
    result = await analyze_paper_service(payload, state, session_id=sid)
    if result.get("is_valid"):
        main_mod.save_session_state(state, sid)
    return result
