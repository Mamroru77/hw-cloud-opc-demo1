import json
import logging
from typing import AsyncGenerator, Optional
from urllib.parse import quote
from fastapi import APIRouter, Header
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from backend.infra.db import save_paper_record
from backend.models.llm_models import AllModelsUnavailableException
from backend.models.schemas import GenerateDocsRequest
from backend.services.doc_exporter import markdown_to_docx_bytes
from backend.services.doc_generator import generate_business_plan, generate_clinical_protocol
from backend.services.model_router_service import ModelRouterService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["docs"])


def _build_prompts(state) -> tuple[str, str]:
    domain = state.domain
    if domain == "drugs":
        protocol_prompt = f"""你是一个转化医学与临床试验设计专家。
请根据以下创新药的技术参数、治疗靶点、适应症以及目标科室信息，撰写一份非常专业、详实的"新药临床研究申办方案草案 (I/II期)"。
参数：
- 靶向新药名称：FL-Target-{state.target}
- 治疗靶点：{state.target}
- 目标适应症：{state.indication}
- 血浆消除半衰期：{state.drug_half_life} 小时
- 毒性限制剂量 DLT：{state.dlt_dose} mg/m²
- 主要疗效终点：{state.primary_endpoint}
- 临床就诊科室：{state.target_department}
- 临床试验基地：{state.clinical_trial_site}
- 预计试验周期：{state.phase_1_duration} 个月
- 入组受试者规模：{state.sample_size} 例

方案必须严格采用以下 Markdown 结构输出，内容应尽可能严密、具备医学专业术语（切忌空洞，要结合靶向机制和毒理剂量数字分析）：
# 🏥 《{state.paper_title}》临床试验设计方案草案 (Phase I/II)
## 1. 试验基本信息与研究目的
## 2. 受试者入组与排除标准
## 3. 给药剂量与安全保障
## 4. 试验设计与进度规划
"""
        bp_prompt = f"""你是一个资深的医疗大健康投资经理。
请根据以下创新药的技术参数与商业规划，撰写一份极具商业说服力、严密、专业的"商业融资计划书"。
参数：
- 靶向新药名称：FL-Target-{state.target}
- 治疗靶点：{state.target}
- 目标适应症：{state.indication}
- 血浆消除半衰期：{state.drug_half_life} 小时
- 毒性限制剂量 DLT：{state.dlt_dose} mg/m²
- 融资金额需求：{state.financing_amount * 100:.0f} 万元人民币（出让 10%-15% 股权）
- 临床试验基地：{state.clinical_trial_site}

计划书必须严格采用以下 Markdown 结构输出，包含痛点解析、核心壁垒、中试CMC与CDMO合作规划、资金分配与里程碑：
# 🚀 创新靶向新药（FL-Target-{state.target}）临床开发与商业融资计划书
## 1. 行业痛点与未满足的临床需求
## 2. 核心技术壁垒与优势
## 3. 市场定位与产业化配套对接
## 4. 融资规划与资金用途
## 5. 项目里程碑规划
"""
    elif domain == "ai":
        protocol_prompt = f"""你是一个医疗器械软件 (SaMD) 临床验证与质量控制专家。
请根据以下医疗 AI 的网络架构、模态、准确度及延迟等参数，撰写一份非常专业、详实的"SaMD 临床效能验证与质量控制方案"。
参数：
- 模型架构：{state.architecture}
- 影像模态：{state.modality}
- 目标精度 (AUC/准确度)：{state.accuracy}%
- 推理延迟：{state.latency} ms
- 系统接入标准：{state.integration_standard}
- 主治诊断科室：{state.target_department}
- 验证合作基地：{state.clinical_trial_site}
- 预计试验周期：{state.phase_1_duration} 个月
- 数据影像规模：{state.sample_size * 10} 例

方案必须严格采用以下 Markdown 结构输出，内容包含算法推理效能、对比金标准建立、数据沙箱隔离及验证进度：
# 🏥 《{state.paper_title}》SaMD 临床效能验证与质量控制方案
## 1. 试验基本信息与研究目的
## 2. 受试者（影像数据）入组与排除标准
## 3. 临床对比测试与金标准建立
## 4. 试验设计与进度规划
"""
        bp_prompt = f"""你是一个专注于医疗信息化与医疗AI投资的资深投资经理。
请根据以下医疗 AI 软件的技术参数与商业规划，撰写一份极具商业说服力、严密、专业的"商业化白皮书"。
参数：
- 模型架构：{state.architecture}
- 影像模态：{state.modality}
- 目标精度 (AUC/准确度)：{state.accuracy}%
- 推理延迟：{state.latency} ms
- 系统接入标准：{state.integration_standard}
- 融资金额需求：{state.financing_amount * 100:.0f} 万元人民币
- 验证合作基地：{state.clinical_trial_site}

计划书必须严格采用以下 Markdown 结构输出，包含放射阅片痛点、模型推理时延优势、PACS系统接入兼容度、资金分配合理及项目里程碑：
# 🚀 创新 SaMD 医疗影像辅助智能诊断软件（AI-Vision-SaMD）商业化白皮书
## 1. 行业痛点与未满足的临床需求
## 2. 核心技术壁垒与优势
## 3. 市场定位与医院信息化生态集成
## 4. 融资规划与资金用途
## 5. 项目里程碑规划
"""
    elif domain == "surgical":
        protocol_prompt = f"""你是一个微创外科学术推广与手术安全质量监控专家。
请根据以下改良临床术式的参数，撰写一份非常专业、详实的"标准化临床路径指南与临床前评估方案"。
参数：
- 改良术式与部位：{state.anatomical_site}
- 核心手术器械：{state.core_instruments}
- 学习曲线带教例数：{state.learning_curve_cases} 例
- 安全追踪终点：{state.safety_endpoint}
- 首选带教中心：{state.clinical_trial_site}
- 带教培训周期：{state.phase_1_duration} 个月
- 准入示范样本量：{state.sample_size} 例

方案必须严格采用以下 Markdown 结构输出，内容应包含操作质控、大体解剖模拟、并发症跟踪标准：
# 🏥 《{state.paper_title}》创新临床术式标准化路径指南与临床前评估
## 1. 术式基本信息与开发目的
## 2. 适应受试患者入组与排除标准
## 3. 术式核心流程与操作质控
## 4. 临床前评估与示范规划
"""
        bp_prompt = f"""你是一个专注于微创外科器械及临床学术推广的商业策划专家。
请根据以下改良术式的推广规划与需求，撰写一份极具说服力的"临床新术式推广与技术推介书"。
参数：
- 改良术式与部位：{state.anatomical_site}
- 核心手术器械：{state.core_instruments}
- 学习曲线带教例数：{state.learning_curve_cases} 例
- 安全追踪终点：{state.safety_endpoint}
- 融资金额需求：{state.financing_amount * 100:.0f} 万元人民币
- 核心临床基地：{state.clinical_trial_site}

计划书必须严格采用以下 Markdown 结构输出，包含并发症痛点、缩短学习曲线的价值、大体模拟基地规划、资金用途及里程碑：
# 🚀 腹腔镜下改良 {state.anatomical_site} 临床新术式推广与技术推介书
## 1. 行业痛点与未满足的临床需求
## 2. 核心技术特征与优势
## 3. 市场推广与教学基地构建
## 4. 融资规划与资金用途
## 5. 项目里程碑规划
"""
    else:
        protocol_prompt = f"""你是一个转化医学与临床试验设计专家。
请根据以下研究成果的理化参数、代谢数据、毒理参数以及目标科室信息，撰写一份非常专业、详实的近红外荧光手术导航探针"一期临床试验设计方案草案"。
参数：
- 探针名称：FL-Probe-{int(state.excitation_wavelength)}
- 激发波长：{state.excitation_wavelength} nm
- 发射波长：{state.emission_wavelength} nm
- 完全清除代谢时间：{state.metabolic_cycle} 小时
- 代谢半衰期：{state.half_life} 小时
- 半数致死量 LD50：{state.ld50} mg/kg
- 最大耐受剂量 MTD：{state.mtd} mg/kg
- 术中应用科室：{state.target_department}
- 一期试验临床基地：{state.clinical_trial_site}
- 预计试验周期：{state.phase_1_duration} 个月
- 入组受试者规模：{state.sample_size} 例

方案必须严格采用以下 Markdown 结构输出，内容应尽可能严密、具备医学专业术语（结合波长与消除半衰期分析）：
# 🏥 《{state.paper_title}》一期临床试验设计方案草案 (Phase I)
## 1. 试验基本信息与研究目的
## 2. 受试者入组与排除标准
## 3. 给药剂量与安全保障
## 4. 试验设计与进度规划
"""
        bp_prompt = f"""你是一个资深的医疗大健康天使投资经理和商业规划专家。
请根据以下分子技术参数与临床定位，为该创新近红外荧光探针撰写一份极具商业说服力、严密、专业的"商业融资计划书"。
参数：
- 探针名称：FL-Probe-{int(state.excitation_wavelength)}
- 激发波长：{state.excitation_wavelength} nm
- 发射波长：{state.emission_wavelength} nm
- 完全清除代谢时间：{state.metabolic_cycle} 小时
- 代谢半衰期：{state.half_life} 小时
- 半数致死量 LD50：{state.ld50} mg/kg
- 最大耐受剂量 MTD：{state.mtd} mg/kg
- 术中应用科室：{state.target_department}
- 融资款首选一期临床基地：{state.clinical_trial_site}
- 融资金额需求：{state.financing_amount * 100:.0f} 万元人民币（出让 10%-15% 股权）

计划书必须严格采用以下 Markdown 结构输出，内容要包含竞品分析、痛点解析、兼容设备装机优势和资金分配，非常专业和详实：
# 🚀 《{state.paper_title}》商业融资计划书
## 1. 行业痛点与未满足的临床需求
## 2. 核心技术壁垒与优势
## 3. 市场定位与设备兼容性匹配
## 4. 融资规划与资金用途
## 5. 项目里程碑规划
"""
    return protocol_prompt, bp_prompt


@router.post("/generate-docs")
async def generate_docs(
    payload: GenerateDocsRequest,
    x_session_id: Optional[str] = Header(default=None),
):
    state = payload.state
    api_key = payload.api_key
    provider = payload.provider
    sid = (x_session_id or "default").strip() or "default"

    router_svc = ModelRouterService()
    llm_error: Optional[str] = None

    if router_svc.has_any_available_key(provider, api_key):
        protocol_prompt, bp_prompt = _build_prompts(state)
        try:
            proto_resp = await router_svc.route_chat(
                provider,
                api_key,
                "你是一个精通转化医学和一期临床试验设计的专家智能体。请生成符合医学规范、数据严谨的方案Markdown文本。",
                [{"role": "user", "content": protocol_prompt}],
            )
            bp_resp = await router_svc.route_chat(
                provider,
                api_key,
                "你是一个专注于创新医疗器械与新药研发投资的专业投资经理。请生成具备极佳商业逻辑与估值分析的融资计划书Markdown文本。",
                [{"role": "user", "content": bp_prompt}],
            )

            if payload.paper_id:
                try:
                    save_paper_record(
                        paper_id=payload.paper_id,
                        session_id=sid,
                        title=state.paper_title,
                        domain=state.domain,
                        content="",
                        state_dict=state.model_dump(),
                        clinical_doc=proto_resp.content,
                        bp_doc=bp_resp.content,
                        doc_source="llm",
                    )
                except Exception as exc:
                    logger.warning("Failed to persist generated LLM docs: %s", exc)

            return {
                "status": "success",
                "doc_source": "llm",
                "provider_used": proto_resp.provider_id,
                "model_name": proto_resp.model_name,
                "input_tokens": proto_resp.input_tokens + bp_resp.input_tokens,
                "output_tokens": proto_resp.output_tokens + bp_resp.output_tokens,
                "latency_ms": round(proto_resp.latency_ms + bp_resp.latency_ms, 1),
                "clinical_trial_protocol": proto_resp.content,
                "business_plan": bp_resp.content,
            }
        except (AllModelsUnavailableException, Exception) as exc:
            llm_error = str(exc)
            logger.warning("LLM doc generation failed, falling back to template: %s", exc)

    protocol_md = generate_clinical_protocol(state)
    bp_md = generate_business_plan(state)

    if payload.paper_id:
        try:
            save_paper_record(
                paper_id=payload.paper_id,
                session_id=sid,
                title=state.paper_title,
                domain=state.domain,
                content="",
                state_dict=state.model_dump(),
                clinical_doc=protocol_md,
                bp_doc=bp_md,
                doc_source="template",
            )
        except Exception as exc:
            logger.warning("Failed to persist template docs: %s", exc)

    return {
        "status": "success",
        "doc_source": "template",
        "llm_error": llm_error,
        "clinical_trial_protocol": protocol_md,
        "business_plan": bp_md,
    }


def _sse_data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _chunk_string(text: str, chunk_size: int = 120) -> list[str]:
    if not text:
        return []
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


@router.post("/generate-docs/stream")
async def generate_docs_stream(
    payload: GenerateDocsRequest,
    x_session_id: Optional[str] = Header(default=None),
):
    state = payload.state
    api_key = payload.api_key
    provider = payload.provider
    sid = (x_session_id or "default").strip() or "default"
    router_svc = ModelRouterService()

    async def event_generator() -> AsyncGenerator[str, None]:
        llm_error: Optional[str] = None

        if router_svc.has_any_available_key(provider, api_key):
            protocol_prompt, bp_prompt = _build_prompts(state)
            clinical_chunks: list[str] = []
            bp_chunks: list[str] = []
            proto_meta: dict = {}
            bp_meta: dict = {}
            try:
                yield _sse_data({"type": "start", "doc_source": "llm"})

                async for delta, meta in router_svc.route_chat_stream(
                    provider,
                    api_key,
                    "你是一个精通转化医学和一期临床试验设计的专家智能体。请生成符合医学规范、数据严谨的方案Markdown文本。",
                    [{"role": "user", "content": protocol_prompt}],
                ):
                    proto_meta = meta
                    clinical_chunks.append(delta)
                    yield _sse_data({"type": "clinical_delta", "delta": delta})

                async for delta, meta in router_svc.route_chat_stream(
                    provider,
                    api_key,
                    "你是一个专注于创新医疗器械与新药研发投资的专业投资经理。请生成具备极佳商业逻辑与估值分析的融资计划书Markdown文本。",
                    [{"role": "user", "content": bp_prompt}],
                ):
                    bp_meta = meta
                    bp_chunks.append(delta)
                    yield _sse_data({"type": "bp_delta", "delta": delta})

                clinical_full = "".join(clinical_chunks)
                bp_full = "".join(bp_chunks)

                if payload.paper_id:
                    try:
                        save_paper_record(
                            paper_id=payload.paper_id,
                            session_id=sid,
                            title=state.paper_title,
                            domain=state.domain,
                            content="",
                            state_dict=state.model_dump(),
                            clinical_doc=clinical_full,
                            bp_doc=bp_full,
                            doc_source="llm",
                        )
                    except Exception as exc:
                        logger.warning("Failed to persist streamed LLM docs: %s", exc)

                yield _sse_data(
                    {
                        "type": "done",
                        "status": "success",
                        "doc_source": "llm",
                        "provider_used": proto_meta.get("provider_id") or bp_meta.get("provider_id"),
                        "model_name": proto_meta.get("model_name") or bp_meta.get("model_name"),
                        "input_tokens": int(proto_meta.get("input_tokens", 0))
                        + int(bp_meta.get("input_tokens", 0)),
                        "output_tokens": int(proto_meta.get("output_tokens", 0))
                        + int(bp_meta.get("output_tokens", 0)),
                        "latency_ms": round(
                            float(proto_meta.get("latency_ms", 0.0))
                            + float(bp_meta.get("latency_ms", 0.0)),
                            1,
                        ),
                        "clinical_trial_protocol": clinical_full,
                        "business_plan": bp_full,
                    }
                )
                return
            except (AllModelsUnavailableException, Exception) as exc:
                llm_error = str(exc)
                logger.warning("LLM doc stream failed, falling back to template stream: %s", exc)
                yield _sse_data({"type": "reset", "reason": llm_error})

        yield _sse_data({"type": "start", "doc_source": "template"})
        protocol_md = generate_clinical_protocol(state)
        bp_md = generate_business_plan(state)

        for piece in _chunk_string(protocol_md, 140):
            yield _sse_data({"type": "clinical_delta", "delta": piece})

        for piece in _chunk_string(bp_md, 140):
            yield _sse_data({"type": "bp_delta", "delta": piece})

        if payload.paper_id:
            try:
                save_paper_record(
                    paper_id=payload.paper_id,
                    session_id=sid,
                    title=state.paper_title,
                    domain=state.domain,
                    content="",
                    state_dict=state.model_dump(),
                    clinical_doc=protocol_md,
                    bp_doc=bp_md,
                    doc_source="template",
                )
            except Exception as exc:
                logger.warning("Failed to persist streamed template docs: %s", exc)

        yield _sse_data(
            {
                "type": "done",
                "status": "success",
                "doc_source": "template",
                "llm_error": llm_error,
                "clinical_trial_protocol": protocol_md,
                "business_plan": bp_md,
            }
        )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


class ExportDocxRequest(BaseModel):
    title: str
    content: str
    domain: str = "devices"
    filename: Optional[str] = None


@router.post("/docs/export-docx")
async def export_docs_docx(payload: ExportDocxRequest):
    docx_bytes = markdown_to_docx_bytes(
        title=payload.title,
        markdown_text=payload.content,
        domain=payload.domain,
    )
    raw_name = (payload.filename or payload.title or "document").strip()
    if not raw_name.lower().endswith(".docx"):
        raw_name += ".docx"
    encoded_name = quote(raw_name)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=\"export.docx\"; filename*=UTF-8''{encoded_name}",
        },
    )
