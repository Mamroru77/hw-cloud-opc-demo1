import os
from datetime import datetime
from pathlib import Path


class DevLogService:
    def __init__(self, devlog_path: str | None = None):
        if devlog_path is None:
            devlog_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "CodeArts_Agent_DevLog.md",
            )
        self.devlog_path = devlog_path

    def _status_icon(self, status: str) -> str:
        mapping = {
            "success": "✅",
            "failed": "❌",
            "running": "⏱️",
            "pending": "⏱️",
        }
        return mapping.get(status.lower(), "⏱️")

    def append_pipeline_record(
        self,
        pipeline_name: str,
        status: str,
        artifact_url: str,
        duration_sec: float,
    ) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        icon = self._status_icon(status)
        duration_str = f"{duration_sec:.1f}s"

        entry = (
            f"| {timestamp} | {pipeline_name} | {icon} {status} | {artifact_url} | {duration_str} |\n"
        )

        path = Path(self.devlog_path)
        if not path.exists():
            header = (
                "# CodeArts Agent DevLog\n\n"
                "| 时间 | 流水线 | 状态 | 构建产物 | 耗时 |\n"
                "|------|--------|------|----------|------|\n"
            )
            path.write_text(header, encoding="utf-8")

        with open(path, "a", encoding="utf-8") as f:
            f.write(entry)

        return entry.strip()
