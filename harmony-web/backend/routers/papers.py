from typing import Optional
from fastapi import APIRouter, Header

from backend.infra.db import delete_paper_record, list_papers_for_session

router = APIRouter(prefix="/api/papers", tags=["papers"])


@router.get("")
def get_papers(x_session_id: Optional[str] = Header(default=None)):
    sid = (x_session_id or "default").strip() or "default"
    items = list_papers_for_session(sid)
    return {
        "status": "success",
        "data": items,
        "total": len(items),
    }


@router.delete("/{paper_id}")
def delete_paper(paper_id: str, x_session_id: Optional[str] = Header(default=None)):
    sid = (x_session_id or "default").strip() or "default"
    deleted = delete_paper_record(paper_id, sid)
    return {
        "status": "success" if deleted else "not_found",
        "deleted": deleted,
        "paper_id": paper_id,
    }
