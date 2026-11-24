import io
import json
import zipfile
from unittest.mock import AsyncMock, patch

from backend.models.llm_models import LLMResponse


def test_chat_open_vocab_and_relative_scaling(client):
    # Seed state to drugs domain with sample_size=20
    init_resp = client.get("/api/state", headers={"X-Session-Id": "p1-open-vocab"})
    assert init_resp.status_code == 200
    state = init_resp.json()
    state["domain"] = "drugs"
    state["sample_size"] = 20
    client.post("/api/state", headers={"X-Session-Id": "p1-open-vocab"}, json=state)

    resp = client.post(
        "/api/chat-agent",
        headers={"X-Session-Id": "p1-open-vocab"},
        json={
            "message": "把靶点改为 Claudin 18.2，适应症改为胰腺导管腺癌，样本量扩大 50%",
            "api_key": None,
            "provider": "DeepSeek",
            "system_prompt": None,
            "clinical_doc": "",
            "bp_doc": "",
            "history": [],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["state_updated"] is True
    updated_state = data["current_state"]
    assert updated_state["target"] == "Claudin 18.2"
    assert updated_state["indication"] == "胰腺导管腺癌"
    assert updated_state["sample_size"] == 30


def test_chat_llm_state_patch_extraction(client, sample_state):
    client.post(
        "/api/state",
        headers={"X-Session-Id": "p1-llm-patch"},
        json={**sample_state, "target": "KRAS-G12C", "sample_size": 20, "financing_amount": 15.0},
    )
    fake_llm_reply = (
        '<state_patch>{"target": "HER2-ADC", "sample_size": 48, "financing_amount": 35.0}</state_patch>\n'
        "已根据三期多中心统计学功效要求完成参数协同推演，建议将样本量提升至 48 例并同步调增融资预算。"
    )
    fake_resp = LLMResponse(
        content=fake_llm_reply,
        model_name="deepseek-chat",
        provider_id="deepseek",
        input_tokens=120,
        output_tokens=64,
        latency_ms=210.5,
    )

    with patch("backend.services.model_router_service.ModelRouterService.has_any_available_key", return_value=True), \
         patch("backend.services.model_router_service.ModelRouterService.route_chat", new=AsyncMock(return_value=fake_resp)):
        resp = client.post(
            "/api/chat-agent",
            headers={"X-Session-Id": "p1-llm-patch"},
            json={
                "message": "按统计功效重新估算样本量并同步融资预算",
                "api_key": "sk-mock-key-123456",
                "provider": "DeepSeek",
                "system_prompt": None,
                "clinical_doc": "",
                "bp_doc": "",
                "history": [],
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["state_updated"] is True
    assert data["chat_source"] == "llm_function_calling"
    assert "<state_patch>" not in data["reply"]
    assert "已完成参数协同推演" in data["reply"] or "参数协同推演" in data["reply"]
    assert data["current_state"]["target"] == "HER2-ADC"
    assert data["current_state"]["sample_size"] == 48
    assert data["current_state"]["financing_amount"] == 35.0


def test_analyze_paper_citations_grounding(client):
    multi_page_text = (
        "Introduction: Near-infrared fluorescent probes for surgical tumor navigation.\n\f"
        "Methods & Results:\n"
        "The probe demonstrated an optimal excitation wavelength of 795 nm and emission wavelength of 825 nm.\n"
        "Pharmacokinetic profiling revealed a plasma clearance half-life of 3.2 h in mouse models."
    )
    resp = client.post(
        "/api/analyze-paper",
        headers={"X-Session-Id": "p1-citations"},
        json={
            "title": "Novel NIR-II Probe for Liver Tumor Resection",
            "content": multi_page_text,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is True
    assert data["page_count"] == 2
    assert data["state"]["excitation_wavelength"] == 795.0
    assert data["state"]["half_life"] == 3.2

    citations = data.get("param_citations", {})
    assert "excitation_wavelength" in citations
    exc_cite = citations["excitation_wavelength"]
    assert exc_cite["page"] == 2
    assert exc_cite["source"] == "pdf_grounding"
    assert "795" in exc_cite["quote"]


def test_export_docx_endpoint(client):
    resp = client.post(
        "/api/docs/export-docx",
        json={
            "title": "临床试验设计方案草案",
            "domain": "devices",
            "filename": "protocol.docx",
            "content": "# 临床试验设计方案\n\n## 1. 研究目的\n- **产品名称**：FL-Probe-790\n1. 入组受试者 20 例。\n",
        },
    )
    assert resp.status_code == 200
    assert "wordprocessingml.document" in resp.headers.get("content-type", "")
    assert "attachment;" in resp.headers.get("content-disposition", "")

    with zipfile.ZipFile(io.BytesIO(resp.content), "r") as zf:
        names = set(zf.namelist())
        assert "[Content_Types].xml" in names
        assert "word/document.xml" in names
        assert "word/styles.xml" in names
        doc_xml = zf.read("word/document.xml").decode("utf-8")
        assert "临床试验设计方案" in doc_xml
        assert "FL-Probe-790" in doc_xml
