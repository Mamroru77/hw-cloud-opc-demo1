import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.infra.knowledge_base import KNOWLEDGE_BASE
from backend.infra.chroma_client import ChromaClient


def init_knowledge():
    client = ChromaClient()
    total_added = 0

    for domain, entries in KNOWLEDGE_BASE.items():
        documents = []
        metadatas = []
        ids = []

        for i, entry in enumerate(entries):
            content = entry.get("content", "")
            documents.append(content)
            metadatas.append({
                "source": entry.get("source", ""),
                "title": entry.get("title", ""),
                "domain": domain,
            })
            ids.append(f"{domain}_builtin_{i}")

        added = client.add_documents(domain, documents, metadatas, ids)
        total_added += added
        print(f"[{domain}] 添加了 {added} 条新文档（总计 {len(entries)} 条）")

    stats = client.get_stats()
    print(f"\n知识库初始化完成，本次新增 {total_added} 条文档")
    print(f"当前知识库统计: {stats}")


if __name__ == "__main__":
    init_knowledge()
