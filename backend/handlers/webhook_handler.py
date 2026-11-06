import hashlib
import hmac
import logging

from backend.models.pipeline_status import WebhookPayload
from backend.services.devlog_service import DevLogService

logger = logging.getLogger(__name__)


class WebhookHandler:
    def __init__(self):
        self.devlog_service = DevLogService()
        self._processed_ids: set[str] = set()
        self._max_processed_ids = 10000

    def _verify_signature(self, body: bytes, signature: str) -> bool:
        import os

        secret = os.getenv("CODEARTS_WEBHOOK_SECRET", "")
        if not secret:
            return True
        expected = hmac.new(
            secret.encode(), body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def handle_callback(self, body: bytes, signature: str | None) -> dict:
        if signature and not self._verify_signature(body, signature):
            return {"error": "unauthorized"}

        import json

        try:
            data = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            return {"error": "invalid_payload"}

        payload = WebhookPayload(**data)
        idempotency_key = f"{payload.pipeline_id}:{payload.started_at}"

        if idempotency_key in self._processed_ids:
            return {"status": "ok"}

        self.devlog_service.append_pipeline_record(
            pipeline_name=payload.pipeline_name,
            status=payload.status,
            artifact_url=payload.artifact_url,
            duration_sec=payload.duration_sec,
        )

        self._processed_ids.add(idempotency_key)
        if len(self._processed_ids) > self._max_processed_ids:
            oldest = next(iter(self._processed_ids))
            self._processed_ids.discard(oldest)

        return {"status": "ok"}
