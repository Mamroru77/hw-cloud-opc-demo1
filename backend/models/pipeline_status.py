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
