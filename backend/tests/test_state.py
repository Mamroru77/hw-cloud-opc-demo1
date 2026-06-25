from backend.models.schemas import SessionState


def test_get_state(client):
    response = client.get("/api/state")
    assert response.status_code == 200
    data = response.json()
    assert "domain" in data
    assert "paper_title" in data


def test_update_state(client, sample_state):
    response = client.post("/api/state", json=sample_state)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "devices"
    assert data["paper_title"] == sample_state["paper_title"]
    assert data["excitation_wavelength"] == 790.0

    get_response = client.get("/api/state")
    assert get_response.json()["domain"] == "devices"
