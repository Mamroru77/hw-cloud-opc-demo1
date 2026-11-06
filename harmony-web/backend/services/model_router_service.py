import logging
from typing import Optional

from backend.models.llm_models import LLMResponse, LLMException, AllModelsUnavailableException
from backend.adapters.base_llm_adapter import BaseLLMAdapter
from backend.adapters.pangu_adapter import PanguAdapter
from backend.adapters.deepseek_adapter import DeepSeekAdapter
from backend.adapters.openai_adapter import OpenAIAdapter
from backend.adapters.glm_adapter import GLMAdapter
from backend.adapters.gemini_adapter import GeminiAdapter

logger = logging.getLogger(__name__)

FALLBACK_CHAIN = ["pangu", "deepseek", "openai", "glm", "gemini"]

PROVIDER_KEYWORD_MAP: dict[str, list[str]] = {
    "pangu": ["pangu", "huawei", "华为", "盘古"],
    "deepseek": ["deepseek"],
    "openai": ["openai", "gpt"],
    "glm": ["glm", "zhipu", "智谱"],
    "gemini": ["gemini", "google", "openrouter"],
}


class ModelRouterService:
    def __init__(self):
        self._adapters: dict[str, BaseLLMAdapter] = {
            "pangu": PanguAdapter(),
            "deepseek": DeepSeekAdapter(),
            "openai": OpenAIAdapter(),
            "glm": GLMAdapter(),
            "gemini": GeminiAdapter(),
        }

    def _get_adapter(self, provider_id: str) -> Optional[BaseLLMAdapter]:
        return self._adapters.get(provider_id)

    def resolve_provider(self, provider_str: str) -> str:
        if not provider_str:
            return "deepseek"
        lower = provider_str.lower()
        for pid, keywords in PROVIDER_KEYWORD_MAP.items():
            for kw in keywords:
                if kw in lower:
                    return pid
        return "deepseek"

    async def route_chat(
        self,
        preferred_provider: str,
        api_key: str,
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> LLMResponse:
        resolved = self.resolve_provider(preferred_provider)

        adapter = self._get_adapter(resolved)
        if adapter and adapter.validate_api_key(api_key):
            try:
                return await adapter.chat(api_key, system_prompt, messages, temperature)
            except LLMException as exc:
                logger.warning(
                    "Provider %s failed: %s, starting fallback chain",
                    resolved,
                    exc.message,
                )

        for provider_id in FALLBACK_CHAIN:
            if provider_id == resolved:
                continue
            fb_adapter = self._get_adapter(provider_id)
            if fb_adapter and fb_adapter.validate_api_key(api_key):
                try:
                    response = await fb_adapter.chat(api_key, system_prompt, messages, temperature)
                    response.is_degraded = True
                    response.degraded_from = resolved
                    logger.info(
                        "Degraded from %s to %s",
                        resolved,
                        provider_id,
                    )
                    return response
                except LLMException:
                    continue

        raise AllModelsUnavailableException(
            f"All models unavailable (preferred: {resolved})"
        )

    async def route_chat_content(
        self,
        preferred_provider: str,
        api_key: str,
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> str:
        resp = await self.route_chat(preferred_provider, api_key, system_prompt, messages, temperature)
        return resp.content
