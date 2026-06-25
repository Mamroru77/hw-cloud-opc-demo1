from pydantic import BaseModel
from typing import Optional


class LLMResponse(BaseModel):
    content: str
    model_name: str
    provider_id: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    is_degraded: bool = False
    degraded_from: Optional[str] = None


class LLMException(Exception):
    def __init__(self, provider_id: str, status_code: int, message: str):
        self.provider_id = provider_id
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{provider_id}] HTTP {status_code}: {message}")


class AllModelsUnavailableException(Exception):
    def __init__(self, message: str = "All models unavailable"):
        self.message = message
        super().__init__(message)
