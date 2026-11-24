import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.infra.db import _DB_LOCK, get_connection, init_db
from backend.infra.pdf_parser import extract_text_from_file_bytes
from backend.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

KNOWN_DOMAINS = ["devices", "drugs", "ai", "surgical"]


_HEADING_RE = re.compile(
    r"^(#{1,3}\s+.+|第[一二三四五六七八九十百0-9]+[章节条款]\s*.*|Section\s+\d+(?:\.\d+)*\s*.*)$",
    re.IGNORECASE,
)


def _split_sliding_window(body: str, chunk_size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    text_len = len(body)
    while start < text_len:
        end = start + chunk_size
        chunk = body[start:end]
        if end < text_len:
            last_period = max(
                chunk.rfind("。"),
                chunk.rfind("！"),
                chunk.rfind("？"),
                chunk.rfind("."),
                chunk.rfind("\n"),
            )
            if last_period > chunk_size * 0.5:
                chunk = chunk[: last_period + 1]
                end = start + last_period + 1
        cleaned = chunk.strip()
        if cleaned:
            chunks.append(cleaned)
        if end >= text_len:
            break
        start = max(start + 1, end - overlap)
    return chunks


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    """Hierarchical semantic chunker: splits by regulatory/markdown headings and injects section prefixes."""
    raw = (text or "").strip()
    if not raw:
        return []

    sections: list[tuple[str, str]] = []
    current_heading = ""
    current_lines: list[str] = []

    for line in raw.splitlines():
        stripped = line.strip()
        if _HEADING_RE.match(stripped):
            if current_lines or current_heading:
                body_text = "\n".join(current_lines).strip()
                if body_text or current_heading:
                    sections.append((current_heading, body_text))
            current_heading = re.sub(r"^#{1,3}\s+", "", stripped).strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines or current_heading:
        body_text = "\n".join(current_lines).strip()
        if body_text or current_heading:
            sections.append((current_heading, body_text))

    if len(sections) <= 1 and not sections[0][0]:
        return _split_sliding_window(raw, chunk_size, overlap)

    chunks: list[str] = []
    for heading, body in sections:
        if not body:
            if heading:
                chunks.append(f"[章节: {heading}]")
            continue
        prefix = f"[章节: {heading}] " if heading else ""
        budget = max(120, chunk_size - len(prefix))
        sub_chunks = _split_sliding_window(body, budget, min(overlap, budget // 3))
        for sub in sub_chunks:
            chunks.append(f"{prefix}{sub}" if prefix else sub)

    return chunks


def _record_audit(
    action: str,
    operator_id: str,
    target_id: str,
    before_content: Optional[str] = None,
    after_content: Optional[str] = None,
) -> AuditLog:
    init_db()
    log = AuditLog(
        id=str(uuid.uuid4()),
        action=action,
        operator_id=operator_id,
        target_id=target_id,
        before_content=before_content,
        after_content=after_content,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    with _DB_LOCK:
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO audit_logs (id, action, operator_id, target_id, before_content, after_content, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log.id,
                    log.action,
                    log.operator_id,
                    log.target_id,
                    log.before_content,
                    log.after_content,
                    log.timestamp,
                ),
            )
            conn.commit()
        finally:
            conn.close()
    return log


class KnowledgeService:
    def __init__(self):
        init_db()
        self._chroma = None
        try:
            from backend.infra.chroma_client import ChromaClient
            self._chroma = ChromaClient()
        except Exception:
            self._chroma = None

    def upload_document(
        self,
        file_content: bytes,
        filename: str,
        domain: str,
        auto_approve: bool = False,
        operator: str = "web_user",
    ) -> dict:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in (".pdf", ".md", ".markdown", ".txt"):
            return {"status": "error", "message": f"不支持的文件格式: {ext}"}

        try:
            text = extract_text_from_file_bytes(file_content, filename)
        except Exception as exc:
            return {"status": "error", "message": f"文档解析失败: {exc}"}

        if not text.strip():
            return {"status": "error", "message": "文件内容为空或无法解析"}

        now = datetime.now(timezone.utc).isoformat()
        clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{domain}_{os.path.splitext(filename)[0]}")
        entry_id = f"{clean_name}_{uuid.uuid4().hex[:6]}"
        title = os.path.splitext(filename)[0]

        with _DB_LOCK:
            conn = get_connection()
            try:
                conn.execute(
                    """
                    INSERT INTO knowledge_entries (
                        id, domain, filename, title, source, text, status,
                        approved_by, reject_reason, chunks_count, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, 0, ?, ?)
                    """,
                    (entry_id, domain, filename, title, filename, text, now, now),
                )
                conn.commit()
            finally:
                conn.close()

        _record_audit(
            action="ADD",
            operator_id=operator,
            target_id=entry_id,
            after_content=f"pending entry: {filename} -> {domain} ({len(text)} chars)",
        )

        if auto_approve:
            approval = self.approve_entry(entry_id, operator=operator)
            if approval.get("status") == "success":
                return {
                    "status": "success",
                    "message": f"文档 {filename} 已解析并自动审核入库 {approval.get('chunks_count', 0)} 个知识块",
                    "entry_id": entry_id,
                    "status_detail": "approved",
                    "chunks_count": approval.get("chunks_count", 0),
                    "chunk_count": approval.get("chunks_count", 0),
                    "char_count": len(text),
                }

        return {
            "status": "success",
            "message": f"文档 {filename} 已提交至待审队列，审批通过后将写入向量索引",
            "entry_id": entry_id,
            "status_detail": "pending",
            "chunks_count": 0,
            "chunk_count": 0,
            "char_count": len(text),
        }

    def _index_approved_entry(self, entry: dict) -> int:
        chunks = chunk_text(entry["text"])
        if not chunks:
            return 0

        now = datetime.now(timezone.utc).isoformat()
        metadatas = []
        ids = []

        with _DB_LOCK:
            conn = get_connection()
            try:
                conn.execute("DELETE FROM knowledge_chunks WHERE entry_id = ?", (entry["id"],))
                for i, chunk in enumerate(chunks):
                    chunk_id = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{entry['id']}_{i}")
                    ids.append(chunk_id)
                    metadatas.append({
                        "id": chunk_id,
                        "source": entry["source"],
                        "title": entry["title"],
                        "domain": entry["domain"],
                        "chunk_index": i,
                    })
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO knowledge_chunks (
                            id, entry_id, domain, source, title, content, chunk_index, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (chunk_id, entry["id"], entry["domain"], entry["source"], entry["title"], chunk, i, now),
                    )
                conn.commit()
            finally:
                conn.close()

        # Dual-write to ChromaDB if available
        if self._chroma is not None:
            try:
                self._chroma.add_documents(entry["domain"], chunks, metadatas, ids)
            except Exception as exc:
                logger.warning("ChromaDB index write skipped (SQLite already persisted): %s", exc)

        return len(chunks)

    def approve_entry(self, entry_id: str, operator: str) -> dict:
        with _DB_LOCK:
            conn = get_connection()
            try:
                row = conn.execute(
                    "SELECT * FROM knowledge_entries WHERE id = ? AND status = 'pending'",
                    (entry_id,),
                ).fetchone()
                if not row:
                    return {"status": "error", "message": f"条目 {entry_id} 不存在或已处理"}
                entry = dict(row)
            finally:
                conn.close()

        added = self._index_approved_entry(entry)
        now = datetime.now(timezone.utc).isoformat()

        with _DB_LOCK:
            conn = get_connection()
            try:
                conn.execute(
                    """
                    UPDATE knowledge_entries
                    SET status = 'approved', approved_by = ?, chunks_count = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (operator, added, now, entry_id),
                )
                conn.commit()
            finally:
                conn.close()

        _record_audit(
            action="UPDATE",
            operator_id=operator,
            target_id=entry_id,
            before_content="status: pending",
            after_content=f"status: approved, indexed {added} chunks",
        )

        return {
            "status": "success",
            "message": f"条目 {entry['filename']} 已审批通过，入库 {added} 个块",
            "entry_id": entry_id,
            "chunks_count": added,
        }

    def reject_entry(self, entry_id: str, operator: str, reason: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with _DB_LOCK:
            conn = get_connection()
            try:
                row = conn.execute(
                    "SELECT * FROM knowledge_entries WHERE id = ? AND status = 'pending'",
                    (entry_id,),
                ).fetchone()
                if not row:
                    return {"status": "error", "message": f"条目 {entry_id} 不存在或已处理"}
                conn.execute(
                    """
                    UPDATE knowledge_entries
                    SET status = 'rejected', approved_by = ?, reject_reason = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (operator, reason, now, entry_id),
                )
                conn.commit()
            finally:
                conn.close()

        _record_audit(
            action="DELETE",
            operator_id=operator,
            target_id=entry_id,
            before_content="status: pending",
            after_content=f"status: rejected, reason: {reason}",
        )

        return {
            "status": "success",
            "message": f"条目 {entry_id} 已拒绝",
            "reason": reason,
        }

    def get_audit_logs(self, limit: int = 50, offset: int = 0) -> dict:
        with _DB_LOCK:
            conn = get_connection()
            try:
                total = conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]
                rows = conn.execute(
                    """
                    SELECT id, action, operator_id, target_id, before_content, after_content, timestamp
                    FROM audit_logs
                    ORDER BY timestamp DESC
                    LIMIT ? OFFSET ?
                    """,
                    (limit, offset),
                ).fetchall()
                return {
                    "status": "success",
                    "data": [dict(r) for r in rows],
                    "total": total,
                }
            finally:
                conn.close()

    def get_pending_entries(self) -> list[dict]:
        with _DB_LOCK:
            conn = get_connection()
            try:
                rows = conn.execute(
                    """
                    SELECT id, domain, filename, title, source, status, created_at,
                           length(text) AS char_count, substr(text, 1, 180) AS preview
                    FROM knowledge_entries
                    WHERE status = 'pending'
                    ORDER BY created_at DESC
                    """
                ).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()

    def search(self, query: str, domain: Optional[str] = None, top_k: int = 5) -> dict:
        from backend.services.rag_service import RAGService
        rag = RAGService()
        return rag.search(query, domain, top_k)

    def get_stats(self) -> dict:
        try:
            by_domain = {d: 0 for d in KNOWN_DOMAINS}
            with _DB_LOCK:
                conn = get_connection()
                try:
                    rows = conn.execute(
                        "SELECT domain, COUNT(*) AS cnt FROM knowledge_chunks GROUP BY domain"
                    ).fetchall()
                    for r in rows:
                        by_domain[r["domain"]] = int(r["cnt"])
                    pending_count = conn.execute(
                        "SELECT COUNT(*) FROM knowledge_entries WHERE status = 'pending'"
                    ).fetchone()[0]
                finally:
                    conn.close()

            total = sum(by_domain.values())
            engine = "chromadb+sqlite" if self._chroma is not None else "sqlite-tfidf"
            return {
                "status": "success",
                "data": {
                    "total": total,
                    "by_domain": by_domain,
                    "pending_count": int(pending_count),
                    "engine": engine,
                },
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

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
            logger.warning("KnowledgeLake auth failed, skipping sync, local KB runs independently")
            return {
                "status": "degraded",
                "message": "未配置华为云知识湖 AK/SK 或鉴权失败，已跳过云端同步，本地持久化知识库正常运行",
            }

        documents = adapter.fetch_documents(adapter.knowledge_base_id)
        if not documents:
            return {"status": "success", "message": "知识湖无新文档", "indexed_count": 0}

        total_indexed = 0
        for doc in documents:
            content = doc.get("content", "")
            title = doc.get("title", doc.get("id", "lake_doc"))
            domain = doc.get("domain", "devices")
            if content.strip():
                res = self.upload_document(
                    content.encode("utf-8"),
                    f"{title}.txt",
                    domain if domain in KNOWN_DOMAINS else "devices",
                    auto_approve=True,
                    operator="knowledge_lake_sync",
                )
                total_indexed += int(res.get("chunks_count", 0))

        return {"status": "success", "message": "知识湖同步完成", "indexed_count": total_indexed}
