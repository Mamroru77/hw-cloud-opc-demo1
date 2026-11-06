import secrets
from datetime import datetime, timedelta, timezone


class DemoDataProvider:
    PIPELINE_NAME = "opc-translational-medicine-pipeline"
    DEMO_COMMIT_PREFIX = "demo-"
    DEMO_STAGES = [
        "前端构建",
        "后端测试",
        "安全检查",
        "构建Docker镜像",
        "推送镜像至SWR",
        "部署到CCE",
        "健康检查与回滚",
    ]
    DEMO_QUALITY_TECH_DEBT_SCORE = 72
    DEMO_QUALITY_CODE_DUPLICATION_RATE = 4.8

    def _generate_iso_time(self, offset_minutes: int) -> str:
        t = datetime.now(timezone.utc) + timedelta(minutes=offset_minutes)
        return t.strftime("%Y-%m-%dT%H:%M:%SZ")

    def _generate_commit_id(self) -> str:
        return f"{self.DEMO_COMMIT_PREFIX}{secrets.token_hex(6)}"

    def get_pipeline_status(self) -> dict:
        return {
            "pipeline_id": "demo-pipeline-run-001",
            "name": self.PIPELINE_NAME,
            "status": "success",
            "started_at": self._generate_iso_time(-5),
            "finished_at": self._generate_iso_time(-1),
            "trigger_type": "push",
            "commit_id": self._generate_commit_id(),
        }

    def get_build_logs(self) -> list[dict]:
        configs = [
            (-30, "push", "success"),
            (-55, "push", "failed"),
            (-120, "push", "success"),
            (0, "push", "running"),
            (-180, "schedule", "success"),
            (-240, "push", "success"),
            (-300, "webhook", "success"),
        ]
        logs = []
        for i, (offset, trigger, status) in enumerate(configs):
            start = self._generate_iso_time(offset - 4)
            end = self._generate_iso_time(offset) if status != "running" else None
            logs.append({
                "pipeline_id": f"demo-run-{i + 1:03d}",
                "name": self.PIPELINE_NAME,
                "status": status,
                "started_at": start,
                "finished_at": end,
                "trigger_type": trigger,
                "commit_id": self._generate_commit_id(),
            })
        return logs

    def get_quality_report(self) -> dict:
        now = datetime.now(timezone.utc)
        trend = []
        for i in range(7):
            d = now - timedelta(days=6 - i)
            counts = [12, 10, 9, 7, 5, 4, 3]
            trend.append({"date": d.strftime("%Y-%m-%d"), "count": counts[i]})
        return {
            "defect_trend": trend,
            "tech_debt_score": self.DEMO_QUALITY_TECH_DEBT_SCORE,
            "code_duplication_rate": self.DEMO_QUALITY_CODE_DUPLICATION_RATE,
        }
