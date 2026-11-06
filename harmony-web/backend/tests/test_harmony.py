def test_harmony_discover(client):
    response = client.post("/api/harmony/discover")
    assert response.status_code == 200
    data = response.json()
    assert "devices" in data
    assert "timestamp" in data
    assert len(data["devices"]) > 0
    assert data["devices"][0]["device_id"] == "harmony-tablet-001"


def test_harmony_sanitize(client):
    response = client.post("/api/harmony/sanitize", json={"text": "这是一段普通医疗文本，无需脱敏。"})
    assert response.status_code == 200
    data = response.json()
    assert data["original"] == "这是一段普通医疗文本，无需脱敏。"
    assert data["fields_sanitized"] == 0


def test_harmony_sanitize_patient_id(client):
    response = client.post("/api/harmony/sanitize", json={"text": "患者ID为P20230101，请关注。"})
    assert response.status_code == 200
    data = response.json()
    assert "[已脱敏-患者ID]" in data["sanitized"]
    assert "P20230101" not in data["sanitized"]
    assert data["fields_sanitized"] > 0


def test_harmony_sanitize_phone(client):
    response = client.post("/api/harmony/sanitize", json={"text": "联系电话13800138000"})
    assert response.status_code == 200
    data = response.json()
    assert "[已脱敏-电话]" in data["sanitized"]
    assert "13800138000" not in data["sanitized"]
    assert data["fields_sanitized"] > 0


def test_harmony_devices(client):
    response = client.get("/api/harmony/devices")
    assert response.status_code == 200
    data = response.json()
    assert "devices" in data
    assert "count" in data
