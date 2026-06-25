from fastapi import APIRouter, Request

from backend.services.cicd_service import CICDService
from backend.services.devlog_service import DevLogService

router = APIRouter(prefix="/api/cicd", tags=["cicd"])

cicd_service = CICDService()
devlog_service = DevLogService()


@router.post("/webhook")
async def handle_webhook(request: Request):
    body = await request.json()
    pipeline_name = body.get("pipeline_name", "unknown")
    status = body.get("status", "unknown")
    artifact_url = body.get("artifact_url", "")
    duration = body.get("duration_sec", 0)

    devlog_service.append_pipeline_record(
        pipeline_name, status, artifact_url, duration
    )
    return {"status": "ok"}


@router.get("/pipeline/status")
async def get_pipeline_status():
    return await cicd_service.query_latest_pipeline()


@router.get("/pipeline/logs")
async def get_pipeline_logs():
    return await cicd_service.query_build_logs(limit=10)


@router.get("/insight/quality")
async def get_quality_report():
    return await cicd_service.query_quality_report()
