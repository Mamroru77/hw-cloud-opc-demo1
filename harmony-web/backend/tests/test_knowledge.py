def test_knowledge_stats(client):
    response = client.get("/api/knowledge/stats")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data


def test_knowledge_search(client):
    response = client.get("/api/knowledge/search", params={"query": "荧光探针"})
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data


def test_knowledge_search_with_domain(client):
    response = client.get("/api/knowledge/search", params={"query": "靶向药", "domain": "drugs"})
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
