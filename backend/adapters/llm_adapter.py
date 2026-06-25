import urllib.request
import urllib.error
import json as _json
import warnings


warnings.warn(
    "call_llm_api is deprecated; use ModelRouterService instead",
    DeprecationWarning,
    stacklevel=2,
)


def call_llm_api(provider: str, api_key: str, system_prompt: str, messages: list) -> str:
    url = "https://api.deepseek.com/v1/chat/completions"
    model = "deepseek-chat"

    provider_str = provider or ""
    provider_lower = provider_str.lower()

    if "openai" in provider_lower:
        url = "https://api.openai.com/v1/chat/completions"
        model = "gpt-4o-mini"
    elif "deepseek" in provider_lower:
        url = "https://api.deepseek.com/v1/chat/completions"
        model = "deepseek-chat"
    elif "openrouter" in provider_lower:
        url = "https://openrouter.ai/api/v1/chat/completions"
        model = "google/gemini-2.5-flash"
    elif "gemini" in provider_lower:
        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        model = "gemini-1.5-flash"
    elif "pangu" in provider_lower or "huawei" in provider_lower:
        url = "https://api.deepseek.com/v1/chat/completions"
        model = "deepseek-chat"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
        ] + messages,
        "temperature": 0.3
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    req = urllib.request.Request(
        url,
        data=_json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = response.read().decode('utf-8')
            res_json = _json.loads(res_data)
            return res_json['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            err_json = _json.loads(err_msg)
            return f"大模型接口错误 (HTTP {e.code}): {err_json.get('error', {}).get('message', err_msg)}"
        except:
            return f"大模型接口错误 (HTTP {e.code}): {err_msg[:200]}"
    except Exception as e:
        return f"接口连接失败: {str(e)}"
