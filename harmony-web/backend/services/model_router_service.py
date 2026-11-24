import logging
import os
import time
from typing import AsyncGenerator, Optional

from backend.models.llm_models import LLMResponse, LLMException, AllModelsUnavailableException
from backend.adapters.base_llm_adapter import BaseLLMAdapter
from backend.adapters.pangu_adapter import PanguAdapter
from backend.adapters.deepseek_adapter import DeepSeekAdapter
from backend.adapters.openai_adapter import OpenAIAdapter
from backend.adapters.glm_adapter import GLMAdapter
from backend.adapters.gemini_adapter import GeminiAdapter
from backend.infra.db import record_model_metric

logger = logging.getLogger(__name__)

FALLBACK_CHAIN = ["pangu", "deepseek", "openai", "glm", "gemini"]

PROVIDER_KEYWORD_MAP: dict[str, list[str]] = {
    "pangu": ["pangu", "huawei", "华为", "盘古"],
    "deepseek": ["deepseek"],
    "openai": ["openai", "gpt"],
    "glm": ["glm", "zhipu", "智谱"],
    "gemini": ["gemini", "google", "openrouter"],
}

PROVIDER_ENV_KEY_MAP: dict[str, str] = {
    "pangu": "PANGU_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "openai": "OPENAI_API_KEY",
    "glm": "GLM_API_KEY",
    "gemini": "GEMINI_API_KEY",
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

    def resolve_provider(self, provider_str: Optional[str]) -> str:
        if not provider_str:
            return "deepseek"
        lower = provider_str.lower()
        for pid, keywords in PROVIDER_KEYWORD_MAP.items():
            for kw in keywords:
                if kw in lower:
                    return pid
        return "deepseek"

    def resolve_api_key(self, provider_id: str, client_api_key: Optional[str]) -> Optional[str]:
        if client_api_key and client_api_key.strip():
            return client_api_key.strip()
        env_var = PROVIDER_ENV_KEY_MAP.get(provider_id)
        if env_var:
            val = os.getenv(env_var, "").strip()
            if val:
                return val
        return None

    def has_any_available_key(self, preferred_provider: Optional[str], client_api_key: Optional[str]) -> bool:
        if client_api_key and client_api_key.strip():
            return True
        resolved = self.resolve_provider(preferred_provider)
        if self.resolve_api_key(resolved, None):
            return True
        return any(bool(os.getenv(env_var, "").strip()) for env_var in PROVIDER_ENV_KEY_MAP.values())

    def get_provider_env_status(self) -> dict[str, bool]:
        return {
            pid: bool(os.getenv(env_var, "").strip())
            for pid, env_var in PROVIDER_ENV_KEY_MAP.items()
        }

    async def route_chat(
        self,
        preferred_provider: Optional[str],
        api_key: Optional[str],
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> LLMResponse:
        resolved = self.resolve_provider(preferred_provider)
        errors: list[str] = []

        adapter = self._get_adapter(resolved)
        effective_key = self.resolve_api_key(resolved, api_key)
        if adapter and effective_key and adapter.validate_api_key(effective_key):
            try:
                response = await adapter.chat(effective_key, system_prompt, messages, temperature)
                try:
                    record_model_metric(
                        provider_id=response.provider_id,
                        model_name=response.model_name,
                        latency_ms=response.latency_ms,
                        input_tokens=response.input_tokens,
                        output_tokens=response.output_tokens,
                        success=True,
                    )
                except Exception:
                    pass
                return response
            except LLMException as exc:
                errors.append(f"{resolved}: {exc.message}")
                try:
                    record_model_metric(
                        provider_id=resolved,
                        model_name=adapter.model_id,
                        latency_ms=0.0,
                        success=False,
                    )
                except Exception:
                    pass
                logger.warning(
                    "Provider %s failed: %s, starting fallback chain",
                    resolved,
                    exc.message,
                )

        for provider_id in FALLBACK_CHAIN:
            if provider_id == resolved:
                continue
            fb_adapter = self._get_adapter(provider_id)
            fb_key = self.resolve_api_key(provider_id, api_key)
            if fb_adapter and fb_key and fb_adapter.validate_api_key(fb_key):
                try:
                    response = await fb_adapter.chat(fb_key, system_prompt, messages, temperature)
                    response.is_degraded = True
                    response.degraded_from = resolved
                    try:
                        record_model_metric(
                            provider_id=response.provider_id,
                            model_name=response.model_name,
                            latency_ms=response.latency_ms,
                            input_tokens=response.input_tokens,
                            output_tokens=response.output_tokens,
                            success=True,
                        )
                    except Exception:
                        pass
                    logger.info(
                        "Degraded from %s to %s",
                        resolved,
                        provider_id,
                    )
                    return response
                except LLMException as exc:
                    errors.append(f"{provider_id}: {exc.message}")
                    try:
                        record_model_metric(
                            provider_id=provider_id,
                            model_name=fb_adapter.model_id,
                            latency_ms=0.0,
                            success=False,
                        )
                    except Exception:
                        pass
                    continue

        detail = "; ".join(errors) if errors else "未提供匹配的 API Key 或前缀不合法"
        raise AllModelsUnavailableException(
            f"All models unavailable (preferred: {resolved}): {detail}"
        )

    async def route_chat_content(
        self,
        preferred_provider: Optional[str],
        api_key: Optional[str],
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> str:
        resp = await self.route_chat(preferred_provider, api_key, system_prompt, messages, temperature)
        return resp.content

    async def route_chat_stream(
        self,
        preferred_provider: Optional[str],
        api_key: Optional[str],
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> AsyncGenerator[tuple[str, dict], None]:
        resolved = self.resolve_provider(preferred_provider)
        candidates = [resolved] + [p for p in FALLBACK_CHAIN if p != resolved]
        errors: list[str] = []

        prompt_chars = len(system_prompt or "") + sum(len(str(m.get("content", ""))) for m in messages)
        est_input_tokens = max(1, prompt_chars // 3)

        for idx, provider_id in enumerate(candidates):
            adapter = self._get_adapter(provider_id)
            effective_key = self.resolve_api_key(provider_id, api_key)
            if not (adapter and effective_key and adapter.validate_api_key(effective_key)):
                continue

            start = time.monotonic()
            gen = adapter.stream_chat(effective_key, system_prompt, messages, temperature)
            try:
                first_chunk = await gen.__anext__()
            except StopAsyncIteration:
                first_chunk = ""
            except LLMException as exc:
                errors.append(f"{provider_id}: {exc.message}")
                try:
                    record_model_metric(
                        provider_id=provider_id,
                        model_name=adapter.model_id,
                        latency_ms=0.0,
                        success=False,
                    )
                except Exception:
                    pass
                logger.warning("Stream provider %s failed: %s, trying fallback", provider_id, exc.message)
                continue

            is_degraded = idx > 0
            meta = {
                "provider_id": provider_id,
                "model_name": adapter.model_id,
                "is_degraded": is_degraded,
                "degraded_from": resolved if is_degraded else None,
                "input_tokens": est_input_tokens,
                "output_tokens": 0,
                "latency_ms": 0.0,
            }

            output_chars = 0
            try:
                if first_chunk:
                    output_chars += len(first_chunk)
                    yield first_chunk, meta

                async for chunk in gen:
                    if chunk:
                        output_chars += len(chunk)
                        yield chunk, meta
            finally:
                elapsed = (time.monotonic() - start) * 1000
                est_output_tokens = max(1, output_chars // 3)
                meta["output_tokens"] = est_output_tokens
                meta["latency_ms"] = round(elapsed, 1)
                try:
                    record_model_metric(
                        provider_id=provider_id,
                        model_name=adapter.model_id,
                        latency_ms=elapsed,
                        input_tokens=est_input_tokens,
                        output_tokens=est_output_tokens,
                        success=True,
                    )
                except Exception:
                    pass
            return

        detail = "; ".join(errors) if errors else "未提供匹配的 API Key 或前缀不合法"
        raise AllModelsUnavailableException(
            f"All models unavailable for stream (preferred: {resolved}): {detail}"
        )
