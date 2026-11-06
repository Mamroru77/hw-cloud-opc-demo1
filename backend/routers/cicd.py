from fastapi import APIRouter, Request, HTTPException

from backend.services.cicd_service import CICDService
from backend.handlers.webhook_handler import WebhookHandler

router = APIRouter(prefix="/api/cicd", tags=["cicd"])

cicd_service = CICDService()
webhook_handler = WebhookHandler()


@router.post("/webhook")
async def handle_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("X-CodeArts-Signature")
    result = webhook_handler.handle_callback(raw_body, signature)
    if "error" in result:
        if result["error"] == "unauthorized":
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
        if result["error"] == "invalid_payload":
            raise HTTPException(status_code=400, detail="Invalid payload")
    return result


@router.get("/pipeline/status")
async def get_pipeline_status():
    return await cicd_service.query_latest_pipeline()


@router.get("/pipeline/logs")
async def get_pipeline_logs():
    return await cicd_service.query_build_logs(limit=10)


@router.get("/insight/quality")
async def get_quality_report():
    return await cicd_service.query_quality_report()
