from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.infra.pdf_parser import decode_base64_payload
from backend.models.schemas import KnowledgeUploadJsonRequest
from backend.services.auth_service import resolve_request_actor
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
async def upload_document(request: Request):
    """
    Supports both:
    - application/json (KnowledgeUploadJsonRequest: filename, domain, file_base64/text_content, auto_approve)
    - multipart/form-data (file, domain, auto_approve) when python-multipart is installed
    """
    svc = KnowledgeService()
    content_type = (request.headers.get("content-type") or "").lower()
    actor = resolve_request_actor(
        request.headers.get("authorization"),
        request.headers.get("x-actor-role"),
    )
    role_downgraded = False

    if "application/json" in content_type:
        body = await request.json()
        payload = KnowledgeUploadJsonRequest(**body)
        if payload.file_base64:
            file_bytes = decode_base64_payload(payload.file_base64)
        elif payload.text_content is not None:
            file_bytes = payload.text_content.encode("utf-8")
        else:
            return _response("error", None, "缺少文件内容 (file_base64 或 text_content)")

        effective_auto = payload.auto_approve
        if actor["role"] == "researcher" and effective_auto:
            effective_auto = False
            role_downgraded = True
        op_name = actor["user_id"] if actor["auth_mode"] != "default_compat" else payload.operator

        result = svc.upload_document(
            file_bytes,
            payload.filename,
            payload.domain,
            auto_approve=effective_auto,
            operator=op_name,
        )
    else:
        try:
            form = await request.form()
        except Exception as exc:
            return _response("error", None, f"表单解析失败（请安装 python-multipart 或使用 JSON 上传）: {exc}")

        file_obj = form.get("file")
        domain = str(form.get("domain") or "devices")
        auto_approve = str(form.get("auto_approve") or "false").lower() in ("true", "1", "yes")
        operator = str(form.get("operator") or "web_user")

        if actor["role"] == "researcher" and auto_approve:
            auto_approve = False
            role_downgraded = True
        op_name = actor["user_id"] if actor["auth_mode"] != "default_compat" else operator

        if file_obj is None or not hasattr(file_obj, "read"):
            return _response("error", None, "未提供上传文件")

        file_bytes = await file_obj.read()
        filename = getattr(file_obj, "filename", "document.txt") or "document.txt"
        result = svc.upload_document(
            file_bytes,
            filename,
            domain,
            auto_approve=auto_approve,
            operator=op_name,
        )

    if result.get("status") == "error":
        return _response("error", result, result.get("message", "上传失败"))
    if role_downgraded:
        result["rbac_notice"] = "当前为临床转化研究员角色，自动审核已受限并转入待审队列"
        result["message"] = f"{result.get('message', '')}（研究员权限无自审权限，已进入 PI 待审队列）"
    return _response("success", result, result.get("message", "上传成功"))


@router.get("/pending")
def list_pending_entries():
    svc = KnowledgeService()
    entries = svc.get_pending_entries()
    return _response("success", entries, f"共 {len(entries)} 条待审文档")


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
def approve_entry(entry_id: str, body: ApproveRequest, request: Request):
    actor = resolve_request_actor(
        request.headers.get("authorization"),
        request.headers.get("x-actor-role"),
        fallback_operator=body.operator,
    )
    if actor["role"] not in ("reviewer", "admin"):
        return JSONResponse(
            status_code=403,
            content=_response(
                "error",
                {"code": 403, "required_role": "reviewer", "current_role": actor["role"]},
                f"权限不足：当前身份为「{actor['display_name']}」，仅「医学合规审评官 (PI)」可执行审批通过操作",
            ),
        )
    operator_id = f"{actor['user_id']} ({actor['role']})" if actor["auth_mode"] != "default_compat" else body.operator
    svc = KnowledgeService()
    result = svc.approve_entry(entry_id, operator_id)
    if result.get("status") == "error":
        return _response("error", None, result.get("message", "审批失败"))
    return _response("success", result, result.get("message", "审批通过"))


@router.post("/reject/{entry_id}")
def reject_entry(entry_id: str, body: RejectRequest, request: Request):
    actor = resolve_request_actor(
        request.headers.get("authorization"),
        request.headers.get("x-actor-role"),
        fallback_operator=body.operator,
    )
    if actor["role"] not in ("reviewer", "admin"):
        return JSONResponse(
            status_code=403,
            content=_response(
                "error",
                {"code": 403, "required_role": "reviewer", "current_role": actor["role"]},
                f"权限不足：当前身份为「{actor['display_name']}」，仅「医学合规审评官 (PI)」可执行审批拒绝操作",
            ),
        )
    operator_id = f"{actor['user_id']} ({actor['role']})" if actor["auth_mode"] != "default_compat" else body.operator
    svc = KnowledgeService()
    result = svc.reject_entry(entry_id, operator_id, body.reason)
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
