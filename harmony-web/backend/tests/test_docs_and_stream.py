import json


def _parse_sse_events(raw_text: str) -> list[dict]:
    events = []
    for line in raw_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("data:"):
            payload = stripped[5:].strip()
            if payload and payload != "[DONE]":
                events.append(json.loads(payload))
    return events


def test_generate_docs_template_formatting(client, sample_state):
    state = {**sample_state, "financing_amount": 15.5}
    resp = client.post(
        "/api/generate-docs",
        json={"api_key": None, "provider": None, "state": state},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["doc_source"] == "template"
    assert "1550 万人民币" in data["business_plan"]
    assert "15.500" not in data["business_plan"]
    assert "0.50 mg/kg" in data["clinical_trial_protocol"]


def test_generate_docs_stream_sse(client, sample_state):
    resp = client.post(
        "/api/generate-docs/stream",
        json={"api_key": None, "provider": None, "state": sample_state},
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    events = _parse_sse_events(resp.text)
    event_types = [e.get("type") for e in events]
    assert "start" in event_types
    assert "clinical_delta" in event_types
    assert "bp_delta" in event_types
    assert "done" in event_types

    clinical_acc = "".join(e["delta"] for e in events if e.get("type") == "clinical_delta")
    bp_acc = "".join(e["delta"] for e in events if e.get("type") == "bp_delta")
    done_evt = next(e for e in events if e.get("type") == "done")

    assert clinical_acc == done_evt["clinical_trial_protocol"]
    assert bp_acc == done_evt["business_plan"]
    assert "一期临床试验设计方案草案" in clinical_acc


def test_chat_agent_stream_sse(client, sample_state):
    client.post(
        "/api/state",
        headers={"X-Session-Id": "test-sse-session"},
        json={**sample_state, "financing_amount": 15.0},
    )
    resp = client.post(
        "/api/chat-agent/stream",
        headers={"X-Session-Id": "test-sse-session"},
        json={
            "message": "把商业融资额度修改为 3000 万",
            "api_key": None,
            "provider": "DeepSeek",
            "system_prompt": None,
            "clinical_doc": "",
            "bp_doc": "",
            "history": [],
        },
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    events = _parse_sse_events(resp.text)
    state_evt = next(e for e in events if e.get("type") == "state")
    done_evt = next(e for e in events if e.get("type") == "done")
    delta_acc = "".join(e["delta"] for e in events if e.get("type") == "delta")

    assert state_evt["state_updated"] is True
    assert state_evt["current_state"]["financing_amount"] == 30.0
    assert done_evt["reply"] == delta_acc
    assert "3000 万元" in done_evt["reply"]
