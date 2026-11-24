import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Optional

from backend.infra.knowledge_base import KNOWLEDGE_BASE, ROBOTS_DB

_DB_LOCK = threading.Lock()
_INITIALIZED = False


def get_db_path() -> str:
    env_path = os.getenv("CLOUDVEIN_DB_PATH")
    if env_path:
        return env_path
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "cloudvein.db")


def get_connection() -> sqlite3.Connection:
    path = get_db_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_scenarios(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) FROM scenarios").fetchone()[0]
    if count > 0:
        return

    now = _utc_now()
    rows = []

    for r in ROBOTS_DB:
        exc = r.get("excitation_compatible", [780.0, 810.0])
        rows.append((
            r["id"],
            "devices",
            r["name"],
            r["manufacturer"],
            r["national_installs"],
            json.dumps(r["channels"], ensure_ascii=False),
            json.dumps(r["suitability_departments"], ensure_ascii=False),
            float(exc[0]),
            float(exc[1]),
            90,
            r["description"],
            now,
        ))

    extra_scenarios = [
        # drugs
        (
            "wuxi-apptec", "drugs", "药明生物中试 CDMO 基地 (WuXi Biologics CDMO)", "药明康德", 12,
            ["GMP 生产车间", "新药中试外包资质"], ["肿瘤内科", "普通外科", "肝胆外科"], None, None, 96,
            "国内顶尖药代药动 CMC 研发配套 CDMO 平台，已打通从小分子合成到千克级工艺放大的全套 GMP 标准产线。"
        ),
        (
            "xiehe-gcp", "drugs", "北京协和医院临床 GCP 中心 (PUMCH GCP Center)", "北京协和医院", 8,
            ["国家重点GCP临床试验基地"], ["肿瘤内科", "普通外科", "肝胆外科"], None, None, 92,
            "全国综合实力最强的临床基地，在肿瘤免疫及靶向小分子一期爬坡试验方面拥有极其深厚的试验设计及受试者伦理保障经验。"
        ),
        (
            "fudan-gcp", "drugs", "复旦大学附属中山医院 GCP 基地", "上海中山医院", 6,
            ["肿瘤/普通外科临床药理室"], ["肿瘤内科", "普通外科", "肝胆外科"], None, None, 89,
            "华东地区规模领先的临床评价试验中心，具备高度的样本信息化采集和极速的病患队列招募效率。"
        ),
        # ai
        (
            "neusoft-pacs", "ai", "东软医疗 PACS 影像生态系统 (Neusoft PACS)", "东软医疗", 680,
            ["DICOM 3.0 标准接入", "三维影像云存储端口"], ["放射科", "脑外科/神经外科"], None, None, 95,
            "国产装机覆盖率第一的 PACS 系统，具备优异的开放接口，能实现脑外科/胸外科三维图像的免重构热接入。"
        ),
        (
            "nvidia-compute", "ai", "NVIDIA HGX 智慧医疗计算集群", "英伟达 (NVIDIA)", 120,
            ["CUDA 12.x 推理加速", "TensorRT 优化引擎"], ["放射科", "脑外科/神经外科"], None, None, 93,
            "专为三维超大卷积网络和Transformer医学影像模型优化设计的边缘推理服务器集群，可将延迟压低至 10ms。"
        ),
        (
            "sensetime-care", "ai", "商汤 SenseCare 诊疗一体化平台", "商汤科技", 210,
            ["多模态智能辅助诊断接口"], ["放射科", "脑外科/神经外科"], None, None, 90,
            "集成度极高的智慧医疗图像中间件平台，拥有完备的临床沙箱安全隔离和PACS多层级通信协议适配。"
        ),
        # surgical
        (
            "sim-center", "surgical", "华东微创技能大体解剖模拟实验室 (Micro-Surg Sim)", "临床技能实训基地", 15,
            ["大体解剖室", "高仿真腔镜模拟系统"], ["普通外科", "肝胆外科", "胃肠外科"], None, None, 96,
            "国内顶级的微创医师技能带教基地，完美支持改良术式在大体/离体器官上的模拟实训及安全性考核。"
        ),
        (
            "lap-tower", "surgical", "腹腔镜一体化高清手术室平台 (Karl Storz Lap Tower)", "Karl Storz", 320,
            ["百级层流配置", "4K腔镜影像系统"], ["普通外科", "肝胆外科", "胃肠外科"], None, None, 92,
            "全球微创外科标杆手术塔，支持高清气腹切割及多视角带教视频录制，广泛适配各类腹腔镜切割吻合器。"
        ),
        (
            "animal-lab", "surgical", "高仿真活体动物外科手术实训基地", "医学教育实训中心", 28,
            ["活体动物实验准入", "无菌手术台"], ["普通外科", "肝胆外科", "胃肠外科"], None, None, 88,
            "提供猪、兔等活体动物微创重建的伦理和实验环境，是改良缝合术式缩短学习曲线的最佳第一步考核基地。"
        ),
    ]

    for item in extra_scenarios:
        rows.append((
            item[0], item[1], item[2], item[3], item[4],
            json.dumps(item[5], ensure_ascii=False),
            json.dumps(item[6], ensure_ascii=False),
            item[7], item[8], item[9], item[10], now
        ))

    conn.executemany(
        """
        INSERT OR IGNORE INTO scenarios (
            id, domain, name, manufacturer, national_installs,
            channels_json, suitability_departments_json,
            excitation_min, excitation_max, base_score, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def _seed_knowledge(conn: sqlite3.Connection) -> None:
    now = _utc_now()
    for domain, entries in KNOWLEDGE_BASE.items():
        for idx, entry in enumerate(entries):
            entry_id = f"{domain}_builtin_{idx}"
            title = entry.get("title", "")
            source = entry.get("source", "")
            content = entry.get("content", "")
            conn.execute(
                """
                INSERT OR IGNORE INTO knowledge_entries (
                    id, domain, filename, title, source, text, status,
                    approved_by, reject_reason, chunks_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'approved', 'system_seed', NULL, 1, ?, ?)
                """,
                (entry_id, domain, title, title, source, content, now, now),
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO knowledge_chunks (
                    id, entry_id, domain, source, title, content, chunk_index, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
                """,
                (f"{entry_id}_0", entry_id, domain, source, title, content, now),
            )


def _seed_users(conn: sqlite3.Connection) -> None:
    now = _utc_now()
    preset = [
        ("researcher_01", "researcher", "临床转化研究员", now),
        ("reviewer_pi", "reviewer", "医学合规审评官 (PI)", now),
        ("opc_admin", "admin", "OPC 平台管理员", now),
    ]
    conn.executemany(
        """
        INSERT OR IGNORE INTO users (id, role, display_name, created_at)
        VALUES (?, ?, ?, ?)
        """,
        preset,
    )


def init_db() -> None:
    global _INITIALIZED
    with _DB_LOCK:
        if _INITIALIZED:
            return
        conn = get_connection()
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    role TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS papers (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    content TEXT NOT NULL,
                    state_json TEXT NOT NULL,
                    clinical_doc TEXT DEFAULT '',
                    bp_doc TEXT DEFAULT '',
                    doc_source TEXT DEFAULT 'template',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS knowledge_entries (
                    id TEXT PRIMARY KEY,
                    domain TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    title TEXT NOT NULL,
                    source TEXT NOT NULL,
                    text TEXT NOT NULL,
                    status TEXT NOT NULL,
                    approved_by TEXT,
                    reject_reason TEXT,
                    chunks_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS knowledge_chunks (
                    id TEXT PRIMARY KEY,
                    entry_id TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    source TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    operator_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    before_content TEXT,
                    after_content TEXT,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS scenarios (
                    id TEXT PRIMARY KEY,
                    domain TEXT NOT NULL,
                    name TEXT NOT NULL,
                    manufacturer TEXT NOT NULL,
                    national_installs INTEGER DEFAULT 0,
                    channels_json TEXT NOT NULL,
                    suitability_departments_json TEXT NOT NULL,
                    excitation_min REAL,
                    excitation_max REAL,
                    base_score INTEGER DEFAULT 90,
                    description TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS model_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_id TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    input_tokens INTEGER DEFAULT 0,
                    output_tokens INTEGER DEFAULT 0,
                    success INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL
                );
                """
            )
            _seed_users(conn)
            _seed_scenarios(conn)
            _seed_knowledge(conn)
            conn.commit()
            _INITIALIZED = True
        finally:
            conn.close()


# ---- Session helpers ----

def load_session_state_dict(session_id: str) -> Optional[dict[str, Any]]:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT state_json FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            if not row:
                return None
            return json.loads(row["state_json"])
        finally:
            conn.close()


def save_session_state_dict(session_id: str, state_dict: dict[str, Any]) -> None:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO sessions (session_id, state_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    state_json = excluded.state_json,
                    updated_at = excluded.updated_at
                """,
                (session_id, json.dumps(state_dict, ensure_ascii=False), _utc_now()),
            )
            conn.commit()
        finally:
            conn.close()


# ---- Paper helpers ----

def save_paper_record(
    paper_id: str,
    session_id: str,
    title: str,
    domain: str,
    content: str,
    state_dict: dict[str, Any],
    clinical_doc: str = "",
    bp_doc: str = "",
    doc_source: str = "template",
) -> dict[str, Any]:
    init_db()
    now = _utc_now()
    with _DB_LOCK:
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO papers (
                    id, session_id, title, domain, content, state_json,
                    clinical_doc, bp_doc, doc_source, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    domain = excluded.domain,
                    content = CASE WHEN length(excluded.content) > 0 THEN excluded.content ELSE papers.content END,
                    state_json = excluded.state_json,
                    clinical_doc = CASE WHEN length(excluded.clinical_doc) > 0 THEN excluded.clinical_doc ELSE papers.clinical_doc END,
                    bp_doc = CASE WHEN length(excluded.bp_doc) > 0 THEN excluded.bp_doc ELSE papers.bp_doc END,
                    doc_source = excluded.doc_source,
                    updated_at = excluded.updated_at
                """,
                (
                    paper_id,
                    session_id,
                    title,
                    domain,
                    content,
                    json.dumps(state_dict, ensure_ascii=False),
                    clinical_doc,
                    bp_doc,
                    doc_source,
                    now,
                    now,
                ),
            )
            conn.commit()
        finally:
            conn.close()
    return {
        "id": paper_id,
        "session_id": session_id,
        "title": title,
        "domain": domain,
        "updated_at": now,
    }


def list_papers_for_session(session_id: str) -> list[dict[str, Any]]:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            rows = conn.execute(
                """
                SELECT id, title, domain, content, state_json, clinical_doc, bp_doc, doc_source, created_at, updated_at
                FROM papers
                WHERE session_id = ?
                ORDER BY updated_at DESC
                """,
                (session_id,),
            ).fetchall()
            result = []
            for r in rows:
                result.append({
                    "id": r["id"],
                    "title": r["title"],
                    "domain": r["domain"],
                    "content": r["content"],
                    "params": json.loads(r["state_json"]),
                    "clinical_doc": r["clinical_doc"] or "",
                    "bp_doc": r["bp_doc"] or "",
                    "doc_source": r["doc_source"] or "template",
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                })
            return result
        finally:
            conn.close()


def delete_paper_record(paper_id: str, session_id: str) -> bool:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            cur = conn.execute(
                "DELETE FROM papers WHERE id = ? AND session_id = ?",
                (paper_id, session_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


# ---- Model metrics helpers ----

def record_model_metric(
    provider_id: str,
    model_name: str,
    latency_ms: float,
    input_tokens: int = 0,
    output_tokens: int = 0,
    success: bool = True,
) -> None:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO model_metrics (
                    provider_id, model_name, latency_ms, input_tokens, output_tokens, success, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    provider_id,
                    model_name,
                    float(latency_ms),
                    int(input_tokens),
                    int(output_tokens),
                    1 if success else 0,
                    _utc_now(),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def get_aggregated_model_metrics() -> dict[str, dict[str, Any]]:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            rows = conn.execute(
                """
                SELECT
                    provider_id,
                    MAX(model_name) AS model_name,
                    AVG(latency_ms) AS avg_latency_ms,
                    AVG(input_tokens) AS avg_input_tokens,
                    AVG(output_tokens) AS avg_output_tokens,
                    COUNT(*) AS call_count,
                    AVG(success) * 100.0 AS success_rate
                FROM model_metrics
                GROUP BY provider_id
                """
            ).fetchall()
            out: dict[str, dict[str, Any]] = {}
            for r in rows:
                out[r["provider_id"]] = {
                    "provider_id": r["provider_id"],
                    "model_name": r["model_name"],
                    "avg_latency_ms": round(r["avg_latency_ms"] or 0, 1),
                    "avg_input_tokens": int(round(r["avg_input_tokens"] or 0)),
                    "avg_output_tokens": int(round(r["avg_output_tokens"] or 0)),
                    "call_count": int(r["call_count"] or 0),
                    "success_rate": round(r["success_rate"] or 100.0, 1),
                }
            return out
        finally:
            conn.close()


# ---- Scenario helpers ----

def list_scenarios_by_domain(domain: Optional[str] = None) -> list[dict[str, Any]]:
    init_db()
    with _DB_LOCK:
        conn = get_connection()
        try:
            if domain:
                rows = conn.execute(
                    "SELECT * FROM scenarios WHERE domain = ? ORDER BY base_score DESC",
                    (domain,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM scenarios ORDER BY domain, base_score DESC"
                ).fetchall()
            result = []
            for r in rows:
                result.append({
                    "id": r["id"],
                    "domain": r["domain"],
                    "name": r["name"],
                    "manufacturer": r["manufacturer"],
                    "national_installs": r["national_installs"],
                    "channels": json.loads(r["channels_json"]),
                    "suitability_departments": json.loads(r["suitability_departments_json"]),
                    "excitation_compatible": (
                        [r["excitation_min"], r["excitation_max"]]
                        if r["excitation_min"] is not None and r["excitation_max"] is not None
                        else None
                    ),
                    "base_score": r["base_score"],
                    "description": r["description"],
                })
            return result
        finally:
            conn.close()


def upsert_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
    init_db()
    now = _utc_now()
    exc = scenario.get("excitation_compatible")
    exc_min = float(exc[0]) if exc and len(exc) >= 2 else None
    exc_max = float(exc[1]) if exc and len(exc) >= 2 else None
    with _DB_LOCK:
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO scenarios (
                    id, domain, name, manufacturer, national_installs,
                    channels_json, suitability_departments_json,
                    excitation_min, excitation_max, base_score, description, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    domain = excluded.domain,
                    name = excluded.name,
                    manufacturer = excluded.manufacturer,
                    national_installs = excluded.national_installs,
                    channels_json = excluded.channels_json,
                    suitability_departments_json = excluded.suitability_departments_json,
                    excitation_min = excluded.excitation_min,
                    excitation_max = excluded.excitation_max,
                    base_score = excluded.base_score,
                    description = excluded.description
                """,
                (
                    scenario["id"],
                    scenario["domain"],
                    scenario["name"],
                    scenario["manufacturer"],
                    int(scenario.get("national_installs", 0)),
                    json.dumps(scenario.get("channels", []), ensure_ascii=False),
                    json.dumps(scenario.get("suitability_departments", []), ensure_ascii=False),
                    exc_min,
                    exc_max,
                    int(scenario.get("base_score", 90)),
                    scenario.get("description", ""),
                    now,
                ),
            )
            conn.commit()
        finally:
            conn.close()
    return scenario
