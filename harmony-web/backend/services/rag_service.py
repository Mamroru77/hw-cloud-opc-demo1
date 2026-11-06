from typing import Optional
from backend.infra.knowledge_base import KNOWLEDGE_BASE


class RAGService:
    def __init__(self):
        self._chroma = None
        self._initialized = False

    def _ensure_chroma(self):
        if self._initialized:
            return self._chroma is not None
        self._initialized = True
        try:
            from backend.infra.chroma_client import ChromaClient
            self._chroma = ChromaClient()
            return True
        except Exception:
            self._chroma = None
            return False

    def search(self, query: str, domain: Optional[str] = None, top_k: int = 5) -> dict:
        try:
            if not self._ensure_chroma():
                return self._fallback_keyword_search(query, domain)
            results = self._vector_search(query, domain, top_k)
            if results and results.get("results"):
                all_low = all(
                    r.get("similarity_score", 0) < 0.5 for r in results["results"]
                )
                if all_low:
                    results["coverage_warning"] = True
                    results["suggestion"] = "知识库覆盖不足，建议补充相关领域知识"
            return results
        except Exception:
            return self._fallback_keyword_search(query, domain)

    def _vector_search(self, query: str, domain: Optional[str], top_k: int) -> dict:
        domains = [domain] if domain else ["devices", "drugs", "ai", "surgical"]
        all_results = []

        for d in domains:
            try:
                raw = self._chroma.query(d, query, n_results=top_k)
                docs = raw.get("documents", [])
                dists = raw.get("distances", [])
                metas = raw.get("metadatas", [])

                for doc, dist, meta in zip(docs, dists, metas):
                    similarity_score = 1 - dist
                    all_results.append({
                        "source": meta.get("source", ""),
                        "title": meta.get("title", ""),
                        "content": doc,
                        "similarity_score": round(similarity_score, 4),
                        "domain": meta.get("domain", d),
                    })
            except Exception:
                continue

        all_results.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)
        all_results = all_results[:top_k]

        return {
            "status": "success",
            "results": all_results,
            "total": len(all_results),
        }

    def _fallback_keyword_search(self, query: str, domain: Optional[str]) -> dict:
        results = []
        domains = [domain] if domain else list(KNOWLEDGE_BASE.keys())

        query_lower = query.lower()
        for d in domains:
            for entry in KNOWLEDGE_BASE.get(d, []):
                content = entry.get("content", "").lower()
                title = entry.get("title", "").lower()
                if query_lower in content or query_lower in title:
                    results.append({
                        "source": entry.get("source", ""),
                        "title": entry.get("title", ""),
                        "content": entry.get("content", ""),
                        "domain": d,
                    })

        if not results:
            for d in domains:
                for entry in KNOWLEDGE_BASE.get(d, []):
                    results.append({
                        "source": entry.get("source", ""),
                        "title": entry.get("title", ""),
                        "content": entry.get("content", ""),
                        "domain": d,
                    })

        return {
            "status": "degraded",
            "results": results[:5],
            "total": len(results[:5]),
            "message": "ChromaDB不可用，已降级至关键字检索",
        }
