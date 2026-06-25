from fastapi import APIRouter
from backend.models.schemas import AnalyzePaperRequest
from backend.services.analyze_service import analyze_paper_service

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze-paper")
def analyze_paper(payload: AnalyzePaperRequest):
    import backend.main as main_mod
    return analyze_paper_service(payload, main_mod.current_state)
