import os
import chromadb


class ChromaClient:
    _instance = None

    def __new__(cls, persist_directory: str = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, persist_directory: str = None):
        if self._initialized:
            return
        if persist_directory is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            project_root = os.path.dirname(base_dir)
            persist_directory = os.path.join(project_root, "chroma_data")
        self._persist_directory = persist_directory
        try:
            self._client = chromadb.PersistentClient(path=persist_directory)
        except Exception as e:
            raise RuntimeError(f"ChromaDB 初始化失败: {e}")
        self._initialized = True

    def get_or_create_collection(self, domain: str):
        try:
            return self._client.get_or_create_collection(
                name=f"kb_{domain}",
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            raise RuntimeError(f"获取/创建 collection kb_{domain} 失败: {e}")

    def add_documents(self, domain: str, documents: list, metadatas: list, ids: list):
        collection = self.get_or_create_collection(domain)
        try:
            existing_ids = set(collection.get(ids=ids)["ids"]) if ids else set()
            new_docs = []
            new_metas = []
            new_ids = []
            for doc, meta, doc_id in zip(documents, metadatas, ids):
                if doc_id not in existing_ids:
                    new_docs.append(doc)
                    new_metas.append(meta)
                    new_ids.append(doc_id)
            if new_ids:
                collection.add(documents=new_docs, metadatas=new_metas, ids=new_ids)
            return len(new_ids)
        except Exception as e:
            raise RuntimeError(f"批量写入 collection kb_{domain} 失败: {e}")

    def query(self, domain: str, query_text: str, n_results: int = 5):
        collection = self.get_or_create_collection(domain)
        try:
            results = collection.query(
                query_texts=[query_text],
                n_results=n_results,
                include=["documents", "distances", "metadatas"]
            )
            return {
                "documents": results.get("documents", [[]])[0],
                "distances": results.get("distances", [[]])[0],
                "metadatas": results.get("metadatas", [[]])[0],
            }
        except Exception as e:
            raise RuntimeError(f"向量检索 collection kb_{domain} 失败: {e}")

    def get_stats(self):
        try:
            collections = self._client.list_collections()
            stats = {}
            for col_info in collections:
                name = col_info.name if hasattr(col_info, "name") else str(col_info)
                try:
                    col = self._client.get_collection(name)
                    stats[name] = col.count()
                except Exception:
                    stats[name] = -1
            return stats
        except Exception as e:
            raise RuntimeError(f"获取知识库统计失败: {e}")
