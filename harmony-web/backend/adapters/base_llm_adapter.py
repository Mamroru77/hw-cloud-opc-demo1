from abc import ABC, abstractmethod
import json
from typing import AsyncGenerator, Optional
import httpx

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

    def _resolve_endpoint_and_headers(self, api_key: str) -> tuple[str, dict]:
        return self.api_endpoint, self._build_headers(api_key)

    async def stream_chat(
        self,
        api_key: str,
        system_prompt: str,
        messages: list,
        temperature: float = 0.3,
    ) -> AsyncGenerator[str, None]:
        endpoint, headers = self._resolve_endpoint_and_headers(api_key)
        payload = {**self._build_payload(system_prompt, messages, temperature), "stream": True}

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", endpoint, json=payload, headers=headers) as resp:
                    if resp.status_code != 200:
                        body_bytes = await resp.aread()
                        body_text = body_bytes.decode("utf-8", errors="ignore")[:500]
                        raise LLMException(
                            provider_id=self.provider_id,
                            status_code=resp.status_code,
                            message=body_text,
                        )

                    non_sse_lines: list[str] = []
                    yielded_any = False

                    async for raw_line in resp.aiter_lines():
                        line = raw_line.strip()
                        if not line or line.startswith(":"):
                            continue
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                            except json.JSONDecodeError:
                                continue
                            choices = chunk.get("choices") or []
                            if not choices:
                                continue
                            choice0 = choices[0]
                            delta_text = (
                                (choice0.get("delta") or {}).get("content")
                                or (choice0.get("message") or {}).get("content")
                                or ""
                            )
                            if delta_text:
                                yielded_any = True
                                yield delta_text
                        else:
                            non_sse_lines.append(line)

                    if not yielded_any and non_sse_lines:
                        joined = "\n".join(non_sse_lines)
                        data = json.loads(joined)
                        content = data["choices"][0]["message"]["content"]
                        if content:
                            yield content
        except LLMException:
            raise
        except Exception as exc:
            raise LLMException(
                provider_id=self.provider_id,
                status_code=0,
                message=str(exc),
            )
