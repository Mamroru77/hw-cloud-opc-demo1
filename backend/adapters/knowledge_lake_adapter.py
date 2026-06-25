import logging
from typing import Optional

import httpx

from backend.infra.chroma_client import ChromaClient
from backend.services.knowledge_service import chunk_text

logger = logging.getLogger(__name__)


class KnowledgeLakeAdapter:
    def __init__(
        self,
        endpoint: str = "",
        project_id: str = "",
        knowledge_base_id: str = "",
        ak: str = "",
        sk: str = "",
    ):
        self.endpoint = endpoint
        self.project_id = project_id
        self.knowledge_base_id = knowledge_base_id
        self.ak = ak
        self.sk = sk
        self._token: Optional[str] = None

    def _authenticate(self) -> bool:
        if not self.ak or not self.sk:
            logger.warning("KnowledgeLake AK/SK not configured, skipping auth")
            return False
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    f"{self.endpoint}/v3/auth/tokens",
                    json={
                        "auth": {
                            "identity": {
                                "methods": ["access_key"],
                                "access_key": {
                                    "ak": self.ak,
                                    "sk": self.sk,
                                },
                            },
                            "scope": {"project": {"id": self.project_id}},
                        }
                    },
                )
                if resp.status_code in (200, 201):
                    self._token = resp.headers.get("X-Subject-Token") or resp.json().get("token", {}).get("id")
                    return bool(self._token)
                logger.warning(f"KnowledgeLake auth failed: {resp.status_code}")
                return False
        except Exception as e:
            logger.warning(f"KnowledgeLake auth error: {e}")
            return False

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "X-Auth-Token": self._token or "",
        }

    def fetch_documents(self, knowledge_base_id: str) -> list:
        if not self._token and not self._authenticate():
            logger.warning("KnowledgeLake auth failed, skipping document fetch")
            return []
        kb_id = knowledge_base_id or self.knowledge_base_id
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(
                    f"{self.endpoint}/v1/{self.project_id}/knowledge-bases/{kb_id}/documents",
                    headers=self._headers(),
                    params={"limit": 200},
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("documents") or data.get("data") or []
        except Exception as e:
            logger.warning(f"KnowledgeLake fetch_documents failed: {e}")
            return []

    def parse_and_index(self, documents: list) -> dict:
        chroma = ChromaClient()
        total_indexed = 0
        for doc in documents:
            doc_id = doc.get("id", "")
            title = doc.get("title", doc_id)
            content = doc.get("content", "")
            domain = doc.get("domain", "lake_default")
            if not content.strip():
                continue
            chunks = chunk_text(content)
            metadatas = [
                {
                    "source": title,
                    "title": title,
                    "domain": domain,
                    "chunk_index": i,
                    "origin": "knowledge_lake",
                }
                for i in range(len(chunks))
            ]
            import re
            ids = [
                re.sub(r"[^a-zA-Z0-9_-]", "_", f"lake_{doc_id}_{i}")
                for i in range(len(chunks))
            ]
            added = chroma.add_documents(domain, chunks, metadatas, ids)
            total_indexed += added
        return {"status": "success", "indexed_count": total_indexed}
