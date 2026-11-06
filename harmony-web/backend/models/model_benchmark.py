from pydantic import BaseModel
from typing import Optional


class ModelBenchmark(BaseModel):
    provider_id: str
    model_name: str
    avg_latency_ms: float
    avg_input_tokens: int
    avg_output_tokens: int
    accuracy_score: float
    task_type: str = "translational_medicine"
