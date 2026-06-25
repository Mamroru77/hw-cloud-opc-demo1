def test_cicd_pipeline_status(client):
    response = client.get("/api/cicd/pipeline/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_cicd_pipeline_logs(client):
    response = client.get("/api/cicd/pipeline/logs")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_cicd_insight_quality(client):
    response = client.get("/api/cicd/insight/quality")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_cicd_webhook(client):
    payload = {
        "pipeline_name": "test-pipeline",
        "status": "success",
        "artifact_url": "https://example.com/artifact.zip",
        "duration_sec": 120,
    }
    response = client.post("/api/cicd/webhook", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
