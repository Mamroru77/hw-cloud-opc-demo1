import re
from backend.models.schemas import SessionState, ChatMessage


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
        "current_state": state
    }


def _parse_intent_and_update(msg: str, state: SessionState) -> tuple:
    updated = False
    param_updated_msg = ""

    if any(kw in msg for kw in ["科室", "部门", "外科", "修改科室"]):
        if "脑" in msg or "神经" in msg:
            state.target_department = "脑外科/神经外科"
            param_updated_msg = "已为您将转化医学目标临床科室修改为 **脑外科/神经外科**。该科室在神经影像自动分析、脑胶质瘤荧光切除术中有着极其重要的临床及装机需求。我已为您适配对应的场景设备和实训大体基地。"
            updated = True
        elif "泌尿" in msg:
            state.target_department = "泌尿外科"
            param_updated_msg = "已为您将临床科室修改为 **泌尿外科**。前列腺切除或肾肿瘤剥除微创手术中对系统适配度要求极高，已同步为您更新场景匹配。"
            updated = True
        elif "肝" in msg:
            state.target_department = "肝胆外科"
            param_updated_msg = "已为您将临床科室修改为首选的 **肝胆外科**。原发性肝脏切除术中，无论是荧光分子探针还是三维重建都是极为成熟的应用。"
            updated = True
        elif "放射" in msg:
            state.target_department = "放射科"
            param_updated_msg = "已为您将目标就诊/诊断科室变更为 **放射科**。放射科是影像智能诊断 SaMD 模型落地及前瞻性效能验证的核心科室。"
            updated = True
        elif "肿瘤内" in msg:
            state.target_department = "肿瘤内科"
            param_updated_msg = "已为您将临床就诊科室变更为 **肿瘤内科**。肿瘤内科是各类靶向药及生物制剂一期爬坡试验及受试者筛选的重要科室。"
            updated = True
        elif "普通外科" in msg or "普外" in msg:
            state.target_department = "普通外科"
            param_updated_msg = "已为您将临床就诊科室变更为 **普通外科**。普通外科涵盖广泛的微创及消化道重建术式，适合改良新术式的带教推广。"
            updated = True

    if any(kw in msg for kw in ["融资", "钱", "金额", "额度", "千万", "万", "亿"]):
        numbers = re.findall(r'\d+', msg)
        if numbers:
            val = float(numbers[0])
            if "万" in msg:
                state.financing_amount = val / 100.0
            elif "亿" in msg:
                state.financing_amount = val * 10.0
            else:
                state.financing_amount = val if val > 1 else val

            param_updated_msg = f"已将本次融资规划额度调整为 **{state.financing_amount * 100:.0f} 万元人民币**。已重新分配资金划拨比例，并自动重写了相应领域的《商业融资计划书》。"
            updated = True

    if any(kw in msg for kw in ["医院", "基地", "中心", "修改地点"]):
        if "华北" in msg or "北京" in msg or "协和" in msg:
            state.clinical_trial_site = "北京协和医院(GCP基地)"
            param_updated_msg = "临床试验基地已变更为 **北京协和医院(GCP基地)**。"
            updated = True
        elif "华东" in msg or "上海" in msg or "中山医院" in msg:
            state.clinical_trial_site = "华东地区三甲医院(上海中山医院等)"
            param_updated_msg = "临床试验基地已变更为 **华东地区三甲医院(上海中山医院等)**。"
            updated = True
        elif "华南" in msg or "广州" in msg or "中山大学" in msg:
            state.clinical_trial_site = "华南地区三甲医院(中山大学附属医院等)"
            param_updated_msg = "临床试验基地已变更为 **华南地区三甲医院(中山大学附属医院等)**。"
            updated = True

    if state.domain == "drugs":
        if "靶点" in msg or "target" in msg:
            for t in ["EGFR", "KRAS-G12C", "PD-L1", "HER2", "ALK"]:
                if t.lower() in msg:
                    state.target = t
                    param_updated_msg = f"已将创新药靶点变更为 **{t}**。已同步重写新药方案与融资计划书中的结合机制。"
                    updated = True
                    break
        if "适应症" in msg or "疾病" in msg or "癌" in msg:
            for ind in ["非小细胞肺癌", "胃癌", "结直肠癌", "乳腺癌", "胰腺癌"]:
                if ind in msg:
                    state.indication = ind
                    param_updated_msg = f"已将目标适应症变更为 **{ind}**。"
                    updated = True
                    break
        if "半衰期" in msg or "消除" in msg:
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                state.drug_half_life = float(nums[0])
                param_updated_msg = f"已将新药血浆消除半衰期设定为 **{state.drug_half_life} 小时**。药代模型已重新计算血药浓度分布曲线。"
                updated = True
        if "限制毒性" in msg or "dlt" in msg:
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                state.dlt_dose = float(nums[0])
                param_updated_msg = f"已将新药限制毒性剂量 (DLT) 调整为 **{state.dlt_dose} mg/m²**。一期起始人体剂量估算同步更新。"
                updated = True
        if "终点" in msg or "endpoint" in msg:
            for ep in ["PFS (无进展生存期)", "ORR (客观缓解率)", "OS (总生存期)"]:
                if ep.lower() in msg or ep.split(" ")[0].lower() in msg:
                    state.primary_endpoint = ep
                    param_updated_msg = f"已将主要疗效终点变更为 **{ep}**。"
                    updated = True
                    break

    elif state.domain == "ai":
        if "准确" in msg or "精度" in msg or "auc" in msg or "accuracy" in msg:
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                val = float(nums[0])
                state.accuracy = val if val > 1.0 else val * 100.0
                param_updated_msg = f"已将 SaMD 算法目标诊断精度 (AUC/准确率) 调整为 **{state.accuracy}%**。ROC 效能曲线已重新绘制。"
                updated = True
        if "延迟" in msg or "时延" in msg or "ms" in msg or "latency" in msg:
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                state.latency = float(nums[0])
                param_updated_msg = f"已将算法单帧推理时延设定为 **{state.latency} ms**，硬件计算集群参数已同步优化。"
                updated = True
        if "架构" in msg or "模型" in msg or "神经网络" in msg:
            for arch in ["3D-Unet", "3D-Unet+", "Med-Transformer", "Swin-UNETR"]:
                if arch.lower() in msg:
                    state.architecture = arch
                    param_updated_msg = f"已将算法神经网络架构变更为 **{arch}**。"
                    updated = True
                    break
        if "模态" in msg or "图像" in msg or "影像" in msg:
            for mod in ["MRI-T2WI", "CT-Chest", "MRI-T1ce", "PET-CT"]:
                if mod.lower() in msg:
                    state.modality = mod
                    param_updated_msg = f"已将目标影像模态变更为 **{mod}**。"
                    updated = True
                    break

    elif state.domain == "surgical":
        if "学习曲线" in msg or "例数" in msg or "例" in msg:
            nums = re.findall(r'\d+', msg)
            if nums:
                state.learning_curve_cases = int(nums[0])
                param_updated_msg = f"已将青年医师标准化带教学习曲线设定为 **{state.learning_curve_cases} 例**。手术用时衰减平台已同步调整。"
                updated = True
        if "部位" in msg or "解剖" in msg or "手术部位" in msg:
            for site in ["胰腺十二指肠区", "肝脏切除区", "胃肠吻合区", "肺段切除区"]:
                if site in msg:
                    state.anatomical_site = site
                    param_updated_msg = f"已将改良术式手术目标解剖部位变更为 **{site}**。"
                    updated = True
                    break
        if "器械" in msg or "手术器械" in msg:
            for inst in ["腹腔镜能量切割闭合器", "超声能量手术刀", "吻合器", "双极电凝镊"]:
                if inst in msg:
                    state.core_instruments = inst
                    param_updated_msg = f"已将核心手术器械配置变更为 **{inst}**。"
                    updated = True
                    break
        if "安全终点" in msg or "并发症" in msg:
            for ep in ["30天术后并发症率", "90天吻合口瘘率", "术后胆瘘/胰瘘发生率"]:
                if ep in msg:
                    state.safety_endpoint = ep
                    param_updated_msg = f"已将临床准入追踪的安全终点指标设定为 **{ep}**。"
                    updated = True
                    break

    return updated, param_updated_msg


def _build_state_context(state: SessionState, clinical_doc_text: str, bp_doc_text: str) -> str:
    state_context = f"\n[当前系统转化医学细分领域]: {state.domain}\n"
    state_context += f"[当前系统通用物理、药理或算法参数]:\n"
    state_context += f"- 目标科室: {state.target_department}\n"
    state_context += f"- 临床试验基地: {state.clinical_trial_site}\n"
    state_context += f"- 商业融资金额: {state.financing_amount * 100:.0f} 万元人民币\n"

    if state.domain == "devices":
        state_context += (
            f"- 靶向探针激发波长: {state.excitation_wavelength} nm\n"
            f"- 靶向探针发射波长: {state.emission_wavelength} nm\n"
            f"- 半衰期: {state.half_life} 小时\n"
            f"- 完全代谢周期: {state.metabolic_cycle} 小时\n"
            f"- LD50 (半数致死量): {state.ld50} mg/kg\n"
            f"- MTD (最大耐受剂量): {state.mtd} mg/kg\n"
        )
    elif state.domain == "drugs":
        state_context += (
            f"- 治疗靶点: {state.target}\n"
            f"- 目标适应症: {state.indication}\n"
            f"- 血浆消除半衰期: {state.drug_half_life} 小时\n"
            f"- 限制毒性剂量 DLT: {state.dlt_dose} mg/m²\n"
            f"- 主要疗效终点: {state.primary_endpoint}\n"
        )
    elif state.domain == "ai":
        state_context += (
            f"- 算法架构: {state.architecture}\n"
            f"- 影像模态: {state.modality}\n"
            f"- 模型诊断精度 (AUC): {state.accuracy}%\n"
            f"- 推理延迟: {state.latency} ms\n"
            f"- 系统接入标准: {state.integration_standard}\n"
        )
    elif state.domain == "surgical":
        state_context += (
            f"- 手术部位: {state.anatomical_site}\n"
            f"- 核心器械配置: {state.core_instruments}\n"
            f"- 学习曲线例数: {state.learning_curve_cases} 例\n"
            f"- 安全随访指标: {state.safety_endpoint}\n"
        )

    if clinical_doc_text:
        state_context += f"\n[当前一期临床试验设计方案/临床验证规范草案关键文本]:\n{clinical_doc_text[:1000]}\n"
    if bp_doc_text:
        state_context += f"\n[当前商业融资计划书/商业化白皮书关键文本]:\n{bp_doc_text[:1000]}\n"

    return state_context


def chat_agent_service(payload: ChatMessage, state: SessionState) -> dict:
    import asyncio
    from backend.services.model_router_service import ModelRouterService
    from backend.models.llm_models import AllModelsUnavailableException

    msg = payload.message.lower()
    token_info = {}

    if any(kw in msg for kw in ["模型", "版本", "供应商", "model", "version", "底座", "服务商", "提供商", "厂商"]):
        return _handle_model_query(payload, state)

    updated, param_updated_msg = _parse_intent_and_update(msg, state)

    clinical_doc_text = payload.clinical_doc or ""
    bp_doc_text = payload.bp_doc or ""

    state_context = _build_state_context(state, clinical_doc_text, bp_doc_text)
    full_system_prompt = (payload.system_prompt or "作为智慧医疗多智能体系统协同助手\u201c医算子\u201d做出答复。") + "\n" + state_context

    if payload.api_key:
        api_messages = []
        for h in payload.history:
            api_messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

        api_messages.append({"role": "user", "content": payload.message})

        if updated:
            api_messages[-1]["content"] += f"\n(注: 系统已成功应用修改指令: {param_updated_msg})"

        try:
            router = ModelRouterService()
            llm_response = asyncio.get_event_loop().run_until_complete(
                router.route_chat(
                    payload.provider,
                    payload.api_key,
                    full_system_prompt,
                    api_messages,
                )
            )
            reply = llm_response.content
            token_info = {
                "input_tokens": llm_response.input_tokens,
                "output_tokens": llm_response.output_tokens,
                "latency_ms": llm_response.latency_ms,
                "model_name": llm_response.model_name,
                "provider_id": llm_response.provider_id,
            }
        except AllModelsUnavailableException:
            reply = "所有模型服务暂不可用，请检查API Key或稍后重试。"
            token_info = {}
        except Exception:
            from backend.adapters.llm_adapter import call_llm_api
            reply = call_llm_api(payload.provider, payload.api_key, full_system_prompt, api_messages)
            token_info = {}
    else:
        if any(kw in msg for kw in ["模型", "版本", "model", "version", "当前模型"]):
            reply = (
                "您好！我是\u201c医算子\u201d。根据您在左侧控制面板中选择的「模型提供商」与输入的 API Key，系统底层实际联调调用的具体大语言模型版本配置如下：\n\n"
                "1. **DeepSeek** (默认): 接入官方当前最新版本的双翼旗舰模型 **`deepseek-chat` (DeepSeek-V3/R1 接口)**。\n"
                "2. **OpenAI**: 接入官方当前最具性价比的轻量旗舰模型 **`gpt-4o-mini`**。\n"
                "3. **华为云盘古**: 接入华为云ModelArts推理服务，使用 **`华为云盘古大模型`**（需hw-前缀API Key）。\n"
                "4. **智谱GLM**: 接入智谱AI官方平台，使用 **`glm-4-flash`**。\n"
                "5. **Google Gemini**: 接入官方标准的开发者端 OpenAI 兼容接口，并使用主力模型 **`gemini-1.5-flash`**。\n\n"
                "系统支持模型降级链：pangu → deepseek → openai → glm → gemini，当首选模型不可用时自动切换。\n\n"
                "如果您当前未配置 API Key（即处于 Mock/Demo 模式下），我将作为一个**离线医学规则状态机 (Local TM-Rule Engine v1.0.0)** 为您服务，支持在无网环境下通过意图识别执行参数快速更新。"
            )
        elif updated:
            reply = param_updated_msg
        else:
            reply = (
                "您好！我是\u201c云脉\u201d系统的多智能体协同助手\u2014\u2014\u201c医算子\u201d。检测到您当前未输入 API Key 或处于 Demo 模式。\n\n"
                "在没有配置大模型密钥的情况下，我目前仅支持对参数调整类指令进行模拟响应，您可以尝试告诉我：\n"
                "1. 📂 **修改目标科室**（例如：'将目标科室改为脑外科'）\n"
                "2. 💰 **调整融资金额**（例如：'把商业融资额度修改为 3000 万'）\n"
                "3. 🏥 **修改临床基地**（例如：'修改临床基地到北京协和医院'）\n"
                "4. 🔬 **修改领域特定参数**（如：'把新药半衰期设为 18小时'，'将算法准确率提高到 95%'，'学习曲线例数改为 15例'）\n\n"
                "若要开启真实的 LLM 问答并全链路内容问询，请在左侧设置栏切换至\u201c大模型联调模式\u201d并输入有效的 API Key。届时您还可以自由编辑我的\u201c专有提示词\u201d来调教我的表现！"
            )

    result = {
        "reply": reply,
        "state_updated": updated,
        "current_state": state,
    }
    if token_info:
        result.update(token_info)
    return result
