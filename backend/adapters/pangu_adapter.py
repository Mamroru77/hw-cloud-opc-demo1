import time
import httpx

from backend.adapters.base_llm_adapter import BaseLLMAdapter
from backend.models.llm_models import LLMResponse, LLMException


class PanguAdapter(BaseLLMAdapter):
    provider_id = "pangu"
    display_name = "华为云盘古"
    api_endpoint = "https://infer-modelarts.cn-north-4.myhuawecloud.com/v1/infers"
    model_id = "pangu"
    is_proxy = False
    fallback_provider_id = "deepseek"

    def validate_api_key(self, api_key: str) -> bool:
        if not api_key:
            return False
        return api_key.startswith("hw-") or api_key.startswith("pangu-")

    async def chat(
        self,
        api_key: str,
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> LLMResponse:
        start = time.monotonic()

        if api_key.startswith("hw-"):
            endpoint = f"{self.api_endpoint}/pangu"
            headers = self._build_headers(api_key)
        elif api_key.startswith("pangu-"):
            endpoint = "https://modelarts.cn-north-4.myhuawecloud.com/v1/infers/pangu"
            headers = self._build_headers(api_key)
        else:
            raise LLMException(
                provider_id=self.provider_id,
                status_code=401,
                message="盘古模型需要 hw- 或 pangu- 前缀的API Key",
            )

        payload = self._build_payload(system_prompt, messages, temperature)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(endpoint, json=payload, headers=headers)
                elapsed = (time.monotonic() - start) * 1000

                if resp.status_code != 200:
                    raise LLMException(
                        provider_id=self.provider_id,
                        status_code=resp.status_code,
                        message=resp.text[:500],
                    )

                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})

                return LLMResponse(
                    content=content,
                    model_name=self.model_id,
                    provider_id=self.provider_id,
                    input_tokens=usage.get("prompt_tokens", 0),
                    output_tokens=usage.get("completion_tokens", 0),
                    latency_ms=elapsed,
                )
        except LLMException:
            raise
        except Exception as exc:
            raise LLMException(
                provider_id=self.provider_id,
                status_code=0,
                message=str(exc),
            )
