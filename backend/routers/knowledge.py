from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, Query
from typing import Optional
from pydantic import BaseModel

from backend.services.knowledge_service import KnowledgeService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


def _response(status: str, data=None, message: str = ""):
    return {
        "status": status,
        "data": data,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


class RejectRequest(BaseModel):
    operator: str
    reason: str


class ApproveRequest(BaseModel):
    operator: str


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    domain: str = Form(...),
):
    svc = KnowledgeService()
    file_content = await file.read()
    result = svc.upload_document(file_content, file.filename, domain)
    if result.get("status") == "error":
        return _response("error", result, result.get("message", "上传失败"))
    return _response("success", result, result.get("message", "上传成功"))


@router.get("/search")
def search_knowledge(
    query: str = Query(..., description="检索查询文本"),
    domain: Optional[str] = Query(None, description="知识域过滤"),
    top_k: int = Query(5, ge=1, le=20, description="返回结果数"),
):
    svc = KnowledgeService()
    result = svc.search(query, domain, top_k)
    return _response("success", result)


@router.get("/stats")
def knowledge_stats():
    svc = KnowledgeService()
    result = svc.get_stats()
    if result.get("status") == "error":
        return _response("error", None, result.get("message", "获取统计失败"))
    return _response("success", result.get("data"))


@router.post("/approve/{entry_id}")
def approve_entry(entry_id: str, body: ApproveRequest):
    svc = KnowledgeService()
    result = svc.approve_entry(entry_id, body.operator)
    if result.get("status") == "error":
        return _response("error", None, result.get("message", "审批失败"))
    return _response("success", result, result.get("message", "审批通过"))


@router.post("/reject/{entry_id}")
def reject_entry(entry_id: str, body: RejectRequest):
    svc = KnowledgeService()
    result = svc.reject_entry(entry_id, body.operator, body.reason)
    if result.get("status") == "error":
        return _response("error", None, result.get("message", "拒绝操作失败"))
    return _response("success", result, result.get("message", "审批拒绝"))


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200, description="返回条数"),
    offset: int = Query(0, ge=0, description="偏移量"),
):
    svc = KnowledgeService()
    result = svc.get_audit_logs(limit, offset)
    return _response("success", result.get("data"), f"共 {result.get('total', 0)} 条审计日志")


@router.post("/sync/lake")
def sync_from_knowledge_lake():
    svc = KnowledgeService()
    result = svc.sync_from_knowledge_lake()
    if result.get("status") == "degraded":
        return _response("degraded", result, result.get("message", "知识湖同步降级"))
    return _response("success", result, result.get("message", "同步完成"))
