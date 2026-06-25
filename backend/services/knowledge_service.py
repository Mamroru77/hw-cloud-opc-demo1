import os
import re
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone

from backend.infra.chroma_client import ChromaClient
from backend.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

_audit_logs: list[AuditLog] = []
_pending_entries: dict[str, dict] = {}
_approved_entries: dict[str, dict] = {}


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if end < len(text):
            last_period = max(
                chunk.rfind("。"),
                chunk.rfind("！"),
                chunk.rfind("？"),
                chunk.rfind("."),
            )
            if last_period > chunk_size * 0.5:
                chunk = chunk[: last_period + 1]
                end = start + last_period + 1
        chunks.append(chunk)
        start = end - overlap
    return chunks


def _record_audit(action: str, operator_id: str, target_id: str,
                  before_content: Optional[str] = None,
                  after_content: Optional[str] = None) -> AuditLog:
    log = AuditLog(
        id=str(uuid.uuid4()),
        action=action,
        operator_id=operator_id,
        target_id=target_id,
        before_content=before_content,
        after_content=after_content,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    _audit_logs.append(log)
    return log


class KnowledgeService:
    def __init__(self):
        self._chroma = ChromaClient()

    def upload_document(self, file_content: bytes, filename: str, domain: str) -> dict:
        ext = os.path.splitext(filename)[1].lower()
        text = ""

        if ext == ".pdf":
            text = self._parse_pdf(file_content)
        elif ext in (".md", ".markdown"):
            text = file_content.decode("utf-8", errors="ignore")
        elif ext in (".txt",):
            text = file_content.decode("utf-8", errors="ignore")
        else:
            return {"status": "error", "message": f"不支持的文件格式: {ext}"}

        if not text.strip():
            return {"status": "error", "message": "文件内容为空或无法解析"}

        entry_id = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{domain}_{filename}")
        _pending_entries[entry_id] = {
            "id": entry_id,
            "domain": domain,
            "filename": filename,
            "text": text,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        _record_audit(
            action="ADD",
            operator_id="system",
            target_id=entry_id,
            after_content=f"pending entry: {filename} -> {domain}",
        )

        return {
            "status": "success",
            "message": f"文档 {filename} 已提交，等待审核",
            "entry_id": entry_id,
            "status_detail": "pending",
        }

    def _index_approved_entry(self, entry: dict) -> int:
        chunks = chunk_text(entry["text"])
        documents = chunks
        metadatas = [
            {
                "source": entry["filename"],
                "title": entry["filename"],
                "domain": entry["domain"],
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]
        ids = [
            re.sub(r"[^a-zA-Z0-9_-]", "_", f"{entry['domain']}_{entry['filename']}_{i}")
            for i in range(len(chunks))
        ]
        return self._chroma.add_documents(entry["domain"], documents, metadatas, ids)

    def approve_entry(self, entry_id: str, operator: str) -> dict:
        entry = _pending_entries.pop(entry_id, None)
        if not entry:
            return {"status": "error", "message": f"条目 {entry_id} 不存在或已处理"}

        before = f"status: {entry['status']}"
        entry["status"] = "approved"
        entry["approved_by"] = operator
        entry["approved_at"] = datetime.now(timezone.utc).isoformat()
        _approved_entries[entry_id] = entry

        added = self._index_approved_entry(entry)

        _record_audit(
            action="UPDATE",
            operator_id=operator,
            target_id=entry_id,
            before_content=before,
            after_content=f"status: approved, indexed {added} chunks",
        )

        return {
            "status": "success",
            "message": f"条目 {entry_id} 已审批通过，入库 {added} 个块",
            "chunks_count": added,
        }

    def reject_entry(self, entry_id: str, operator: str, reason: str) -> dict:
        entry = _pending_entries.pop(entry_id, None)
        if not entry:
            return {"status": "error", "message": f"条目 {entry_id} 不存在或已处理"}

        before = f"status: {entry['status']}"
        entry["status"] = "rejected"
        entry["rejected_by"] = operator
        entry["reject_reason"] = reason
        entry["rejected_at"] = datetime.now(timezone.utc).isoformat()

        _record_audit(
            action="DELETE",
            operator_id=operator,
            target_id=entry_id,
            before_content=before,
            after_content=f"status: rejected, reason: {reason}",
        )

        return {
            "status": "success",
            "message": f"条目 {entry_id} 已拒绝",
            "reason": reason,
        }

    def get_audit_logs(self, limit: int = 50, offset: int = 0) -> dict:
        logs = _audit_logs[offset:offset + limit]
        return {
            "status": "success",
            "data": [log.model_dump() for log in logs],
            "total": len(_audit_logs),
        }

    def get_pending_entries(self) -> list:
        return list(_pending_entries.values())

    def search(self, query: str, domain: Optional[str] = None, top_k: int = 5) -> dict:
        from backend.services.rag_service import RAGService

        rag = RAGService()
        return rag.search(query, domain, top_k)

    def get_stats(self) -> dict:
        try:
            stats = self._chroma.get_stats()
            return {"status": "success", "data": stats}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def sync_from_knowledge_lake(self) -> dict:
        from backend.adapters.knowledge_lake_adapter import KnowledgeLakeAdapter

        adapter = KnowledgeLakeAdapter(
            endpoint=os.getenv("KNOWLEDGE_LAKE_ENDPOINT", ""),
            project_id=os.getenv("KNOWLEDGE_LAKE_PROJECT_ID", ""),
            knowledge_base_id=os.getenv("KNOWLEDGE_LAKE_KB_ID", ""),
            ak=os.getenv("KNOWLEDGE_LAKE_AK", ""),
            sk=os.getenv("KNOWLEDGE_LAKE_SK", ""),
        )

        if not adapter._authenticate():
            logger.warning("KnowledgeLake auth failed, skipping sync, local ChromaDB runs independently")
            return {"status": "degraded", "message": "知识湖鉴权失败，跳过同步，本地ChromaDB独立运行"}

        documents = adapter.fetch_documents(adapter.knowledge_base_id)
        if not documents:
            return {"status": "success", "message": "知识湖无新文档", "indexed_count": 0}

        result = adapter.parse_and_index(documents)
        _record_audit(
            action="ADD",
            operator_id="knowledge_lake_sync",
            target_id="batch",
            after_content=f"indexed {result['indexed_count']} chunks from knowledge lake",
        )
        return {"status": "success", "message": "知识湖同步完成", **result}

    @staticmethod
    def _parse_pdf(file_content: bytes) -> str:
        from io import BytesIO
        from PyPDF2 import PdfReader

        reader = PdfReader(BytesIO(file_content))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n".join(pages)
