import json
import logging
import re
from typing import Callable, Optional

from backend.models.schemas import ChatMessage, SessionState

logger = logging.getLogger(__name__)

FIELD_META: dict[str, tuple[str, type, str]] = {
    "domain": ("转化领域", str, ""),
    "paper_title": ("论文标题", str, ""),
    "target_department": ("目标临床科室", str, ""),
    "financing_amount": ("商业融资金额", float, "百万元"),
    "clinical_trial_site": ("临床试验基地", str, ""),
    "phase_1_duration": ("试验周期", int, "个月"),
    "sample_size": ("样本规模", int, "例"),
    "excitation_wavelength": ("激发波长", float, "nm"),
    "emission_wavelength": ("发射波长", float, "nm"),
    "metabolic_cycle": ("完全代谢周期", float, "h"),
    "half_life": ("半衰期 T₁/₂", float, "h"),
    "ld50": ("半数致死量 LD₅₀", float, "mg/kg"),
    "mtd": ("最大耐受剂量 MTD", float, "mg/kg"),
    "target": ("治疗靶点", str, ""),
    "indication": ("目标适应症", str, ""),
    "drug_half_life": ("血浆消除半衰期", float, "h"),
    "dlt_dose": ("限制毒性剂量 DLT", float, "mg/m²"),
    "primary_endpoint": ("主要疗效终点", str, ""),
    "architecture": ("算法架构", str, ""),
    "modality": ("影像模态", str, ""),
    "accuracy": ("诊断精度 AUC", float, "%"),
    "latency": ("推理延迟", float, "ms"),
    "integration_standard": ("接入标准", str, ""),
    "anatomical_site": ("目标解剖部位", str, ""),
    "core_instruments": ("核心手术器械", str, ""),
    "learning_curve_cases": ("学习曲线例数", int, "例"),
    "safety_endpoint": ("临床安全终点", str, ""),
}

KNOWN_TARGETS = ["EGFR", "KRAS-G12C", "PD-L1", "HER2", "ALK", "Claudin 18.2", "VEGF", "BRAF"]
KNOWN_INDICATIONS = ["非小细胞肺癌", "肺腺癌", "胃癌", "结直肠癌", "乳腺癌", "胰腺导管腺癌", "胰腺癌", "肝细胞癌"]
KNOWN_ARCHS = ["3D-Unet+", "3D-Unet", "Med-Transformer", "Swin-UNETR", "nnU-Net"]
KNOWN_MODALITIES = ["MRI-T2WI", "MRI-T1ce", "CT-Chest", "PET-CT", "WSI病理切片"]
KNOWN_ANATOMICAL_SITES = ["胰腺十二指肠区", "肝脏切除区", "胃肠吻合区", "肺段切除区"]
KNOWN_INSTRUMENTS = ["腹腔镜能量切割闭合器", "超声能量手术刀", "吻合器", "双极电凝镊"]
KNOWN_SAFETY_ENDPOINTS = ["30天术后并发症率", "90天吻合口瘘率", "术后胆瘘/胰瘘发生率"]


def apply_state_patch(state: SessionState, patch: dict) -> tuple[bool, list[str]]:
    """Validate and apply partial updates across all 27 SessionState fields."""
    if not isinstance(patch, dict) or not patch:
        return False, []

    updated = False
    notes: list[str] = []
    explicit_emission = "emission_wavelength" in patch and patch["emission_wavelength"] is not None

    for key, raw_val in patch.items():
        if key not in FIELD_META or raw_val is None:
            continue
        label, expected_type, unit = FIELD_META[key]
        try:
            if expected_type is int:
                val = int(round(float(raw_val)))
                if val <= 0:
                    continue
            elif expected_type is float:
                val = round(float(raw_val), 2)
                if val <= 0:
                    continue
            else:
                val = str(raw_val).strip()
                if not val:
                    continue
        except (TypeError, ValueError):
            continue

        if key == "domain" and val not in ("devices", "drugs", "ai", "surgical"):
            continue

        old_val = getattr(state, key, None)
        if str(old_val) == str(val):
            continue

        setattr(state, key, val)
        updated = True
        if key == "financing_amount":
            notes.append(f"{label} → **{round(float(val) * 100)} 万元**")
        elif key == "excitation_wavelength" and not explicit_emission:
            state.emission_wavelength = round(float(val) + 30.0, 1)
            notes.append(f"{label} → **{val} nm**（发射波长同步为 **{state.emission_wavelength} nm**）")
        else:
            unit_suffix = f" {unit}" if unit else ""
            notes.append(f"{label} → **{val}{unit_suffix}**")

    return updated, notes


def _extract_and_apply_llm_patch(reply_text: str, state: SessionState) -> tuple[str, bool, list[str]]:
    """Parse <state_patch>{...}</state_patch> or ```tool_call ...``` emitted by LLM."""
    if not reply_text:
        return reply_text, False, []

    pattern = re.compile(
        r"<state_patch>\s*(\{.*?\})\s*</state_patch>|```(?:tool_call|state_patch)\s*(\{.*?\})\s*```",
        re.DOTALL | re.IGNORECASE,
    )
    patch_applied = False
    all_notes: list[str] = []

    def _consume(match: re.Match) -> str:
        nonlocal patch_applied
        raw_json = match.group(1) or match.group(2) or ""
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict) and isinstance(parsed.get("arguments"), dict):
                parsed = parsed["arguments"]
            changed, notes = apply_state_patch(state, parsed)
            if changed:
                patch_applied = True
                all_notes.extend(notes)
        except Exception as exc:
            logger.debug("Failed to parse LLM state_patch JSON: %s", exc)
        return ""

    cleaned = pattern.sub(_consume, reply_text).strip()
    return cleaned, patch_applied, all_notes


def _handle_model_query(payload: ChatMessage, state: SessionState) -> dict:
    from backend.services.model_router_service import PROVIDER_KEYWORD_MAP

    active_provider = payload.provider or "DeepSeek"
    resolved = "deepseek"

    lower = active_provider.lower()
    for pid, keywords in PROVIDER_KEYWORD_MAP.items():
        for kw in keywords:
            if kw in lower:
                resolved = pid
                break

    model_names = {
        "pangu": "华为云盘古大模型",
        "deepseek": "deepseek-chat (DeepSeek-V3/R1)",
        "openai": "gpt-4o-mini",
        "glm": "glm-4-flash (智谱GLM)",
        "gemini": "gemini-1.5-flash",
    }
    active_model = model_names.get(resolved, "未知模型")

    has_key = "已配置" if payload.api_key else "未配置"
    key_preview = f" (密钥预览: {payload.api_key[:8]}...)" if payload.api_key else ""

    reply = (
        "我是\u201c医算子\u201d\u2014\u2014\u201c云脉\u201d智慧医疗多智能体系统的交互顾问。\n\n"
        f"根据系统当前的云端对接与参数状态，大模型供应商及底座模型具体信息如下：\n"
        f"- **当前选择的模型供应商**: `{active_provider}`\n"
        f"- **当前匹配的底座模型版本**: `{active_model}`\n"
        f"- **API Key 状态**: `{has_key}`{key_preview}\n\n"
        "在当前模式下，我将通过此底座模型与云端的\u201c技术理解\u201d、\u201c场景匹配\u201d、\u201c执行输出\u201d智能体进行联动，"
        "为您解析文献指标参数、匹配临床场景设备，并自动输出标准化临床方案与商业融资计划书。如有任何参数或合规调整需求，请直接向我下达指令。"
    )
    return {
        "reply": reply,
        "state_updated": False,
        "current_state": state,
    }


def _apply_numeric_clause(
    clause: str,
    keywords: list[str],
    current_val: float,
    is_int: bool = False,
    percent_when_small: bool = False,
) -> Optional[float]:
    if not any(kw in clause.lower() for kw in keywords):
        return None

    if "翻倍" in clause or "加倍" in clause:
        new_val = current_val * 2.0
        return float(max(1, round(new_val))) if is_int else round(new_val, 2)

    if "减半" in clause:
        new_val = current_val * 0.5
        return float(max(1, round(new_val))) if is_int else round(max(0.01, new_val), 2)

    pct_up = re.search(r"(?:扩大|增加|提高|提升|上调|延长|放大|增长)\s*(\d+(?:\.\d+)?)\s*%", clause)
    if pct_up:
        pct = float(pct_up.group(1)) / 100.0
        new_val = current_val * (1.0 + pct)
        return float(max(1, round(new_val))) if is_int else round(new_val, 2)

    pct_down = re.search(r"(?:缩小|减少|降低|压低|下降|缩短|下调)\s*(\d+(?:\.\d+)?)\s*%", clause)
    if pct_down:
        pct = float(pct_down.group(1)) / 100.0
        new_val = max(0.01, current_val * max(0.05, 1.0 - pct))
        return float(max(1, round(new_val))) if is_int else round(new_val, 2)

    delta_up = re.search(r"(?:增加|加上|扩大|延长|提高|提升)\s*(\d+(?:\.\d+)?)(?!\s*%)", clause)
    if delta_up and not re.search(r"(?:改为|设为|调整为|变更为|设定为|提高到|提升至|降低到|降至|设为)", clause):
        new_val = current_val + float(delta_up.group(1))
        return float(max(1, round(new_val))) if is_int else round(new_val, 2)

    delta_down = re.search(r"(?:减少|减去|缩短|降低)\s*(\d+(?:\.\d+)?)(?!\s*%)", clause)
    if delta_down and not re.search(r"(?:改为|设为|调整为|变更为|设定为|提高到|提升至|降低到|降至)", clause):
        new_val = max(1.0 if is_int else 0.1, current_val - float(delta_down.group(1)))
        return float(max(1, round(new_val))) if is_int else round(new_val, 2)

    nums = re.findall(r"\d+(?:\.\d+)?", clause)
    if nums:
        val = float(nums[-1])
        if percent_when_small and val <= 1.0:
            val *= 100.0
        return float(max(1, round(val))) if is_int else round(val, 2)
    return None


def _parse_single_clause(clause: str, state: SessionState, patch: dict) -> None:
    lower = clause.lower()

    # 1. Target department
    if any(kw in lower for kw in ["科室", "部门", "外科", "放射科", "肿瘤内"]):
        dept_aliases = [
            (["脑", "神经"], "脑外科/神经外科"),
            (["泌尿"], "泌尿外科"),
            (["肝"], "肝胆外科"),
            (["放射"], "放射科"),
            (["肿瘤内", "内科"], "肿瘤内科"),
            (["普通外科", "普外"], "普通外科"),
            (["胸外"], "胸外科"),
            (["妇科"], "妇科"),
            (["胃肠"], "胃肠外科"),
        ]
        matched_dept = None
        for keys, canonical in dept_aliases:
            if any(k in lower for k in keys):
                matched_dept = canonical
                break
        if not matched_dept:
            m = re.search(r"(?:目标科室|就诊科室|科室|部门)\s*(?:改为|设为|调整为|变更为|换为|是|：|:)\s*([^\s，,。；;]{2,16})", clause)
            if m:
                matched_dept = m.group(1).strip()
        if matched_dept:
            patch["target_department"] = matched_dept

    # 2. Financing amount
    if any(kw in lower for kw in ["融资", "钱", "金额", "额度", "经费", "预算"]):
        if "翻倍" in lower or "加倍" in lower:
            patch["financing_amount"] = round(state.financing_amount * 2.0, 2)
        elif "减半" in lower:
            patch["financing_amount"] = round(max(0.5, state.financing_amount * 0.5), 2)
        else:
            scaled = _apply_numeric_clause(clause, ["融资", "金额", "额度", "经费", "预算"], state.financing_amount)
            nums = re.findall(r"\d+(?:\.\d+)?", lower)
            if "%" in lower and scaled is not None:
                patch["financing_amount"] = scaled
            elif nums:
                val = float(nums[-1])
                if "千万" in lower:
                    patch["financing_amount"] = round(val * 10.0, 2)
                elif "万" in lower:
                    patch["financing_amount"] = round(val / 100.0, 2)
                elif "亿" in lower:
                    patch["financing_amount"] = round(val * 100.0, 2)
                else:
                    patch["financing_amount"] = round(val, 2)

    # 3. Clinical trial site
    if any(kw in lower for kw in ["医院", "基地", "中心", "协和", "中山", "临床点"]):
        if "华北" in lower or "北京协和" in lower or ("协和" in lower and "武汉" not in lower):
            patch["clinical_trial_site"] = "北京协和医院(GCP基地)"
        elif "华东" in lower or "上海中山" in lower or "中山医院" in lower:
            patch["clinical_trial_site"] = "华东地区三甲医院(上海中山医院等)"
        elif "华南" in lower or "广州" in lower or "中山大学" in lower:
            patch["clinical_trial_site"] = "华南地区三甲医院(中山大学附属医院等)"
        else:
            m = re.search(
                r"(?:临床试验基地|临床基地|试验基地|医院|基地|中心)\s*(?:改为|设为|调整为|变更为|换到|到|至|是|：|:)\s*([^\s，,。；;]{2,28})",
                clause,
            )
            if m:
                patch["clinical_trial_site"] = m.group(1).strip()

    # 4. Universal sample_size and phase_1_duration
    if any(kw in lower for kw in ["样本", "受试者", "入组", "患者数", "队列规模"]):
        new_ss = _apply_numeric_clause(
            clause, ["样本", "受试者", "入组", "患者数", "队列规模"], float(state.sample_size), is_int=True
        )
        if new_ss is not None:
            patch["sample_size"] = int(new_ss)

    if any(kw in lower for kw in ["周期", "月数", "试验时长", "研究周期"]):
        new_dur = _apply_numeric_clause(
            clause, ["周期", "月数", "试验时长", "研究周期"], float(state.phase_1_duration), is_int=True
        )
        if new_dur is not None:
            patch["phase_1_duration"] = int(new_dur)

    # 5. Domain-specific fields (open-vocabulary + numeric)
    if "靶点" in lower or "target" in lower:
        matched_t = None
        for t in KNOWN_TARGETS:
            if t.lower() in lower:
                matched_t = t
                break
        if not matched_t:
            m = re.search(
                r"(?:治疗靶点|新药靶点|靶点|target)\s*(?:改为|设为|调整为|变更为|换为|更换为|是|：|:)\s*([A-Za-z0-9_\-\.\u4e00-\u9fa5][A-Za-z0-9_\-\.\s\u4e00-\u9fa5]{1,28})",
                clause,
                re.IGNORECASE,
            )
            if m:
                matched_t = m.group(1).strip(" 。，,;；")
        if matched_t:
            patch["target"] = matched_t

    if any(kw in lower for kw in ["适应症", "针对疾病", "瘤种", "癌"]):
        matched_ind = None
        m = re.search(
            r"(?:目标适应症|适应症|针对疾病|瘤种)\s*(?:改为|设为|调整为|变更为|换为|更换为|是|：|:)\s*([^\s，,。；;]{2,24})",
            clause,
        )
        if m:
            matched_ind = m.group(1).strip()
        else:
            for ind in KNOWN_INDICATIONS:
                if ind in clause:
                    matched_ind = ind
                    break
        if matched_ind:
            patch["indication"] = matched_ind

    if "半衰期" in lower or "消除" in lower:
        if state.domain == "drugs" or "血浆" in lower or "新药" in lower or "药物" in lower:
            new_hl = _apply_numeric_clause(clause, ["半衰期", "消除"], state.drug_half_life)
            if new_hl is not None:
                patch["drug_half_life"] = new_hl
        else:
            new_hl = _apply_numeric_clause(clause, ["半衰期", "消除"], state.half_life)
            if new_hl is not None:
                patch["half_life"] = new_hl

    if "限制毒性" in lower or "dlt" in lower:
        new_dlt = _apply_numeric_clause(clause, ["限制毒性", "dlt"], state.dlt_dose)
        if new_dlt is not None:
            patch["dlt_dose"] = new_dlt

    if "终点" in lower or "endpoint" in lower:
        if "安全" in lower:
            matched_ep = None
            for ep in KNOWN_SAFETY_ENDPOINTS:
                if ep in clause:
                    matched_ep = ep
                    break
            if not matched_ep:
                m = re.search(r"(?:安全终点|安全随访终点|终点)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,24})", clause)
                if m:
                    matched_ep = m.group(1).strip()
            if matched_ep:
                patch["safety_endpoint"] = matched_ep
        else:
            matched_ep = None
            for ep in ["PFS (无进展生存期)", "ORR (客观缓解率)", "OS (总生存期)"]:
                if ep.lower() in lower or ep.split(" ")[0].lower() in lower:
                    matched_ep = ep
                    break
            if not matched_ep:
                m = re.search(r"(?:主要疗效终点|疗效终点|终点|endpoint)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,24})", clause, re.IGNORECASE)
                if m:
                    matched_ep = m.group(1).strip()
            if matched_ep:
                patch["primary_endpoint"] = matched_ep

    if any(kw in lower for kw in ["准确", "精度", "auc", "accuracy"]):
        new_acc = _apply_numeric_clause(clause, ["准确", "精度", "auc", "accuracy"], state.accuracy, percent_when_small=True)
        if new_acc is not None:
            patch["accuracy"] = min(100.0, new_acc)

    if any(kw in lower for kw in ["延迟", "时延", "latency", "ms"]):
        new_lat = _apply_numeric_clause(clause, ["延迟", "时延", "latency", "ms"], state.latency)
        if new_lat is not None:
            patch["latency"] = new_lat

    if any(kw in lower for kw in ["架构", "神经网络", "网络模型"]):
        matched_arch = None
        for arch in KNOWN_ARCHS:
            if arch.lower() in lower:
                matched_arch = arch
                break
        if not matched_arch:
            m = re.search(r"(?:架构|神经网络|模型)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([A-Za-z0-9_\-\.]{2,24})", clause)
            if m:
                matched_arch = m.group(1).strip()
        if matched_arch:
            patch["architecture"] = matched_arch

    if any(kw in lower for kw in ["模态", "影像模态", "图像模态"]):
        matched_mod = None
        for mod in KNOWN_MODALITIES:
            if mod.lower() in lower:
                matched_mod = mod
                break
        if not matched_mod:
            m = re.search(r"(?:影像模态|模态)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([A-Za-z0-9_\-\u4e00-\u9fa5]{2,20})", clause)
            if m:
                matched_mod = m.group(1).strip()
        if matched_mod:
            patch["modality"] = matched_mod

    if any(kw in lower for kw in ["学习曲线", "带教例数", "例数"]):
        new_cases = _apply_numeric_clause(clause, ["学习曲线", "带教例数", "例数"], float(state.learning_curve_cases), is_int=True)
        if new_cases is not None:
            patch["learning_curve_cases"] = int(new_cases)

    if any(kw in lower for kw in ["部位", "解剖"]):
        matched_site = None
        for site in KNOWN_ANATOMICAL_SITES:
            if site in clause:
                matched_site = site
                break
        if not matched_site:
            m = re.search(r"(?:解剖部位|手术部位|部位)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,20})", clause)
            if m:
                matched_site = m.group(1).strip()
        if matched_site:
            patch["anatomical_site"] = matched_site

    if any(kw in lower for kw in ["手术器械", "核心器械", "器械"]):
        matched_inst = None
        for inst in KNOWN_INSTRUMENTS:
            if inst in clause:
                matched_inst = inst
                break
        if not matched_inst:
            m = re.search(r"(?:核心器械|手术器械|器械)\s*(?:改为|设为|调整为|变更为|是|：|:)\s*([^\s，,。；;]{2,24})", clause)
            if m:
                matched_inst = m.group(1).strip()
        if matched_inst:
            patch["core_instruments"] = matched_inst

    if any(kw in lower for kw in ["激发波长", "波长"]):
        new_exc = _apply_numeric_clause(clause, ["激发波长", "波长"], state.excitation_wavelength)
        if new_exc is not None and 400 <= new_exc <= 1800:
            patch["excitation_wavelength"] = new_exc

    if "发射波长" in lower:
        new_emi = _apply_numeric_clause(clause, ["发射波长"], state.emission_wavelength)
        if new_emi is not None and 400 <= new_emi <= 2000:
            patch["emission_wavelength"] = new_emi

    if any(kw in lower for kw in ["代谢周期", "清除时间"]):
        new_mc = _apply_numeric_clause(clause, ["代谢周期", "清除时间"], state.metabolic_cycle)
        if new_mc is not None:
            patch["metabolic_cycle"] = new_mc

    if "ld50" in lower or "半数致死量" in lower:
        new_ld50 = _apply_numeric_clause(clause, ["ld50", "半数致死量"], state.ld50)
        if new_ld50 is not None:
            patch["ld50"] = new_ld50

    if "mtd" in lower or "最大耐受剂量" in lower:
        new_mtd = _apply_numeric_clause(clause, ["mtd", "最大耐受剂量"], state.mtd)
        if new_mtd is not None:
            patch["mtd"] = new_mtd


def _parse_intent_and_update(raw_msg: str, state: SessionState) -> tuple[bool, str]:
    """Parse single or compound parameter update commands across all 27 fields."""
    clauses = [c.strip() for c in re.split(r"[，,。；;\n]+|(?:\s+同时\s*|\s+并且\s*|\s+并\s+)", raw_msg) if c.strip()]
    if not clauses:
        clauses = [raw_msg]

    patch: dict = {}
    for clause in clauses:
        _parse_single_clause(clause, state, patch)

    updated, notes = apply_state_patch(state, patch)
    if not updated:
        return False, ""

    summary = "已同步更新以下转化参数：\n" + "\n".join(f"- {note}" for note in notes)
    summary += "\n\n下游场景匹配权重、动力学曲线与临床/商业文档已同步刷新。"
    return True, summary


def _build_state_context(state: SessionState, clinical_doc_text: str, bp_doc_text: str) -> str:
    state_context = f"\n[当前系统转化医学细分领域]: {state.domain}\n"
    state_context += "[当前系统通用物理、药理或算法参数]:\n"
    state_context += f"- 目标科室: {state.target_department}\n"
    state_context += f"- 临床试验基地: {state.clinical_trial_site}\n"
    state_context += f"- 商业融资金额: {state.financing_amount * 100:.0f} 万元人民币 (financing_amount={state.financing_amount} 百万元)\n"
    state_context += f"- 受试者样本规模: {state.sample_size} 例 (sample_size)\n"
    state_context += f"- 试验周期: {state.phase_1_duration} 个月 (phase_1_duration)\n"

    if state.domain == "devices":
        state_context += (
            f"- 靶向探针激发波长 (excitation_wavelength): {state.excitation_wavelength} nm\n"
            f"- 靶向探针发射波长 (emission_wavelength): {state.emission_wavelength} nm\n"
            f"- 半衰期 (half_life): {state.half_life} 小时\n"
            f"- 完全代谢周期 (metabolic_cycle): {state.metabolic_cycle} 小时\n"
            f"- LD50 (ld50): {state.ld50} mg/kg\n"
            f"- MTD (mtd): {state.mtd} mg/kg\n"
        )
    elif state.domain == "drugs":
        state_context += (
            f"- 治疗靶点 (target): {state.target}\n"
            f"- 目标适应症 (indication): {state.indication}\n"
            f"- 血浆消除半衰期 (drug_half_life): {state.drug_half_life} 小时\n"
            f"- 限制毒性剂量 DLT (dlt_dose): {state.dlt_dose} mg/m²\n"
            f"- 主要疗效终点 (primary_endpoint): {state.primary_endpoint}\n"
        )
    elif state.domain == "ai":
        state_context += (
            f"- 算法架构 (architecture): {state.architecture}\n"
            f"- 影像模态 (modality): {state.modality}\n"
            f"- 模型诊断精度 (accuracy): {state.accuracy}%\n"
            f"- 推理延迟 (latency): {state.latency} ms\n"
            f"- 系统接入标准 (integration_standard): {state.integration_standard}\n"
        )
    elif state.domain == "surgical":
        state_context += (
            f"- 手术部位 (anatomical_site): {state.anatomical_site}\n"
            f"- 核心器械配置 (core_instruments): {state.core_instruments}\n"
            f"- 学习曲线例数 (learning_curve_cases): {state.learning_curve_cases} 例\n"
            f"- 安全随访指标 (safety_endpoint): {state.safety_endpoint}\n"
        )

    state_context += (
        "\n[工具调用协议 update_translational_params]:\n"
        "当且仅当用户要求修改、调整、缩放或推算新参数时，请在正式回复最开头输出一行 XML 包裹的 JSON 补丁：\n"
        "<state_patch>{\"字段名\": 新值}</state_patch>\n"
        "可用字段包括: target_department, financing_amount(百万元), clinical_trial_site, phase_1_duration, sample_size, "
        "excitation_wavelength, emission_wavelength, half_life, metabolic_cycle, ld50, mtd, "
        "target, indication, drug_half_life, dlt_dose, primary_endpoint, "
        "architecture, modality, accuracy, latency, integration_standard, "
        "anatomical_site, core_instruments, learning_curve_cases, safety_endpoint。\n"
        "若仅为咨询问答无需改写参数，请勿输出 <state_patch> 标签。\n"
    )

    if clinical_doc_text:
        state_context += f"\n[当前一期临床试验设计方案/临床验证规范草案关键文本]:\n{clinical_doc_text[:1000]}\n"
    if bp_doc_text:
        state_context += f"\n[当前商业融资计划书/商业化白皮书关键文本]:\n{bp_doc_text[:1000]}\n"

    return state_context


async def chat_agent_service(payload: ChatMessage, state: SessionState) -> dict:
    from backend.services.model_router_service import ModelRouterService
    from backend.models.llm_models import AllModelsUnavailableException

    msg = payload.message.lower()
    token_info = {}

    if any(kw in msg for kw in ["模型", "版本", "供应商", "model", "version", "底座", "服务商", "提供商", "厂商"]):
        return _handle_model_query(payload, state)

    updated, param_updated_msg = _parse_intent_and_update(payload.message, state)

    clinical_doc_text = payload.clinical_doc or ""
    bp_doc_text = payload.bp_doc or ""

    state_context = _build_state_context(state, clinical_doc_text, bp_doc_text)
    full_system_prompt = (payload.system_prompt or "作为智慧医疗多智能体系统协同助手\u201c医算子\u201d做出答复。") + "\n" + state_context

    router = ModelRouterService()
    if router.has_any_available_key(payload.provider, payload.api_key):
        api_messages = [
            {"role": h.get("role", "user"), "content": h.get("content", "")}
            for h in payload.history
        ]
        api_messages.append({"role": "user", "content": payload.message})

        if updated:
            api_messages[-1]["content"] += f"\n(注: 本地规则引擎已先期应用修改: {param_updated_msg})"

        try:
            llm_response = await router.route_chat(
                payload.provider,
                payload.api_key,
                full_system_prompt,
                api_messages,
            )
            cleaned_reply, patch_applied, _ = _extract_and_apply_llm_patch(llm_response.content, state)
            updated = updated or patch_applied
            reply = cleaned_reply or param_updated_msg
            token_info = {
                "input_tokens": llm_response.input_tokens,
                "output_tokens": llm_response.output_tokens,
                "latency_ms": round(llm_response.latency_ms, 1),
                "model_name": llm_response.model_name,
                "provider_id": llm_response.provider_id,
                "chat_source": "llm_function_calling" if patch_applied else "llm",
            }
        except AllModelsUnavailableException as exc:
            reply = (
                f"{param_updated_msg}\n\n（注：外部大模型暂不可用：{exc}，已使用本地规则引擎完成参数同步。）"
                if updated
                else f"所有模型服务暂不可用，请检查 API Key 或网络后重试。（详情：{exc}）"
            )
            token_info = {"chat_source": "local_fallback"}
        except Exception as exc:
            reply = (
                f"{param_updated_msg}\n\n（注：大模型调用异常：{exc}）"
                if updated
                else f"大模型调用失败，请稍后重试。（详情：{exc}）"
            )
            token_info = {"chat_source": "local_fallback"}
    else:
        if updated:
            reply = param_updated_msg
            token_info = {"chat_source": "local_rule"}
        else:
            reply = (
                "您好！我是\u201c云脉\u201d系统的多智能体协同助手\u2014\u2014\u201c医算子\u201d。检测到您当前未输入 API Key 或处于 Demo 模式。\n\n"
                "在离线模式下，我支持全字段参数调整与相对缩放指令，例如：\n"
                "1. 📂 **复合参数调整**：'把靶点改为 Claudin 18.2，适应症改为胰腺导管腺癌，样本量扩大 50%'\n"
                "2. 💰 **融资与基地变更**：'把商业融资额度修改为 3000 万，临床基地改为北京协和医院'\n"
                "3. 🔬 **指标精算微调**：'将算法准确率提高到 95%，推理时延降低 20%'\n"
                "4. 🏥 **术式与探针参数**：'激发波长设为 800nm，学习曲线例数改为 15 例'\n\n"
                "配置大模型 API Key 后，还可解锁任意语义推演与多步临床参数工具调用（Function Calling）。"
            )
            token_info = {"chat_source": "local_rule"}

    result = {
        "reply": reply,
        "state_updated": updated,
        "current_state": state,
    }
    if token_info:
        result.update(token_info)
    return result


async def chat_agent_stream_service(
    payload: ChatMessage,
    state: SessionState,
    on_state_saved: Optional[Callable[[SessionState], None]] = None,
):
    from backend.services.model_router_service import ModelRouterService
    from backend.models.llm_models import AllModelsUnavailableException

    msg = payload.message.lower()

    if any(kw in msg for kw in ["模型", "版本", "供应商", "model", "version", "底座", "服务商", "提供商", "厂商"]):
        info = _handle_model_query(payload, state)
        reply = info["reply"]
        yield {"type": "state", "state_updated": False, "current_state": state.model_dump()}
        yield {"type": "delta", "delta": reply}
        yield {
            "type": "done",
            "reply": reply,
            "state_updated": False,
            "current_state": state.model_dump(),
            "chat_source": "local_rule",
        }
        return

    updated, param_updated_msg = _parse_intent_and_update(payload.message, state)
    if updated and on_state_saved:
        on_state_saved(state)

    yield {"type": "state", "state_updated": updated, "current_state": state.model_dump()}

    clinical_doc_text = payload.clinical_doc or ""
    bp_doc_text = payload.bp_doc or ""
    state_context = _build_state_context(state, clinical_doc_text, bp_doc_text)
    full_system_prompt = (
        payload.system_prompt or "作为智慧医疗多智能体系统协同助手\u201c医算子\u201d做出答复。"
    ) + "\n" + state_context

    router = ModelRouterService()
    if router.has_any_available_key(payload.provider, payload.api_key):
        api_messages = [
            {"role": h.get("role", "user"), "content": h.get("content", "")}
            for h in payload.history
        ]
        api_messages.append({"role": "user", "content": payload.message})
        if updated:
            api_messages[-1]["content"] += f"\n(注: 本地规则引擎已先期应用修改: {param_updated_msg})"

        raw_chunks: list[str] = []
        emitted_chunks: list[str] = []
        stream_meta: dict = {}
        tag_buffer = ""
        header_resolved = False
        patch_applied = False

        try:
            async for delta, meta in router.route_chat_stream(
                payload.provider,
                payload.api_key,
                full_system_prompt,
                api_messages,
            ):
                stream_meta = meta
                raw_chunks.append(delta)

                if not header_resolved:
                    tag_buffer += delta
                    stripped = tag_buffer.lstrip()
                    if not stripped:
                        continue
                    if stripped.startswith("<state_patch>") or stripped.startswith("```tool_call") or stripped.startswith("```state_patch"):
                        if "</state_patch>" in tag_buffer or (
                            stripped.startswith("```") and tag_buffer.count("```") >= 2
                        ):
                            cleaned_head, did_patch, _ = _extract_and_apply_llm_patch(tag_buffer, state)
                            header_resolved = True
                            if did_patch:
                                patch_applied = True
                                updated = True
                                if on_state_saved:
                                    on_state_saved(state)
                                yield {"type": "state", "state_updated": True, "current_state": state.model_dump()}
                            if cleaned_head:
                                emitted_chunks.append(cleaned_head)
                                yield {"type": "delta", "delta": cleaned_head}
                            tag_buffer = ""
                        continue
                    if len(stripped) < 15 and ("<state_patch".startswith(stripped) or "```tool_call".startswith(stripped) or "```state_patch".startswith(stripped)):
                        continue
                    header_resolved = True
                    emitted_chunks.append(tag_buffer)
                    yield {"type": "delta", "delta": tag_buffer}
                    tag_buffer = ""
                else:
                    emitted_chunks.append(delta)
                    yield {"type": "delta", "delta": delta}

            if tag_buffer:
                cleaned_tail, did_patch, _ = _extract_and_apply_llm_patch(tag_buffer, state)
                if did_patch:
                    patch_applied = True
                    updated = True
                    if on_state_saved:
                        on_state_saved(state)
                    yield {"type": "state", "state_updated": True, "current_state": state.model_dump()}
                if cleaned_tail:
                    emitted_chunks.append(cleaned_tail)
                    yield {"type": "delta", "delta": cleaned_tail}

            full_reply = "".join(emitted_chunks).strip()
            yield {
                "type": "done",
                "reply": full_reply,
                "state_updated": updated,
                "current_state": state.model_dump(),
                "input_tokens": stream_meta.get("input_tokens", 0),
                "output_tokens": stream_meta.get("output_tokens", 0),
                "latency_ms": stream_meta.get("latency_ms", 0.0),
                "model_name": stream_meta.get("model_name"),
                "provider_id": stream_meta.get("provider_id"),
                "chat_source": "llm_function_calling" if patch_applied else "llm",
            }
            return
        except (AllModelsUnavailableException, Exception) as exc:
            fallback_reply = (
                f"{param_updated_msg}\n\n（注：外部大模型暂不可用：{exc}，已使用本地规则状态机完成参数同步。）"
                if updated
                else f"所有模型服务暂不可用，请检查 API Key 或网络后重试。（详情：{exc}）"
            )
            if not emitted_chunks:
                yield {"type": "delta", "delta": fallback_reply}
                full_reply = fallback_reply
            else:
                notice = f"\n\n（流式传输中断：{exc}）"
                yield {"type": "delta", "delta": notice}
                full_reply = "".join(emitted_chunks) + notice

            yield {
                "type": "done",
                "reply": full_reply,
                "state_updated": updated,
                "current_state": state.model_dump(),
                "chat_source": "local_fallback",
            }
            return

    if updated:
        reply = param_updated_msg
    else:
        reply = (
            "您好！我是\u201c云脉\u201d系统的多智能体协同助手\u2014\u2014\u201c医算子\u201d。检测到您当前未输入 API Key 或处于 Demo 模式。\n\n"
            "在离线模式下，我支持全字段参数调整与相对缩放指令，例如：\n"
            "1. 📂 **复合参数调整**：'把靶点改为 Claudin 18.2，适应症改为胰腺导管腺癌，样本量扩大 50%'\n"
            "2. 💰 **融资与基地变更**：'把商业融资额度修改为 3000 万，临床基地改为北京协和医院'\n"
            "3. 🔬 **指标精算微调**：'将算法准确率提高到 95%，推理时延降低 20%'\n"
            "4. 🏥 **术式与探针参数**：'激发波长设为 800nm，学习曲线例数改为 15 例'\n\n"
            "配置大模型 API Key 后，还可解锁任意语义推演与多步临床参数工具调用（Function Calling）。"
        )

    step = 48
    for i in range(0, len(reply), step):
        yield {"type": "delta", "delta": reply[i : i + step]}

    yield {
        "type": "done",
        "reply": reply,
        "state_updated": updated,
        "current_state": state.model_dump(),
        "chat_source": "local_rule",
    }
