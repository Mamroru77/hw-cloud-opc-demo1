import logging
from typing import Optional

from backend.adapters.codearts_pipeline_adapter import CodeArtsPipelineAdapter
from backend.models.pipeline_status import PipelineStatus

logger = logging.getLogger(__name__)


class CICDService:
    def __init__(self):
        self.adapter = CodeArtsPipelineAdapter()

    async def query_latest_pipeline(self) -> dict:
        result = await self.adapter.get_latest_pipeline()
        if result is None:
            return {
                "status": "degraded",
                "message": "Pipeline API不可用，返回降级响应",
                "data": None,
            }
        pipeline_status = PipelineStatus(
            pipeline_id=result.get("pipeline_id", result.get("id", "unknown")),
            name=result.get("name", "unknown"),
            status=result.get("status", "unknown"),
            started_at=result.get("started_at"),
            finished_at=result.get("finished_at"),
            trigger_type=result.get("trigger_type"),
            commit_id=result.get("commit_id"),
        )
        return {"status": "ok", "data": pipeline_status.model_dump()}

    async def query_build_logs(self, limit: int = 10) -> dict:
        results = await self.adapter.get_build_logs(limit=limit)
        if not results:
            return {
                "status": "degraded",
                "message": "Pipeline API不可用，返回降级响应",
                "data": [],
            }
        logs = []
        for item in results:
            ps = PipelineStatus(
                pipeline_id=item.get("pipeline_id", item.get("id", "unknown")),
                name=item.get("name", "unknown"),
                status=item.get("status", "unknown"),
                started_at=item.get("started_at"),
                finished_at=item.get("finished_at"),
                trigger_type=item.get("trigger_type"),
                commit_id=item.get("commit_id"),
            )
            logs.append(ps.model_dump())
        return {"status": "ok", "data": logs}

    async def query_quality_report(self) -> dict:
        result = await self.adapter.get_quality_report()
        if result is None:
            return {
                "status": "degraded",
                "message": "Insight API不可用，返回降级响应",
                "data": None,
            }
        return {"status": "ok", "data": result}
