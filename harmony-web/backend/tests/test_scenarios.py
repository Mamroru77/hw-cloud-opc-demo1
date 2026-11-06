def test_match_scenarios_devices(client):
    response = client.get("/api/match-scenarios", params={"domain": "devices", "wavelength": 790.0, "department": "肝胆外科"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["query_domain"] == "devices"
    assert len(data["matches"]) > 0


def test_match_scenarios_drugs(client):
    response = client.get("/api/match-scenarios", params={"domain": "drugs", "department": "肿瘤内科"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["query_domain"] == "drugs"
    assert len(data["matches"]) > 0
    assert all("compatibility_score" in m for m in data["matches"])


def test_match_scenarios_ai(client):
    response = client.get("/api/match-scenarios", params={"domain": "ai", "department": "放射科"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["query_domain"] == "ai"
    assert len(data["matches"]) > 0


def test_match_scenarios_surgical(client):
    response = client.get("/api/match-scenarios", params={"domain": "surgical", "department": "普通外科"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["query_domain"] == "surgical"
    assert len(data["matches"]) > 0
