from fastapi import APIRouter

from backend.infra.db import get_aggregated_model_metrics
from backend.models.model_benchmark import ModelBenchmark

router = APIRouter(prefix="/api/models", tags=["models"])

FALLBACK_BENCHMARKS = [
    ModelBenchmark(
        provider_id="pangu",
        model_name="盘古大模型",
        avg_latency_ms=320,
        avg_input_tokens=850,
        avg_output_tokens=420,
        accuracy_score=88.5,
    ),
    ModelBenchmark(
        provider_id="deepseek",
        model_name="DeepSeek-V3",
        avg_latency_ms=180,
        avg_input_tokens=920,
        avg_output_tokens=380,
        accuracy_score=91.2,
    ),
    ModelBenchmark(
        provider_id="openai",
        model_name="GPT-4o",
        avg_latency_ms=450,
        avg_input_tokens=780,
        avg_output_tokens=510,
        accuracy_score=93.0,
    ),
    ModelBenchmark(
        provider_id="glm",
        model_name="GLM-4",
        avg_latency_ms=210,
        avg_input_tokens=890,
        avg_output_tokens=400,
        accuracy_score=89.8,
    ),
    ModelBenchmark(
        provider_id="gemini",
        model_name="Gemini Pro",
        avg_latency_ms=280,
        avg_input_tokens=860,
        avg_output_tokens=440,
        accuracy_score=90.5,
    ),
]


@router.get("/status")
async def get_model_provider_status():
    import backend.main as main_mod
    model_router = getattr(main_mod.app.state, "model_router", None)
    configured = model_router.get_provider_env_status() if model_router else {}
    return {
        "status": "ok",
        "server_configured_providers": configured,
        "has_server_key": any(configured.values()),
    }


@router.get("/benchmark")
async def get_model_benchmark():
    import backend.main as main_mod

    live_metrics = get_aggregated_model_metrics()
    model_router = getattr(main_mod.app.state, "model_router", None)
    provider_ids = (
        list(model_router._adapters.keys())
        if model_router is not None
        else [b.provider_id for b in FALLBACK_BENCHMARKS]
    )

    benchmarks = []
    for provider_id in provider_ids:
        existing = next(
            (b for b in FALLBACK_BENCHMARKS if b.provider_id == provider_id),
            None,
        )
        live = live_metrics.get(provider_id)
        if live and live.get("call_count", 0) > 0:
            item = ModelBenchmark(
                provider_id=provider_id,
                model_name=live["model_name"] or (existing.model_name if existing else provider_id.title()),
                avg_latency_ms=live["avg_latency_ms"],
                avg_input_tokens=live["avg_input_tokens"],
                avg_output_tokens=live["avg_output_tokens"],
                accuracy_score=live["success_rate"],
            ).model_dump()
            item["call_count"] = live["call_count"]
            item["is_live"] = True
            benchmarks.append(item)
        elif existing:
            item = existing.model_dump()
            item["call_count"] = 0
            item["is_live"] = False
            benchmarks.append(item)
        else:
            item = ModelBenchmark(
                provider_id=provider_id,
                model_name=provider_id.title(),
                avg_latency_ms=250,
                avg_input_tokens=800,
                avg_output_tokens=400,
                accuracy_score=85.0,
            ).model_dump()
            item["call_count"] = 0
            item["is_live"] = False
            benchmarks.append(item)

    return {"status": "ok", "data": benchmarks}
