from backend.adapters.pangu_adapter import PanguAdapter
from backend.adapters.glm_adapter import GLMAdapter
from backend.services.model_router_service import FALLBACK_CHAIN, ModelRouterService


def test_models_benchmark(client):
    response = client.get("/api/models/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "data" in data
    assert len(data["data"]) > 0
    for item in data["data"]:
        assert "provider_id" in item
        assert "model_name" in item
        assert "avg_latency_ms" in item


def test_pangu_adapter_is_proxy_false():
    adapter = PanguAdapter()
    assert adapter.is_proxy is False


def test_glm_adapter_provider_id():
    adapter = GLMAdapter()
    assert adapter.provider_id == "glm"


def test_model_router_fallback_chain():
    assert FALLBACK_CHAIN == ["pangu", "deepseek", "openai", "glm", "gemini"]

    router = ModelRouterService()
    adapter_keys = list(router._adapters.keys())
    for provider in FALLBACK_CHAIN:
        assert provider in adapter_keys
