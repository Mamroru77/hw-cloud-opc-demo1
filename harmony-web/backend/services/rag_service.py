import logging
import re
from typing import Optional

from backend.infra.db import get_connection, init_db
from backend.infra.knowledge_base import KNOWLEDGE_BASE

logger = logging.getLogger(__name__)

MEDICAL_RERANK_ENTITIES = [
    "nmpa", "fda", "ich", "gcp", "gmp", "dicom", "hl7", "fhir", "iso", "gb",
    "recist", "ideal", "eras", "clavien-dindo", "alcoa", "gmlp", "samd", "pacs", "cdmo",
    "ld50", "mtd", "noael", "dlt", "auc", "tbr", "snr", "orr", "pfs", "dice", "mpe",
    "荧光", "激发", "发射", "波长", "半衰期", "清除率", "学习曲线", "并发症", "胰瘘",
    "延迟", "时延", "脱敏", "沙箱", "漏电流", "生物相容性", "溶血", "3+3", "爬坡",
    "nm", "ms", "mg/kg", "mg/m²",
]


class RAGService:
    def __init__(self):
        self._chroma = None
        self._initialized = False

    def _ensure_chroma(self) -> bool:
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
        fetch_k = max(top_k * 2, 10)

        # 1. Try ChromaDB if installed & populated
        if self._ensure_chroma():
            try:
                chroma_res = self._vector_search(query, domain, fetch_k)
                if chroma_res and chroma_res.get("results"):
                    chroma_res["results"] = self._medical_rerank(query, chroma_res["results"], top_k)
                    chroma_res["total"] = len(chroma_res["results"])
                    chroma_res["reranked"] = True
                    return self._attach_coverage_warning(chroma_res)
            except Exception as exc:
                logger.warning("ChromaDB search failed, falling back to SQLite semantic search: %s", exc)

        # 2. Persistent SQLite + TF-IDF semantic search + Medical Reranker
        try:
            sqlite_res = self._sqlite_semantic_search(query, domain, fetch_k)
            if sqlite_res and sqlite_res.get("results"):
                sqlite_res["results"] = self._medical_rerank(query, sqlite_res["results"], top_k)
                sqlite_res["total"] = len(sqlite_res["results"])
                sqlite_res["reranked"] = True
                return self._attach_coverage_warning(sqlite_res)
        except Exception as exc:
            logger.warning("SQLite semantic search failed, falling back to builtin KB: %s", exc)

        # 3. Last resort: in-memory builtin KNOWLEDGE_BASE
        fb_res = self._fallback_keyword_search(query, domain, fetch_k)
        fb_res["results"] = self._medical_rerank(query, fb_res["results"], top_k)
        fb_res["total"] = len(fb_res["results"])
        fb_res["reranked"] = True
        return fb_res

    @staticmethod
    def _medical_rerank(query: str, results: list[dict], top_k: int) -> list[dict]:
        """Re-score retrieved chunks by matching medical regulatory & quantitative entity tokens."""
        q_lower = (query or "").lower()
        q_entities = [ent for ent in MEDICAL_RERANK_ENTITIES if ent in q_lower]
        q_numbers = re.findall(r"\d+(?:\.\d+)?", q_lower)
        q_words = [
            w for w in re.split(r"[\s,，。；;、()（）\[\]/]+", q_lower)
            if len(w) >= 2
        ]

        reranked: list[dict] = []
        for item in results:
            doc_text = f"{item.get('source', '')} {item.get('title', '')} {item.get('content', '')}".lower()
            matched_terms: list[str] = []

            for ent in q_entities:
                if ent in doc_text and ent not in matched_terms:
                    matched_terms.append(ent.upper() if ent.isascii() and len(ent) <= 6 else ent)

            for num in q_numbers:
                if num in doc_text and num not in matched_terms:
                    matched_terms.append(num)

            word_hits = 0
            for w in q_words:
                if w in doc_text:
                    word_hits += 1
                    if len(matched_terms) < 6 and w not in [m.lower() for m in matched_terms]:
                        matched_terms.append(w)

            base_score = float(item.get("similarity_score") or 0.0)
            entity_boost = min(0.24, len(matched_terms) * 0.065)
            word_boost = min(0.10, word_hits * 0.025)
            final_score = round(min(0.99, base_score + entity_boost + word_boost), 4)

            enriched = dict(item)
            enriched["base_score"] = round(base_score, 4)
            enriched["similarity_score"] = final_score
            enriched["matched_terms"] = matched_terms
            enriched["reranked"] = True
            reranked.append(enriched)

        reranked.sort(key=lambda x: x.get("similarity_score", 0.0), reverse=True)
        return reranked[:top_k]

    @staticmethod
    def _attach_coverage_warning(results: dict) -> dict:
        items = results.get("results", [])
        if items and all((r.get("similarity_score") or 0) < 0.35 for r in items):
            results["coverage_warning"] = True
            results["suggestion"] = "知识库覆盖不足，建议补充相关领域知识"
        else:
            results.setdefault("coverage_warning", False)
        return results

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
                    similarity_score = max(0.0, min(1.0, 1.0 - float(dist)))
                    all_results.append({
                        "id": meta.get("id", f"{d}_{meta.get('chunk_index', 0)}"),
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
            "engine": "chromadb",
            "results": all_results,
            "total": len(all_results),
        }

    def _sqlite_semantic_search(self, query: str, domain: Optional[str], top_k: int) -> dict:
        init_db()
        conn = get_connection()
        try:
            if domain:
                rows = conn.execute(
                    "SELECT id, domain, source, title, content FROM knowledge_chunks WHERE domain = ?",
                    (domain,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, domain, source, title, content FROM knowledge_chunks"
                ).fetchall()
        finally:
            conn.close()

        if not rows:
            return {"status": "success", "engine": "sqlite-tfidf", "results": [], "total": 0}

        corpus = [f"{r['title']} {r['source']} {r['content']}" for r in rows]
        scores = self._compute_similarity_scores(query, corpus)

        scored = []
        for row, score in zip(rows, scores):
            scored.append({
                "id": row["id"],
                "source": row["source"],
                "title": row["title"],
                "content": row["content"],
                "domain": row["domain"],
                "similarity_score": round(float(score), 4),
            })

        scored.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_items = scored[:top_k]

        return {
            "status": "success",
            "engine": "sqlite-tfidf",
            "results": top_items,
            "total": len(top_items),
        }

    @staticmethod
    def _compute_similarity_scores(query: str, corpus: list[str]) -> list[float]:
        q_clean = (query or "").strip().lower()
        if not q_clean:
            return [0.0] * len(corpus)

        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True)
            matrix = vectorizer.fit_transform([q_clean] + [c.lower() for c in corpus])
            sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
            out = []
            for idx, sim in enumerate(sims):
                boost = 0.25 if q_clean in corpus[idx].lower() else 0.0
                out.append(min(0.99, max(0.0, float(sim) + boost)))
            return out
        except Exception:
            q_grams = {q_clean[i:i + 2] for i in range(max(1, len(q_clean) - 1))}
            out = []
            for doc in corpus:
                d_lower = doc.lower()
                if q_clean in d_lower:
                    out.append(0.88)
                    continue
                d_grams = {d_lower[i:i + 2] for i in range(max(1, len(d_lower) - 1))}
                inter = len(q_grams & d_grams)
                score = inter / max(1, len(q_grams))
                out.append(min(0.95, score))
            return out

    def _fallback_keyword_search(self, query: str, domain: Optional[str], top_k: int = 5) -> dict:
        results = []
        domains = [domain] if domain else list(KNOWLEDGE_BASE.keys())
        query_lower = (query or "").lower()

        for d in domains:
            for idx, entry in enumerate(KNOWLEDGE_BASE.get(d, [])):
                content = entry.get("content", "").lower()
                title = entry.get("title", "").lower()
                if query_lower in content or query_lower in title:
                    results.append({
                        "id": f"fallback_{d}_{idx}",
                        "source": entry.get("source", ""),
                        "title": entry.get("title", ""),
                        "content": entry.get("content", ""),
                        "domain": d,
                        "similarity_score": 0.78,
                    })

        if not results:
            for d in domains:
                for idx, entry in enumerate(KNOWLEDGE_BASE.get(d, [])):
                    results.append({
                        "id": f"fallback_{d}_{idx}",
                        "source": entry.get("source", ""),
                        "title": entry.get("title", ""),
                        "content": entry.get("content", ""),
                        "domain": d,
                        "similarity_score": 0.45,
                    })

        return {
            "status": "degraded",
            "engine": "builtin-fallback",
            "results": results[:top_k],
            "total": len(results[:top_k]),
            "message": "向量引擎不可用，已降级至关键字检索",
        }
