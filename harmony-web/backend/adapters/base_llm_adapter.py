from abc import ABC, abstractmethod
from typing import Optional

from backend.models.llm_models import LLMResponse, LLMException


class BaseLLMAdapter(ABC):
    provider_id: str = ""
    display_name: str = ""
    api_endpoint: str = ""
    model_id: str = ""
    is_proxy: bool = False
    fallback_provider_id: Optional[str] = None

    @abstractmethod
    async def chat(
        self,
        api_key: str,
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> LLMResponse:
        pass

    @abstractmethod
    def validate_api_key(self, api_key: str) -> bool:
        pass

    def _build_payload(self, system_prompt: str, messages: list, temperature: float) -> dict:
        return {
            "model": self.model_id,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "temperature": temperature,
        }

    def _build_headers(self, api_key: str) -> dict:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
