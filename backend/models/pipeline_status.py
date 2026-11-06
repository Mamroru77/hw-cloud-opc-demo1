from pydantic import BaseModel
from typing import Optional


class PipelineStatus(BaseModel):
    pipeline_id: str
    name: str
    status: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    trigger_type: Optional[str] = None
    commit_id: Optional[str] = None


class DefectTrendItem(BaseModel):
    date: str
    count: int


class QualityReport(BaseModel):
    defect_trend: list[DefectTrendItem]
    tech_debt_score: Optional[float] = None
    code_duplication_rate: Optional[float] = None


class WebhookPayload(BaseModel):
    pipeline_id: str = "unknown"
    pipeline_name: str = "unknown"
    status: str = "unknown"
    artifact_url: str = ""
    duration_sec: float = 0
    started_at: Optional[str] = None
