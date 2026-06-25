import re
from typing import List, Dict
from pydantic import BaseModel


class SanitizeResult(BaseModel):
    original: str
    sanitized: str
    fields_sanitized: int
    rules_applied: List[str]
    is_safe_for_transmission: bool


SANITIZE_RULES: List[Dict] = [
    {"name": "患者ID", "pattern": re.compile(r"P\d{8}"), "replacement": "[已脱敏-患者ID]"},
    {"name": "医疗机构", "pattern": re.compile(r"北京协和医院|上海中山医院|华东地区三甲医院"), "replacement": "[已脱敏-医疗机构]"},
    {"name": "医师姓名", "pattern": re.compile(r"(主任医师|副主任医师|主治医师)\s*\S{2,4}"), "replacement": r"\1 [已脱敏-姓名]"},
    {"name": "电话号码", "pattern": re.compile(r"1[3-9]\d{9}"), "replacement": "[已脱敏-电话]"},
    {"name": "身份证号", "pattern": re.compile(r"\d{17}[\dXx]"), "replacement": "[已脱敏-身份证号]"},
    {"name": "患者姓名", "pattern": re.compile(r"患者[：:]\s*\S{2,4}"), "replacement": "患者：[已脱敏-姓名]"},
]


class NpuSanitizerService:
    def sanitize(self, text: str) -> SanitizeResult:
        sanitized = text
        rules_applied: List[str] = []
        fields_sanitized = 0

        for rule in SANITIZE_RULES:
            matches = rule["pattern"].findall(sanitized)
            if matches:
                count = len(matches)
                rules_applied.append(rule["name"])
                fields_sanitized += count
                sanitized = rule["pattern"].sub(rule["replacement"], sanitized)

        return SanitizeResult(
            original=text,
            sanitized=sanitized,
            fields_sanitized=fields_sanitized,
            rules_applied=rules_applied,
            is_safe_for_transmission=fields_sanitized == 0 or sanitized != text,
        )


npu_sanitizer_service = NpuSanitizerService()
