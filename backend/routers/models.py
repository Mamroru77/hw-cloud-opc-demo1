from fastapi import APIRouter

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


@router.get("/benchmark")
async def get_model_benchmark():
    import backend.main as main_mod

    model_router = getattr(main_mod.app.state, "model_router", None)
    if model_router is None:
        return {"status": "ok", "data": [b.model_dump() for b in FALLBACK_BENCHMARKS]}

    benchmarks = []
    for provider_id, adapter in model_router._adapters.items():
        existing = next(
            (b for b in FALLBACK_BENCHMARKS if b.provider_id == provider_id),
            None,
        )
        if existing:
            benchmarks.append(existing)
        else:
            benchmarks.append(
                ModelBenchmark(
                    provider_id=provider_id,
                    model_name=provider_id.title(),
                    avg_latency_ms=250,
                    avg_input_tokens=800,
                    avg_output_tokens=400,
                    accuracy_score=85.0,
                )
            )

    return {"status": "ok", "data": [b.model_dump() for b in benchmarks]}
