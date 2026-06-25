import os
import logging
from typing import Optional

import httpx

from backend.models.pipeline_status import PipelineStatus

logger = logging.getLogger(__name__)


class CodeArtsPipelineAdapter:
    def __init__(self):
        self.base_url = os.getenv(
            "CODEARTS_PIPELINE_API_URL",
            "https://codearts-ext.cn-north-4.myhuaweicloud.com/v2/pipelines",
        )
        self.project_id = os.getenv("CODEARTS_PROJECT_ID", "")
        self.auth_token = os.getenv("CODEARTS_AUTH_TOKEN", "")

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "X-Auth-Token": self.auth_token,
        }

    async def get_latest_pipeline(self) -> Optional[dict]:
        if not self.auth_token:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.base_url}/{self.project_id}/runs",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
                runs = data.get("runs") or data.get("data") or []
                if runs:
                    return runs[0]
                return None
        except Exception as e:
            logger.warning(f"CodeArts Pipeline API unavailable: {e}")
            return None

    async def get_build_logs(self, limit: int = 10) -> list[dict]:
        if not self.auth_token:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.base_url}/{self.project_id}/runs",
                    params={"limit": limit},
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("runs") or data.get("data") or []
        except Exception as e:
            logger.warning(f"CodeArts Pipeline API unavailable: {e}")
            return []

    async def get_quality_report(self) -> Optional[dict]:
        insight_url = os.getenv(
            "CODEARTS_INSIGHT_API_URL",
            "https://codearts-ext.cn-north-4.myhuaweicloud.com/v2/insight",
        )
        if not self.auth_token:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{insight_url}/{self.project_id}/quality",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning(f"CodeArts Insight API unavailable: {e}")
            return None
