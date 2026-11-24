import base64
from backend.infra.db import get_connection
from backend.services.knowledge_service import chunk_text


def _build_blank_pdf_bytes() -> bytes:
    """Construct a minimal valid 1-page PDF with zero text streams (simulates a scanned image-only PDF)."""
    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n",
    ]
    buf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(buf))
        buf.extend(obj)
    xref_pos = len(buf)
    buf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    buf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        buf.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    buf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )
    return bytes(buf)


def test_sqlite_wal_and_24_regulations_seeded(client):
    conn = get_connection()
    try:
        mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    finally:
        conn.close()
    assert str(mode).lower() == "wal"

    resp = client.get("/api/knowledge/stats")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total"] >= 24
    for domain in ("devices", "drugs", "ai", "surgical"):
        assert data["by_domain"][domain] >= 6


def test_jwt_auth_and_rbac_enforcement(client):
    roles_resp = client.get("/api/auth/roles")
    assert roles_resp.status_code == 200
    role_ids = {r["role"] for r in roles_resp.json()["roles"]}
    assert {"researcher", "reviewer", "admin"}.issubset(role_ids)

    res_tok_resp = client.post("/api/auth/token", json={"role": "researcher"})
    assert res_tok_resp.status_code == 200
    researcher_token = res_tok_resp.json()["access_token"]
    researcher_headers = {"Authorization": f"Bearer {researcher_token}"}

    me_resp = client.get("/api/auth/me", headers=researcher_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["role"] == "researcher"

    # Researcher requesting auto_approve=True must be forced into pending queue
    upload_resp = client.post(
        "/api/knowledge/upload",
        headers=researcher_headers,
        json={
            "filename": "p2_rbac_test_guideline.md",
            "domain": "devices",
            "text_content": "## 第一条 近红外光谱\n激发波长 780nm，信噪比 TBR >= 3.5。",
            "auto_approve": True,
            "operator": "researcher_01",
        },
    )
    assert upload_resp.status_code == 200
    upload_data = upload_resp.json()["data"]
    assert upload_data["status_detail"] == "pending"
    entry_id = upload_data["entry_id"]

    # Researcher attempting approval must receive HTTP 403
    forbidden_resp = client.post(
        f"/api/knowledge/approve/{entry_id}",
        headers=researcher_headers,
        json={"operator": "researcher_01"},
    )
    assert forbidden_resp.status_code == 403

    # Reviewer (PI) token can approve and write audit trail
    rev_tok_resp = client.post("/api/auth/token", json={"role": "reviewer"})
    assert rev_tok_resp.status_code == 200
    reviewer_token = rev_tok_resp.json()["access_token"]
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

    approve_resp = client.post(
        f"/api/knowledge/approve/{entry_id}",
        headers=reviewer_headers,
        json={"operator": "reviewer_pi"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "success"

    audit_resp = client.get("/api/knowledge/audit-logs?limit=5")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()["data"]
    assert any(l["target_id"] == entry_id and "reviewer_pi" in l["operator_id"] for l in logs)


def test_hierarchical_chunking_and_medical_reranker(client):
    sample_doc = (
        "## 第一章 激光安全限值\n"
        + ("手术导航近红外激光发射端连续波辐照度应严格低于 MPE 限值。" * 6)
        + "\n## 第二章 生物相容性\n"
        + ("体外溶血率必须小于 5%，细胞相对增殖率应不低于 70%。" * 6)
    )
    chunks = chunk_text(sample_doc, chunk_size=180, overlap=20)
    assert len(chunks) >= 2
    assert any(c.startswith("[章节: 第一章 激光安全限值]") for c in chunks)
    assert any(c.startswith("[章节: 第二章 生物相容性]") for c in chunks)

    search_resp = client.get(
        "/api/knowledge/search",
        params={"query": "FDA LD50 MTD 安全窗口", "domain": "devices", "top_k": 3},
    )
    assert search_resp.status_code == 200
    payload = search_resp.json()["data"]
    assert payload.get("reranked") is True
    results = payload.get("results", [])
    assert 0 < len(results) <= 3
    assert results[0].get("reranked") is True
    assert len(results[0].get("matched_terms", [])) > 0


def test_pdf_reference_stripping(client):
    body_and_refs = (
        "Results:\n"
        "The fluorescent probe achieved an excitation wavelength of 788 nm and a half-life of 2.6 h.\n\n"
        "References\n"
        "[1] Prior work reported an excitation wavelength of 950 nm and half-life of 99.0 h in unrelated dyes.\n"
    )
    resp = client.post(
        "/api/analyze-paper",
        headers={"X-Session-Id": "p2-ref-strip"},
        json={
            "title": "Tumor Imaging Probe Evaluation",
            "content": body_and_refs,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is True
    assert data["references_stripped"] is True
    assert data["state"]["excitation_wavelength"] == 788.0
    assert data["state"]["half_life"] == 2.6
    assert "950 nm" not in data["extracted_text"]


def test_scanned_pdf_fallback_handling(client):
    blank_pdf = _build_blank_pdf_bytes()
    b64 = base64.b64encode(blank_pdf).decode("ascii")
    resp = client.post(
        "/api/analyze-paper",
        headers={"X-Session-Id": "p2-scanned-pdf"},
        json={
            "title": "新型近红外荧光探针扫描版临床研究",
            "content": "",
            "filename": "scanned_probe.pdf",
            "file_base64": b64,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is True
    assert data["is_scanned_pdf"] is True
    assert data["state"]["domain"] == "devices"
    assert "扫描版 PDF" in data["extracted_text"]
