from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel


class AuditLog(BaseModel):
    id: str
    action: str
    operator_id: str
    target_id: str
    before_content: Optional[str] = None
    after_content: Optional[str] = None
    timestamp: str = datetime.now(timezone.utc).isoformat()
