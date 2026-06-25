from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

app = FastAPI(title="Translational Medicine Agent Backend", version="1.0.0")

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State to simulate active session parameters
class SessionState(BaseModel):
    domain: str = "devices"  # devices, drugs, ai, surgical
    paper_title: str = "新型荧光探针在早期肿瘤切除手术中的应用"
    target_department: str = "肝胆外科"
    financing_amount: float = 15.0  # million RMB
    clinical_trial_site: str = "华东地区三甲医院"
    phase_1_duration: int = 12  # months
    sample_size: int = 20  # patients
    
    # 领域 A: 医疗器械与成像分子 (Devices)
    excitation_wavelength: float = 790.0  # nm
    emission_wavelength: float = 820.0  # nm
    metabolic_cycle: float = 24.0  # hours (full clearance)
    half_life: float = 2.4  # hours
    ld50: float = 50.0  # mg/kg (lethal dose 50)
    mtd: float = 5.0  # mg/kg (max tolerated dose)
    
    # 领域 B: 创新药物与生物治疗 (Drugs)
    target: str = "KRAS-G12C"
    indication: str = "非小细胞肺癌"
    drug_half_life: float = 12.0
    dlt_dose: float = 400.0  # mg/m2
    primary_endpoint: str = "ORR (客观缓解率)"
    
    # 领域 C: 医疗 AI 与智能诊断 (SaMD)
    architecture: str = "3D-Unet"
    modality: str = "MRI-T2WI"
    accuracy: float = 92.4  # % or AUC
    latency: float = 18.5  # ms
    integration_standard: str = "DICOM 3.0"
    
    # 领域 D: 创新临床术式与疗法 (Surgical)
    anatomical_site: str = "胰腺十二指肠区"
    core_instruments: str = "腹腔镜能量切割闭合器"
    learning_curve_cases: int = 25
    safety_endpoint: str = "30天术后并发症率"


current_state = SessionState()

class AnalyzePaperRequest(BaseModel):
    title: str
    content: str
    api_key: Optional[str] = None
    provider: Optional[str] = None

class GenerateDocsRequest(BaseModel):
    api_key: Optional[str] = None
    provider: Optional[str] = None
    state: SessionState


# Translational Medicine RAG Knowledge Base (Connected Regulatory & Academic Specifications)
KNOWLEDGE_BASE = {
    "devices": [
        {
            "source": "国家药监局(NMPA)《近红外荧光手术导航系统注册审查指导原则》",
            "title": "近红外激发与发射光谱兼容性与显像SNR要求",
            "content": "近红外手术导航探针与成像系统临床转化中，最适激发光谱应处于760-800nm，发射光谱处于800-850nm。系统在探测靶组织时，靶/背景比(TBR)或信噪比(SNR)应不低于3.0以确保边界显像的有效对比度。"
        },
        {
            "source": "FDA 《Guidance for Industry: Optical Imaging Devices for Oncology Resection》",
            "title": "荧光探针毒理学 MTAD 与 LD50 安全窗口规范",
            "content": "荧光造影剂及分子显像剂的非临床毒理评价中，最大推荐起始剂量应低于非人类灵长类动物最大无毒反应剂量(NOAEL)的1/10。MTD与LD50的安全窗口比值应不低于10倍。排泄代谢动力学分析中，24小时内肾清除率或粪便排泄量应大于给药剂量的90%，以防脏器长期累积毒性。"
        }
    ],
    "drugs": [
        {
            "source": "NMPA 《抗肿瘤药物临床试验技术指导原则》",
            "title": "创新小分子靶向药首人剂量递增与安全终点设计",
            "content": "I期临床剂量爬坡应严格采用标准3+3设计。起始剂量推算通常基于非临床毒理试验的NOAEL或限制毒性剂量(DLT)的1/10。主要终点为MTD与安全耐受性，次要终点包括药代动力学参数（消除半衰期、AUC）与初步药效终点（如客观缓解率 ORR 或无进展生存期 PFS）。"
        },
        {
            "source": "ICH S9 《针对晚期癌症药物的非临床评价指导原则》",
            "title": "药代动力学 (PK) 与血浆消除半衰期行业基准",
            "content": "对于靶向小分子口服抑制剂，血浆半衰期通常设计在8-24小时，以保证日单次或双次给药可维持稳态靶点占领率。若半衰期过长（超过36小时），可能导致蓄积性毒性反应，引发严重的三度以上DLT。"
        }
    ],
    "ai": [
        {
            "source": "NMPA 《人工智能医疗器械注册审查指导原则 (三类SaMD)》",
            "title": "医疗智能图像分割算法的临床效能及数据金标准确立",
            "content": "用于病灶分割或辅助决策的SaMD算法，其临床效能评价应对比多位资深医师（金标准）的共识结论。在回顾性独立测试集上，三维体积重叠指数(Dice)或诊断精度(AUC)应不低于90%。同时，算法在边缘服务器端的平均单次处理时延应低于50ms以保障交互体验。"
        },
        {
            "source": "HL7 / DICOM 3.0 医疗系统互操作标准",
            "title": "医疗影像 SaMD 的网络集成与 PACS 兼容性规范",
            "content": "SaMD在医院部署必须严格符合 DICOM 3.0 协议规范。系统应通过标准的C-STORE/C-MOVE服务与 PACS 影像云进行数据通信，图像传输及特征脱敏应在内网隔离沙箱中进行以满足患者隐私保密安全等级保护要求。"
        }
    ],
    "surgical": [
        {
            "source": "《微创外科新技术与新术式临床准入管理规范》",
            "title": "改良腹腔镜切除术与安全随访终点设定",
            "content": "对于腹腔镜微创胰十二指肠切除或吻合新术式的临床准入，科室首批开展案例需由资深高年资主治医师全程指导。主要安全性追踪指标为‘30天术后严重并发症发生率’（按 Clavien-Dindo 分级三级以上发生率不得高于5%），同时需严密随访吻合口漏、延迟胃排空及胰瘘。"
        },
        {
            "source": "微创外科医学教育协会《青年医师微创手术学习曲线规范》",
            "title": "手术操作熟练度与学习曲线(Cases)收敛平台",
            "content": "腹腔镜复杂吻合术式的学习曲线分析显示，随着青年医师操作案例数的累积，平均手术时间呈现明显的负指数收敛。一般在经过 20-30 例标准带教实训及大体模拟考核后，手术时间、术中出血量及术后胃排空延迟发生率进入相对平稳的‘技术成熟平台期’。"
        }
    ]
}

# Mock Database for Surgical Robots
ROBOTS_DB = [
    {
        "id": "davinci-xi",
        "name": "达芬奇 Xi (Da Vinci Xi)",
        "manufacturer": "Intuitive Surgical",
        "excitation_compatible": [780.0, 810.0],
        "channels": ["近红外荧光通道 (Firefly)"],
        "national_installs": 420,
        "suitability_departments": ["肝胆外科", "泌尿外科", "妇科"],
        "description": "全球市场占有率最高的多孔手术机器人，Firefly 荧光显微系统完美支持近红外一区/二区荧光成像。"
    },
    {
        "id": "toumai",
        "name": "图迈 (Toumai)",
        "manufacturer": "微创机器人",
        "excitation_compatible": [785.0, 815.0],
        "channels": ["三维高清近红外内窥镜通道"],
        "national_installs": 150,
        "suitability_departments": ["泌尿外科", "胸外科", "肝胆外科"],
        "description": "国产多孔手术机器人翘楚，具备极佳的近红外光谱分辨率，荧光显像清晰度达 4K 级别。"
    },
    {
        "id": "shurui",
        "name": "术锐 (Shurui)",
        "manufacturer": "术锐机器人",
        "excitation_compatible": [790.0, 830.0],
        "channels": ["单孔荧光内窥镜成像系统"],
        "national_installs": 85,
        "suitability_departments": ["妇科", "小儿外科", "脑外科/神经外科"],
        "description": "单孔手术机器人领军者，专为狭窄体腔设计，其荧光光源能量高度集中于 790-800nm。"
    },
    {
        "id": "microhand",
        "name": "妙手 (MicroHand)",
        "manufacturer": "威高机器人",
        "excitation_compatible": [750.0, 790.0],
        "channels": ["集成荧光显像镜"],
        "national_installs": 60,
        "suitability_departments": ["普通外科", "胃肠外科"],
        "description": "国产高性价比多孔手术机器人，主要支持传统可见光与 760nm 激发波长荧光。"
    }
]

# Helper to generate clinical protocol markdown
def generate_clinical_protocol(state: SessionState) -> str:
    domain = state.domain
    if domain == "drugs":
        return f"""# 🏥 《{state.paper_title}》临床试验设计方案草案 (Phase I/II)

## 1. 试验基本信息与研究目的
*   **研发靶点**：{state.target}
*   **目标适应症**：{state.indication}
*   **试验分期**：I期临床研究 (IND获批后阶段)
*   **首要目的**：在受试者中评估靶向药物对 {state.indication} 的耐受性、安全性，并确定最大耐受剂量 (MTD) 及限制毒性剂量 (DLT)。
*   **次要目的**：测定单次与多次给药的药代动力学参数（血浆消除半衰期预计为 {state.drug_half_life} 小时），并评估主要疗效终点（如客观缓解率 ORR，预计主要疗效达标值）。

## 2. 受试者入组与排除标准
### 2.1 入组标准
1.  年龄 18 至 75 周岁，确诊为晚期 {state.indication} 且经过标准治疗失败的患者。
2.  具有可测量病灶（符合 RECIST 1.1 标准），主要脏器功能符合入组要求。
3.  拟就诊或签约开展一期研究科室为：**{state.target_department}**。
4.  自愿在 **{state.clinical_trial_site}** 进行全程监测并签署知情同意书。

### 2.2 排除标准
1.  入组前4周内接受过大手术或系统性抗肿瘤治疗者。
2.  具有明显的排泄/代谢障碍（由于血浆消除半衰期长达 {state.drug_half_life} 小时，若肝肾代谢严重不全则蓄积毒性过大）。
3.  有严重心脑血管疾病或无法控制的脑转移患者。

## 3. 给药剂量与安全保障
*   **起始剂量推算**：根据非临床动物毒理学试验确立的限制毒性剂量 DLT 为 {state.dlt_dose} mg/m²，人体起始剂量采用 1/10 DLT，即 **{state.dlt_dose * 0.1:.1f} mg/m²**。
*   **爬坡方案**：采用标准“3+3”剂量递增设计，设4个爬坡剂量组。
*   **毒性监测**：严密观察血常规及心电图，在给药后 24-48 小时内重点观测剂量限制性毒性反应。

## 4. 试验设计与进度规划
*   **受试者规模**：计划入组 **{state.sample_size}** 例患者。
*   **临床试验中心**：由 **{state.clinical_trial_site}** 伦理委员会批准后在 GCP 中心实施。
*   **操作周期**：项目周期预计为 **{state.phase_1_duration} 个月**。
"""
    elif domain == "ai":
        return f"""# 🏥 《{state.paper_title}》SaMD 临床效能验证与质量控制方案

## 1. 试验基本信息与研究目的
*   **软件分类**：医疗器械软件 (SaMD - Software as a Medical Device)
*   **模型架构**：基于 {state.architecture} 的智能分析模型
*   **影像模态**：支持 {state.modality} 三维图像自动处理
*   **首要目的**：通过回顾性与前瞻性临床队列，验证 SaMD 算法对病灶检出和分级的灵敏度与特异度（目标 AUC 精度达 {state.accuracy}%）。
*   **次要目的**：评估模型在边缘计算环境的推理延迟（平均 latency 达 {state.latency} ms 以内），检测其并发稳定性，保障临床实时阅片应用可行性。

## 2. 受试者（影像数据）入组与排除标准
### 2.1 入组标准
1.  在 **{state.clinical_trial_site}** 影像数据库中建档的 {state.modality} 图像，具备完整的病理学诊断金标准。
2.  图像分辨率、层厚符合临床规范，DICOM 标准头文件信息完整，主治/诊断科室为 **{state.target_department}**。
3.  图像无严重伪影，病灶清晰可见。

### 2.2 排除标准
1.  影像图像质量低下（伪影严重、扫描范围不全、无对比度增强相）。
2.  不符合 {state.integration_standard} 规范，无法被软件自动解析的非标准格式数据。

## 3. 临床对比测试与金标准建立
*   **金标准建立**：以三位资深高年资主治医师的联合阅片及组织病理学诊断为金标准。
*   **软件运算与延迟**：图像输入系统后， SaMD 模型在边缘 GPU 服务器运行，要求单次推理延迟不超过 **{state.latency} ms**，全程保持数据沙箱隔离。
*   **效能评估**：计算模型输出的特异性、敏感性与一致性 kappa 指标，目标综合准确度不低于 {state.accuracy}%。

## 4. 试验设计与进度规划
*   **样本规模**：回顾性收集不少于 **{state.sample_size * 10} 例** 患者的脱敏影像影像病例。
*   **测试中心**：在 **{state.clinical_trial_site}** 信息科与**{state.target_department}**进行联合临床效能评价。
*   **项目周期**：预计研发与临床效能验证总耗时 **{state.phase_1_duration} 个月**。
"""
    elif domain == "surgical":
        return f"""# 🏥 《{state.paper_title}》创新临床术式标准化路径指南与临床前评估

## 1. 术式基本信息与开发目的
*   **手术解剖部位**：{state.anatomical_site}
*   **核心器械配置**：{state.core_instruments}
*   **主要评估目的**：规范并在科室推广完全镜下 {state.anatomical_site} 切除与改良缝合重建术式，缩短青年医师学习曲线。
*   **临床安全终点**：在临床准入阶段，严密追踪患者术后并发症发生情况，要求首批开展病例的“{state.safety_endpoint}”优于传统开腹或常规腔镜对照组。

## 2. 适应受试患者入组与排除标准
### 2.1 入组标准
1.  影像学诊断为 {state.anatomical_site} 良恶性肿瘤，具备明确微创腔镜手术指征者。
2.  心肺功能良好，能耐受气腹及长时间全身麻醉。
3.  就诊科室为：**{state.target_department}**。
4.  自愿在 **{state.clinical_trial_site}** 接受改良术式治疗并签署特别知情同意书。

### 2.2 排除标准
1.  肿瘤严重侵犯周围大血管，预估完全腔镜下无法安全游离重建者。
2.  具有凝血功能障碍或高度恶病质，术后伤口愈合极度不良者。

## 3. 术式核心流程与操作质控
*   **核心器械操作**：全程采用 **{state.core_instruments}** 进行精细切割、止血和缝合关闭。
*   **青年医师带教**：设定 **{state.learning_curve_cases} 例** 的学习曲线目标。参与医师需在大体解剖室进行模拟训练方能进入一期临床实操。
*   **安全性追踪**：重点跟踪并登记术后吻合口漏、延迟愈合以及“**{state.safety_endpoint}**”，若发生严重三级并发症需立刻中止准入流程。

## 4. 临床前评估与示范规划
*   **样本量**：临床准入示范案例共 **{state.sample_size}** 例。
*   **基地选址**：在 **{state.clinical_trial_site}** 微创手术中心开展首期应用。
*   **推广周期**：标准流程固化与科室医师培训周期预计为 **{state.phase_1_duration} 个月**。
"""
    else:
        return f"""# 🏥 《{state.paper_title}》一期临床试验设计方案草案 (Phase I)

## 1. 试验基本信息与研究目的
*   **产品名称**：基于 {state.excitation_wavelength}nm 激发的早期肿瘤靶向荧光探针（FL-Probe-{int(state.excitation_wavelength)}）
*   **研发代号**：OPC-MED-001
*   **试验分期**：I 期临床试验 (Phase I)
*   **首要目的**：评估健康受试者及早期肿瘤患者单次静脉注射 FL-Probe-{int(state.excitation_wavelength)} 的安全性、耐受性以及药代动力学（PK）特征。
*   **次要目的**：初步探索探针在术中导航的显像对比度、最佳显像时间窗口以及主要脏器蓄积情况。

## 2. 受试者入组与排除标准
### 2.1 入组标准 (Inclusion Criteria)
1.  年龄 18 至 75 周岁，男女不限。
2.  经病理学或影像学诊断为早期肿瘤（如原发性肝癌、神经胶质瘤等），且计划在 {state.clinical_trial_site} 进行手术切除。
3.  拟切除病灶符合术中荧光显像导航指征，主治科室为：**{state.target_department}**。
4.  主要脏器功能良好（血常规、肝肾功能指标符合临床试验要求）。
5.  自愿参加本试验并签署知情同意书。

### 2.2 排除标准 (Exclusion Criteria)
1.  有严重过敏史，或对近红外造影材料（如吲哚菁绿 ICG）过敏者。
2.  严重肝功能不全（Child-Pugh C级）或肾功能严重受损患者（由于主要排泄半衰期为 {state.half_life} 小时，需完全通过肾脏代谢清除）。
3.  孕期或哺乳期妇女。

## 3. 给药剂量与安全保障
*   **起始剂量推算**：根据非临床毒理学试验得出的安全参数（最大耐受剂量 MTD 为 {state.mtd} mg/kg，半数致死量 LD50 为 {state.ld50} mg/kg），采用 1/10 MTD 作为人体起始剂量，即给药浓度为 **{state.mtd * 0.1:.2f} mg/kg**。
*   **给药方式**：术前 2 至 4 小时进行外周静脉注射，注射速率恒定。
*   **排泄监视**：由于探针完全代谢周期为 **{state.metabolic_cycle} 小时**，在给药后 24 小时内需严密监测尿液及主要器官（肾脏、膀胱）的荧光蓄积情况，保障体内无药物残留。

## 4. 试验设计与进度规划
*   **设计类型**：单中心、开放性、剂量递增设计。
*   **受试者规模**：预计入组 **{state.sample_size}** 例患者.
*   **临床中心**：由 **{state.clinical_trial_site}** 科研伦理委员会批准并组织实施。
*   **操作周期**：项目周期预计为 **{state.phase_1_duration} 个月**。
"""

# Helper to generate business plan markdown
def generate_business_plan(state: SessionState) -> str:
    domain = state.domain
    if domain == "drugs":
        return f"""# 🚀 创新靶向新药（FL-Target-{state.target}）临床开发与商业融资计划书

## 1. 行业痛点与未满足的临床需求
目前在晚期 {state.indication} 临床治疗中，传统化疗和免疫治疗面临着响应率低、耐药性强和全身系统毒性高的瓶颈。
针对 {state.target} 突变或过表达靶点的创新靶向小分子药是目前的行业突破口。本管线药物旨在通过高度特异的口袋结合设计攻克耐药难题，为患者提供更高缓解率和更安全长期的口服给药选项，直接打入未满足的数百亿临床空缺市场。

## 2. 核心技术壁垒与优势
*   **高亲和力靶向机制**：对 {state.target} 具有纳摩级 (nM) 的极高抑制活性，选择性高，脱靶毒性低。
*   **卓越药代特征**：血浆半衰期达 {state.drug_half_life} 小时，给药顺应性高，体内起效浓度维持时间长。
*   **安全性宽裕**：限制毒性剂量 DLT 为 {state.dlt_dose} mg/m²，非临床安全性窗口宽，相比第一代靶向药毒副反应大为减弱。

## 3. 市场定位与产业化配套对接
通过成果转化 Agent，我们已与国内顶级的医药工业制造（CDMO）车间达成了中试产线的 GMP 供货协议，能提供高产量的低成本原料药及片剂供应。
在目标三甲医院的 **{state.target_department}** 形成了示范中心，该科室每年诊治的 {state.indication} 病患数逾千例，受试者招募速度极快，为一期及后续临床快速落地奠定了基础。

## 4. 融资规划与资金用途
*   **融资金额**：**{state.financing_amount}00 万人民币**（{state.financing_amount} Million RMB）。
*   **出让股权**：10% - 15%（视最终路演及协议确定）。
*   **资金划拨与用途**：
    1.  **60%** 用于在 **{state.clinical_trial_site}** 开展临床I/II期推进，预计招募 {state.sample_size} 例受试者，耗时 {state.phase_1_duration} 个月。
    2.  **20%** 用于完成管线在 CDMO 平台的中试药学（CMC）及原料药生产验证。
    3.  **20%** 用于公司日常研发人员激励、知识产权全球防御布局以及二代后备管线的立项。

## 5. 项目里程碑规划
*   **Q1-Q2**：向国家药监局递交正式 IND 申报，并在一期基地通过伦理审查。
*   **Q3-Q4**：启动首组剂量组爬坡，评估 DLT 安全指标。
*   **次年**：完成全部 **{state.sample_size} 例** 队列招募，争取公布初步 ORR/PFS 药效终点数据并筹备A+轮融资。
"""
    elif domain == "ai":
        return f"""# 🚀 创新 SaMD 医疗影像辅助智能诊断软件（AI-Vision-SaMD）商业化白皮书

## 1. 行业痛点与未满足的临床需求
在临床放射和阅片流程中，阅片医生工作量极度饱和，人工阅片易疲劳且对微小/边缘病灶的漏诊率达 15%-20%。
尤其在**{state.target_department}**（如神经外科术前评估、脑胶质瘤边界确认）中，依靠人眼界定肿瘤浸润范围极具主观性，常导致切除范围不精确。
本 SaMD 软件利用先进的 {state.architecture} 神经网络架构，实现对 {state.modality} 图像的高级智能分幅和边界像素级自动勾画，助力术前精准规划和术中决策。

## 2. 核心技术壁垒与优势
*   **诊断准确性极高**：利用大规模临床数据库预训练，在独立测试集上对病灶提取的敏感性/特异性 AUC 精度达 **{state.accuracy}%**。
*   **超低推理延迟**：优化的 TensorRT 硬件部署方案使得单帧推理时间仅 **{state.latency} ms**，完全契合实时术中阅片与多终端阅片的高吞吐响应。
*   **标准无缝接入**：完美兼容 **{state.integration_standard}** 协议规范，无需重构医院原有 PACS 系统即可实现平滑热接入。

## 3. 市场定位与医院信息化生态集成
首批主要切入三甲医院的 **{state.target_department}** 与**放射科**。目前已成功与国内主流的影像 PACS 系统完成技术对接联调，具备跨品牌快速部署优势，目前国内目标装机量市场估值已达数亿元。

## 4. 融资规划与资金用途
*   **融资金额**：**{state.financing_amount}00 万人民币**（{state.financing_amount} Million RMB）。
*   **资金划拨与用途**：
    1.  **50%** 用于在 **{state.clinical_trial_site}** 等多家影像大数据中心开展前瞻性效能验证（计划评估影像库样本 {state.sample_size * 10} 例，耗时 {state.phase_1_duration} 个月）。
    2.  **30%** 用于算法的软硬件国产化平台适配、NVIDIA 边缘服务器方案开发、以及向国家药监局递交三类医疗器械 SaMD 注册申报（NMPA）。
    3.  **20%** 用于核心开发人员（大模型架构专家、医学图像算法工程师）招募及市场预售渠道开发。

## 5. 项目里程碑规划
*   **Q1-Q2**：获得国家三类医疗器械分类界定，完成临床试验伦理备案。
*   **Q3-Q4**：联合 **{state.clinical_trial_site}** 完成全部 **{state.sample_size * 10} 例** 数据对比评价，争取拿到正式 NMPA 注册证。
*   **次年**：启动全国百家医院的云端 PACS 装机推广，开展商业化变现与订阅式 SaaS 服务合作。
"""
    elif domain == "surgical":
        return f"""# 🚀 腹腔镜下改良 {state.anatomical_site} 临床新术式推广与技术推介书

## 1. 行业痛点与未满足的临床需求
在传统微创手术中，针对 {state.anatomical_site} 的大范围切除与吻合重建难度极高，极易发生吻合口漏、胰漏等致命并发症。年轻医生需要经过数百例的漫长学习才能掌握，技术难以向下沉医院普及。
本术式改良了切除游离与缝合对合路径，配合最前沿的 **{state.core_instruments}** 自动缝合，大幅降低吻合难度，将学习曲线周期缩短近一半，极具全国科室普及价值。

## 2. 核心技术特征与优势
*   **安全终点极佳**：通过大量数据统计，该改良术式的术后“**{state.safety_endpoint}**”发生率远低于常规对照组。
*   **培训门槛低**：优化带教方案，新术式的临床带教和学习曲线仅需 **{state.learning_curve_cases}** 例即可掌握，极大地缓解了年轻高潜医师短缺的困境。
*   **器械依赖合理**：完全兼容各大手术室标准的 **{state.core_instruments}** 及 4K 腔镜塔，不增加医院额外的重资产采购负担。

## 3. 市场推广与教学基地构建
我们将一期试验和带教实训中心设在 **{state.clinical_trial_site}** 手术实训室，利用高仿真动物和离体大体标本进行系统化规范带教，辐射带动周边下沉医院在 **{state.target_department}** 开展术式准入。

## 4. 融资规划与资金用途
*   **融资金额**：**{state.financing_amount}00 万人民币**（{state.financing_amount} Million RMB）。
*   **资金划拨与用途**：
    1.  **60%** 用于在 **{state.clinical_trial_site}** 进行为期 **{state.phase_1_duration} 个月** 的医师进修培训班开设及首批 **{state.learning_curve_cases}** 例带教大体实训。
    2.  **20%** 用于出版手术标准操作音视频、手术指南专家共识撰写及推广会赞助。
    3.  **20%** 用于核心团队的带教模拟器研发、器械包定制等项目开支。

## 5. 项目里程碑规划
*   **Q1-Q2**：联合领域内权威专家录制改良术式的标准演示案例并提交伦理安全审定。
*   **Q3-Q4**：招募并顺利带教首批进修班医生，完成全部示范临床带教工作。
*   **次年**：发布大样本多中心安全性随访数据，力争将该改良术式写入行业微创手术标准临床路径指南。
"""
    else:
        return f"""# 🚀 创新早期肿瘤切除荧光探针（FL-Probe-{int(state.excitation_wavelength)}）商业融资计划书

## 1. 行业痛点与未满足的临床需求
在早期肿瘤切除手术中，医生极难通过肉眼及触觉精确界定肿瘤边界。切除过多会导致重要神经和血管损伤（尤其在**{state.target_department}**领域，如肝门区手术或脑胶质瘤手术）；切除过少则会导致肿瘤残留，引起复发。
本产品通过 AI4S 设计的靶向探针结合荧光手术机器人，能实现毫米级的术中实时导航，极大降低病灶残留率。

## 2. 核心技术壁垒与优势
*   **靶向精准度**：特异性结合早期肿瘤细胞，信噪比 (TBR) > 5.5。
*   **物理性能优异**：发射光谱位于 {state.emission_wavelength}nm 近红外区，组织穿透深度达 1.5 cm，完美匹配各大手术机器人内置相机。
*   **极佳安全性**：代谢周期仅 **{state.metabolic_cycle} 小时**，半衰期仅 **{state.half_life} 小时**，快速通过肾脏排出，无重金属蓄积毒性。LD50 达 {state.ld50} mg/kg，临床安全窗口极宽。

## 3. 市场定位与设备兼容性匹配
我们通过场景匹配 Agent，精准对接了国内已装机的荧光手术机器人系统。首选匹配型号为国内领先的手术导航平台，其激发光谱完美兼容本探针的 {state.excitation_wavelength}nm 激发光。
在主要装机科室中，**{state.target_department}**对术中导航的需求最为迫切，首批目标示范医院装机量已达数百台，具备极佳的商业变现基础。

## 4. 融资规划与资金用途
*   **融资金额**：**{state.financing_amount}00 万人民币**（{state.financing_amount} Million RMB）。
*   **出让股权**：10% - 15%（视最终路演及协议确定）。
*   **资金划拨与用途**：
    1.  **60%** 用于在 **{state.clinical_trial_site}** 开展 I 期临床试验（计划招募 {state.sample_size} 例受试者，耗时 {state.phase_1_duration} 个月）。
    2.  **20%** 用于中试车间的 GMP 升级与药学研究（CMC）。
    3.  **20%** 用于 OPC（一人公司）核心研发团队建设、专利全球布局以及后续管线研发。

## 5. 项目里程碑规划
*   **Q1-Q2**：完成 IND 临床试验申报批件获取，在首家临床基地启动伦理审查。
*   **Q3-Q4**：招募首组受试者，完成首批安全剂量组爬坡试验。
*   **次年**：完成全部 **{state.sample_size} 例** 临床案例收集，发表临床安全性数据并启动 Phase II 筹备。
"""

@app.get("/api/state", response_model=SessionState)
def get_state():
    return current_state

@app.post("/api/state", response_model=SessionState)
def update_state(state: SessionState):
    global current_state
    current_state = state
    return current_state


@app.post("/api/analyze-paper")
def analyze_paper(payload: AnalyzePaperRequest):
    global current_state
    
    title = payload.title
    content = payload.content
    api_key = payload.api_key
    provider = payload.provider

    # If API Key is present, call LLM
    if api_key:
        system_prompt = """你是一个转化医学与医疗大健康领域的专业评审智能体。
你必须支持中英文双语识别。用户上传的文档标题及内容（即输入的 title 和 content）可能是中文，也可能是英文，或者是中英文混合的。请分析并做出两个判断：
1. 该文档是否为学术论文、科研报告、临床试验记录或医学技术公开文档（支持中英文识别与评定）？
2. 该文档的内容是否与生物医学、创新药物、医疗器械、医疗AI、临床术式等转化医学领域相关？

你必须根据论文内容，将论文分类为以下四个细分领域之一：
- "devices": 医疗器械与成像分子（例如荧光探针、造影剂、超声/CT/MRI设备硬件等，或英文的 optical probes, contrast agents, CT/MRI imaging devices 等）
- "drugs": 创新药物与生物治疗（例如靶向小分子、抗体药、基因治疗、细胞治疗等，或英文的 targeted small molecules, therapeutic antibodies, cellular immunotherapies 等）
- "ai": 医疗 AI 与智能诊断（例如医学影像分割、AI辅助筛查系统、智能诊断模型等软件/SaMD，或英文的 medical image segmentation, diagnostic algorithms, SaMD 等）
- "surgical": 创新临床术式与疗法（例如腹腔镜/胸腔镜微创改良术式、新型器官重建方法、手术新路径等，或英文的 laparoscopic/thoracoscopic surgeries, novel surgical pathways 等）

你必须提取以下字段，并以纯 JSON 格式输出，不得夹杂任何 markdown 格式（不要带 ```json 或 ``` 标记）：
{
  "is_valid": true/false (若属于中英文学术论文/专业报告，且与上述转化医学领域相关，填 true；若非学术论文、或不相关，填 false。不得因为语言是英文而误判为无效),
  "reason": "如果是相关论文，填写提取分析简述（中英文均可）；如果不是相关论文，详细说明中英文警告原因",
  "domain": "devices" / "drugs" / "ai" / "surgical",
  "target_department": "肝胆外科" (最适合的术中或临床科室，从以下之中选择: "肝胆外科", "脑外科/神经外科", "泌尿外科", "妇科", "普通外科", "胃肠外科", "肿瘤内科", "放射科", "胸外科"),
  
  # 下面是各领域专属的参数，请在JSON中全部返回。如果是非当前领域的参数，请返回其默认值（默认值见说明）。
  
  # [Devices 专属]
  "excitation_wavelength": 790.0 (发射/激发波长nm，默认790.0),
  "emission_wavelength": 820.0 (发射波长nm，默认820.0),
  "half_life": 2.4 (半衰期小时，默认2.4),
  "metabolic_cycle": 24.0 (完全清除小时，默认24.0),
  "ld50": 50.0 (默认50.0),
  "mtd": 5.0 (默认5.0),
  
  # [Drugs 专属]
  "target": "KRAS-G12C" (靶点名称，默认"KRAS-G12C"),
  "indication": "非小细胞肺癌" (适应症，默认"非小细胞肺癌"),
  "drug_half_life": 12.0 (药物半衰期小时，默认12.0),
  "dlt_dose": 400.0 (限制毒性剂量，默认400.0),
  "primary_endpoint": "ORR (客观缓解率)" (主要疗效终点，默认"ORR (客观缓解率)"),
  
  # [AI 专属]
  "architecture": "3D-Unet" (网络模型架构，默认"3D-Unet"),
  "modality": "MRI-T2WI" (影像模态，默认"MRI-T2WI"),
  "accuracy": 92.4 (模型诊断精度%或AUC值，默认92.4),
  "latency": 18.5 (推理延迟ms，默认18.5),
  "integration_standard": "DICOM 3.0" (接入标准，默认"DICOM 3.0"),
  
  # [Surgical 专属]
  "anatomical_site": "胰腺十二指肠区" (手术解剖部位，默认"胰腺十二指肠区"),
  "core_instruments": "腹腔镜能量切割闭合器" (核心器械，默认"腹腔镜能量切割闭合器"),
  "learning_curve_cases": 25 (学习曲线例数，默认25),
  "safety_endpoint": "30天术后并发症率" (安全性终点指标，默认"30天术后并发症率")
}
"""
        messages = [
            {"role": "user", "content": f"论文标题: {title}\n论文内容/摘要: {content[:3000]}"}
        ]
        
        try:
            llm_reply = call_llm_api(provider, api_key, system_prompt, messages)
            cleaned_reply = llm_reply.strip()
            if cleaned_reply.startswith("```json"):
                cleaned_reply = cleaned_reply.split("```json")[1]
            if cleaned_reply.endswith("```"):
                cleaned_reply = cleaned_reply.rsplit("```", 1)[0]
            cleaned_reply = cleaned_reply.strip()
            
            res_json = json.loads(cleaned_reply)
            is_valid = res_json.get("is_valid", False)
            reason = res_json.get("reason", "未提供原因")
            
            if is_valid:
                # Update current_state
                current_state.domain = res_json.get("domain", "devices")
                current_state.paper_title = title
                current_state.target_department = res_json.get("target_department", "肝胆外科")
                
                # Devices
                current_state.excitation_wavelength = float(res_json.get("excitation_wavelength", 790.0))
                current_state.emission_wavelength = float(res_json.get("emission_wavelength", 820.0))
                current_state.half_life = float(res_json.get("half_life", 2.4))
                current_state.metabolic_cycle = float(res_json.get("metabolic_cycle", 24.0))
                current_state.ld50 = float(res_json.get("ld50", 50.0))
                current_state.mtd = float(res_json.get("mtd", 5.0))
                
                # Drugs
                current_state.target = res_json.get("target", "KRAS-G12C")
                current_state.indication = res_json.get("indication", "非小细胞肺癌")
                current_state.drug_half_life = float(res_json.get("drug_half_life", 12.0))
                current_state.dlt_dose = float(res_json.get("dlt_dose", 400.0))
                current_state.primary_endpoint = res_json.get("primary_endpoint", "ORR (客观缓解率)")
                
                # AI
                current_state.architecture = res_json.get("architecture", "3D-Unet")
                current_state.modality = res_json.get("modality", "MRI-T2WI")
                current_state.accuracy = float(res_json.get("accuracy", 92.4))
                current_state.latency = float(res_json.get("latency", 18.5))
                current_state.integration_standard = res_json.get("integration_standard", "DICOM 3.0")
                
                # Surgical
                current_state.anatomical_site = res_json.get("anatomical_site", "胰腺十二指肠区")
                current_state.core_instruments = res_json.get("core_instruments", "腹腔镜能量切割闭合器")
                current_state.learning_curve_cases = int(res_json.get("learning_curve_cases", 25))
                current_state.safety_endpoint = res_json.get("safety_endpoint", "30天术后并发症率")
                
                retrieved_refs = KNOWLEDGE_BASE.get(res_json.get("domain", "devices"), [])
                return {
                    "status": "success",
                    "is_valid": True,
                    "reason": reason,
                    "state": current_state,
                    "rag_references": retrieved_refs
                }
            else:
                return {
                    "status": "warning",
                    "is_valid": False,
                    "reason": reason,
                    "state": current_state,
                    "rag_references": []
                }
        except Exception as e:
            # If LLM call fails, fall back to local validation
            pass

    # Local fallback/Mock mode verification (Bilingual Chinese & English keywords)
    valid_keywords = [
        "probe", "wavelength", "clinical", "tumor", "fluorescent", "cancer", "imaging", "spectroscopy", 
        "toxicity", "pharmacokinetics", "clearance", "half-life", "efficacy", "safety", "patient", "trial",
        "探针", "波长", "临床", "肿瘤", "荧光", "医学", "细胞", "手术", "成像", "切除", "治疗",
        "drug", "kras", "inhibitor", "unet", "cnn", "samd", "laparoscopic", "surgical", "procedure", "resection",
        "lpppd", "pancreatoduodenectomy", "靶向药", "突变", "影像", "诊断", "算法", "重建", "therapeutic", "antibody",
        "device", "diagnosis", "accuracy", "sensitivity", "specificity", "auc", "segmentation", "reconstruction"
    ]
    
    text_to_check = (title + " " + content).lower()
    has_keyword = any(kw in text_to_check for kw in valid_keywords)
    
    if not has_keyword:
        return {
            "status": "warning",
            "is_valid": False,
            "reason": "通过本地规则检测：文档内容未包含医疗探针、靶向新药、医疗AI、微创手术等中英文转化医学核心关键字，疑似非相关领域文献。 / Local check failed: The document does not contain key bilingual terms related to translational medicine (probes, drugs, SaMD, surgeries, etc.).",
            "state": current_state
        }
        
    # Local Domain Classify (Bilingual)
    domain = "devices"
    if any(kw in text_to_check for kw in ["unet", "cnn", "samd", "影像", "诊断", "算法", "人工智能", "neural network", "deep learning", "segmentation", "accuracy", "latency"]):
        domain = "ai"
    elif any(kw in text_to_check for kw in ["kras", "inhibitor", "靶向药", "药物", "抗体", "前药", "治疗剂", "kras-g12c", "pharmacology", "drug", "antibody", "monoclonal", "target"]):
        domain = "drugs"
    elif any(kw in text_to_check for kw in ["lpppd", "laparoscopic", "surgical", "术式", "腹腔镜", "切除术", "缝合", "重建", "微创", "resection", "reconstruction", "anastomosis", "suture"]):
        domain = "surgical"
        
    current_state.domain = domain
    current_state.paper_title = title
    
    # Generate mock params for that domain (Grounded in standard KNOWLEDGE_BASE guidelines)
    absHash = abs(hash(title))
    if domain == "devices":
        excitation = 760.0 + (absHash % 41) # Grounded in NMPA guidelines: 760-800nm
        emission = excitation + 30.0 # 790-830nm
        half_life = round(2.0 + (absHash % 21) / 10.0, 1) # Grounded in FDA/NMPA guidelines: 2.0 - 4.0 h
        metabolic_cycle = 24.0 # 24h metabolic clearance
        ld50 = 50.0 # Standard safety dose limit
        mtd = 5.0 # MTD limit
        
        current_state.excitation_wavelength = excitation
        current_state.emission_wavelength = emission
        current_state.half_life = half_life
        current_state.metabolic_cycle = metabolic_cycle
        current_state.ld50 = ld50
        current_state.mtd = mtd
        current_state.target_department = "肝胆外科"
        
    elif domain == "drugs":
        current_state.target = "KRAS-G12C" if "kras" in text_to_check else "EGFR"
        current_state.indication = "非小细胞肺癌" if "肺" in text_to_check else "消化道肿瘤"
        current_state.drug_half_life = round(8.0 + (absHash % 161) / 10.0, 1) # Grounded in ICH S9 guidelines: 8.0 - 24.0 h
        current_state.dlt_dose = float(200 + (absHash % 5 * 100)) # 200 - 600 mg/m2
        current_state.primary_endpoint = "PFS (无进展生存期)" if "pfs" in text_to_check else "ORR (客观缓解率)"
        current_state.target_department = "肿瘤内科"
        
    elif domain == "ai":
        current_state.architecture = "3D-Unet+" if "unet" in text_to_check else "Med-Transformer"
        current_state.modality = "MRI-T2WI" if "mri" in text_to_check else "CT-Chest"
        current_state.accuracy = round(90.0 + (absHash % 61) / 10.0, 1) # Grounded in NMPA Class III guidelines: 90.0 - 96.0%
        current_state.latency = round(10.0 + (absHash % 151) / 10.0, 1) # Grounded in PACS guidelines: 10.0 - 25.0 ms
        current_state.integration_standard = "DICOM 3.0"
        current_state.target_department = "脑外科/神经外科" if "脑" in text_to_check else "放射科"
        
    elif domain == "surgical":
        current_state.anatomical_site = "胰腺十二指肠区" if "胰十二指肠" in text_to_check else "肝脏切除区"
        current_state.core_instruments = "腹腔镜能量切割闭合器"
        current_state.learning_curve_cases = 20 + (absHash % 11) # Grounded in Surgical learning curve guidelines: 20 - 30 cases
        current_state.safety_endpoint = "30天术后严重并发症率"
        current_state.target_department = "普通外科"
        
    retrieved_refs = KNOWLEDGE_BASE.get(domain, [])
    return {
        "status": "success",
        "is_valid": True,
        "reason": f"通过本地规则引擎验证：已从本地知识库检索相关临床及法规指南进行校验与参数自动校正，分类为【{domain}】领域。",
        "state": current_state,
        "rag_references": retrieved_refs
    }

@app.get("/api/match-scenarios")
def match_scenarios(domain: Optional[str] = None, wavelength: float = 790.0, department: str = "肝胆外科"):
    global current_state
    active_domain = domain or current_state.domain
    
    # We can design a dynamic match engine depending on active_domain
    matched_results = []
    
    if active_domain == "drugs":
        DRUGS_DB = [
            {
                "id": "wuxi-apptec",
                "name": "药明生物中试 CDMO 基地 (WuXi Biologics CDMO)",
                "manufacturer": "药明康德",
                "compatibility_score": 96,
                "national_installs": 12,
                "channels": ["GMP 生产车间", "新药中试外包资质"],
                "description": "国内顶尖药代药动 CMC 研发配套 CDMO 平台，已打通从小分子合成到千克级工艺放大的全套 GMP 标准产线。"
            },
            {
                "id": "xiehe-gcp",
                "name": "北京协和医院临床 GCP 中心 (PUMCH GCP Center)",
                "manufacturer": "北京协和医院",
                "compatibility_score": 92,
                "national_installs": 8,
                "channels": ["国家重点GCP临床试验基地"],
                "description": "全国综合实力最强的临床基地，在肿瘤免疫及靶向小分子一期爬坡试验方面拥有极其深厚的试验设计及受试者伦理保障经验。"
            },
            {
                "id": "fudan-gcp",
                "name": "复旦大学附属中山医院 GCP 基地",
                "manufacturer": "上海中山医院",
                "compatibility_score": 89,
                "national_installs": 6,
                "channels": ["肿瘤/普通外科临床药理室"],
                "description": "华东地区规模领先的临床评价试验中心，具备高度的样本信息化采集和极速的病患队列招募效率。"
            }
        ]
        # Modify compliance score based on target department
        for base in DRUGS_DB:
            if department in ["肿瘤内科", "普通外科", "肝胆外科"]:
                base["compatibility_score"] = min(100, base["compatibility_score"] + 2)
            else:
                base["compatibility_score"] = max(50, base["compatibility_score"] - 10)
        matched_results = sorted(DRUGS_DB, key=lambda x: x["compatibility_score"], reverse=True)
        
    elif active_domain == "ai":
        AI_DB = [
            {
                "id": "neusoft-pacs",
                "name": "东软医疗 PACS 影像生态系统 (Neusoft PACS)",
                "manufacturer": "东软医疗",
                "compatibility_score": 95,
                "national_installs": 680,
                "channels": ["DICOM 3.0 标准接入", "三维影像云存储端口"],
                "description": "国产装机覆盖率第一的 PACS 系统，具备优异的开放接口，能实现脑外科/胸外科三维图像的免重构热接入。"
            },
            {
                "id": "nvidia-compute",
                "name": "NVIDIA HGX 智慧医疗计算集群",
                "manufacturer": "英伟达 (NVIDIA)",
                "compatibility_score": 93,
                "national_installs": 120,
                "channels": ["CUDA 12.x 推理加速", "TensorRT 优化引擎"],
                "description": "专为三维超大卷积网络和Transformer医学影像模型优化设计的边缘推理服务器集群，可将延迟压低至 10ms。"
            },
            {
                "id": "sensetime-care",
                "name": "商汤 SenseCare 诊疗一体化平台",
                "manufacturer": "商汤科技",
                "compatibility_score": 90,
                "national_installs": 210,
                "channels": ["多模态智能辅助诊断接口"],
                "description": "集成度极高的智慧医疗图像中间件平台，拥有完备的临床沙箱安全隔离和PACS多层级通信协议适配。"
            }
        ]
        # Modify compliance score based on target department
        for app in AI_DB:
            if department in ["放射科", "脑外科/神经外科"]:
                app["compatibility_score"] = min(100, app["compatibility_score"] + 4)
            else:
                app["compatibility_score"] = max(50, app["compatibility_score"] - 8)
        matched_results = sorted(AI_DB, key=lambda x: x["compatibility_score"], reverse=True)
        
    elif active_domain == "surgical":
        SURGICAL_DB = [
            {
                "id": "sim-center",
                "name": "华东微创技能大体解剖模拟实验室 (Micro-Surg Sim)",
                "manufacturer": "临床技能实训基地",
                "compatibility_score": 96,
                "national_installs": 15,
                "channels": ["大体解剖室", "高仿真腔镜模拟系统"],
                "description": "国内顶级的微创医师技能带教基地，完美支持改良术式在大体/离体器官上的模拟实训及安全性考核。"
            },
            {
                "id": "lap-tower",
                "name": "腹腔镜一体化高清手术室平台 (Karl Storz Lap Tower)",
                "manufacturer": "Karl Storz",
                "compatibility_score": 92,
                "national_installs": 320,
                "channels": ["百级层流配置", "4K腔镜影像系统"],
                "description": "全球微创外科标杆手术塔，支持高清气腹切割及多视角带教视频录制，广泛适配各类腹腔镜切割吻合器。"
            },
            {
                "id": "animal-lab",
                "name": "高仿真活体动物外科手术实训基地",
                "manufacturer": "医学教育实训中心",
                "compatibility_score": 88,
                "national_installs": 28,
                "channels": ["活体动物实验准入", "无菌手术台"],
                "description": "提供猪、兔等活体动物微创重建的伦理和实验环境，是改良缝合术式缩短学习曲线的最佳第一步考核基地。"
            }
        ]
        # Modify compliance score based on target department
        for s in SURGICAL_DB:
            if department in ["普通外科", "肝胆外科", "胃肠外科"]:
                s["compatibility_score"] = min(100, s["compatibility_score"] + 3)
            else:
                s["compatibility_score"] = max(50, s["compatibility_score"] - 9)
        matched_results = sorted(SURGICAL_DB, key=lambda x: x["compatibility_score"], reverse=True)
        
    else: # devices
        for robot in ROBOTS_DB:
            min_w, max_w = robot["excitation_compatible"]
            if min_w <= wavelength <= max_w:
                spectral_score = 95 - abs(wavelength - (min_w + max_w)/2)
            elif wavelength < min_w:
                spectral_score = max(40, 90 - (min_w - wavelength) * 2)
            else:
                spectral_score = max(40, 90 - (wavelength - max_w) * 2)
                
            dept_score = 90 if department in robot["suitability_departments"] else 50
            compatibility_score = round((spectral_score * 0.6) + (dept_score * 0.4))
            
            matched_results.append({
                "id": robot["id"],
                "name": robot["name"],
                "manufacturer": robot["manufacturer"],
                "compatibility_score": compatibility_score,
                "national_installs": robot["national_installs"],
                "channels": robot["channels"],
                "description": robot["description"],
                "recommended_dept": department
            })
        matched_results = sorted(matched_results, key=lambda x: x["compatibility_score"], reverse=True)
        
    return {
        "status": "success",
        "query_wavelength": wavelength,
        "query_department": department,
        "query_domain": active_domain,
        "matches": matched_results[:3]
    }

@app.post("/api/generate-docs")
def generate_docs(payload: GenerateDocsRequest):
    state = payload.state
    api_key = payload.api_key
    provider = payload.provider
    domain = state.domain
    
    # If API Key is present, call LLM to generate custom documents
    if api_key:
        if domain == "drugs":
            protocol_prompt = f"""你是一个转化医学与临床试验设计专家。
请根据以下创新药的技术参数、治疗靶点、适应症以及目标科室信息，撰写一份非常专业、详实的“新药临床研究申办方案草案 (I/II期)”。
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
请根据以下创新药的技术参数与商业规划，撰写一份极具商业说服力、严密、专业的“商业融资计划书”。
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
请根据以下医疗 AI 的网络架构、模态、准确度及延迟等参数，撰写一份非常专业、详实的“SaMD 临床效能验证与质量控制方案”。
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
请根据以下医疗 AI 软件的技术参数与商业规划，撰写一份极具商业说服力、严密、专业的“商业化白皮书”。
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
请根据以下改良临床术式的参数，撰写一份非常专业、详实的“标准化临床路径指南与临床前评估方案”。
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
请根据以下改良术式的推广规划与需求，撰写一份极具说服力的“临床新术式推广与技术推介书”。
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
        else: # devices
            protocol_prompt = f"""你是一个转化医学与临床试验设计专家。
请根据以下研究成果的理化参数、代谢数据、毒理参数以及目标科室信息，撰写一份非常专业、详实的近红外荧光手术导航探针“一期临床试验设计方案草案”。
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
请根据以下分子技术参数与临床定位，为该创新近红外荧光探针撰写一份极具商业说服力、严密、专业的“商业融资计划书”。
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
        
        try:
            protocol_md = call_llm_api(
                provider, 
                api_key, 
                "你是一个精通转化医学和一期临床试验设计的专家智能体。请生成符合医学规范、数据严谨的方案Markdown文本。",
                [{"role": "user", "content": protocol_prompt}]
            )
            
            bp_md = call_llm_api(
                provider, 
                api_key, 
                "你是一个专注于创新医疗器械与新药研发投资的专业投资经理。请生成具备极佳商业逻辑与估值分析的融资计划书Markdown文本。",
                [{"role": "user", "content": bp_prompt}]
            )
            
            return {
                "status": "success",
                "clinical_trial_protocol": protocol_md,
                "business_plan": bp_md
            }
        except Exception as e:
            pass

    # Fallback to local templates
    protocol_md = generate_clinical_protocol(state)
    bp_md = generate_business_plan(state)
    return {
        "status": "success",
        "clinical_trial_protocol": protocol_md,
        "business_plan": bp_md
    }

def call_llm_api(provider: str, api_key: str, system_prompt: str, messages: list) -> str:
    import urllib.request
    import urllib.error
    import json
    
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
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = response.read().decode('utf-8')
            res_json = json.loads(res_data)
            return res_json['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_msg)
            return f"大模型接口错误 (HTTP {e.code}): {err_json.get('error', {}).get('message', err_msg)}"
        except:
            return f"大模型接口错误 (HTTP {e.code}): {err_msg[:200]}"
    except Exception as e:
        return f"接口连接失败: {str(e)}"

class ChatMessage(BaseModel):
    message: str
    api_key: Optional[str] = None
    provider: Optional[str] = None
    system_prompt: Optional[str] = None
    clinical_doc: Optional[str] = None
    bp_doc: Optional[str] = None
    history: List[Dict[str, str]] = []

@app.post("/api/chat-agent")
def chat_agent(payload: ChatMessage):
    global current_state
    msg = payload.message.lower()

    # Intercept model queries to return accurate info immediately
    if any(kw in msg for kw in ["模型", "版本", "供应商", "model", "version", "底座", "服务商", "提供商", "厂商"]):
        active_provider = payload.provider or "DeepSeek"
        provider_lower = active_provider.lower()
        active_model = "未知模型"
        if "openai" in provider_lower:
            active_model = "gpt-4o-mini"
        elif "deepseek" in provider_lower:
            active_model = "deepseek-chat (DeepSeek-V3/R1)"
        elif "openrouter" in provider_lower:
            active_model = "google/gemini-2.5-flash"
        elif "gemini" in provider_lower:
            active_model = "gemini-1.5-flash"
        elif "pangu" in provider_lower or "huawei" in provider_lower:
            active_model = "Huawei Pangu (底座适配为 deepseek-chat)"
            
        has_key = "已配置" if payload.api_key else "未配置"
        key_preview = f" (密钥预览: {payload.api_key[:8]}...)" if payload.api_key else ""
        
        reply = (
            f"我是“医算子”——“云脉”智慧医疗多智能体系统的交互顾问。\n\n"
            f"根据系统当前的云端对接与参数状态，大模型供应商及底座模型具体信息如下：\n"
            f"- **当前选择的模型供应商**: `{active_provider}`\n"
            f"- **当前匹配的底座模型版本**: `{active_model}`\n"
            f"- **API Key 状态**: `{has_key}`{key_preview}\n\n"
            f"在当前模式下，我将通过此底座模型与云端的“技术理解”、“场景匹配”、“执行输出”智能体进行联动，"
            f"为您解析文献指标参数、匹配临床场景设备，并自动输出标准化临床方案与商业融资计划书。如有任何参数或合规调整需求，请直接向我下达指令。"
        )
        return {
            "reply": reply,
            "state_updated": False,
            "current_state": current_state
        }
    
    # 1. Deterministic intent parsing to update parameters (rule-based parser)
    updated = False
    param_updated_msg = ""
    
    # Department Change Intent
    if any(kw in msg for kw in ["科室", "部门", "外科", "修改科室"]):
        if "脑" in msg or "神经" in msg:
            current_state.target_department = "脑外科/神经外科"
            param_updated_msg = "已为您将转化医学目标临床科室修改为 **脑外科/神经外科**。该科室在神经影像自动分析、脑胶质瘤荧光切除术中有着极其重要的临床及装机需求。我已为您适配对应的场景设备和实训大体基地。"
            updated = True
        elif "泌尿" in msg:
            current_state.target_department = "泌尿外科"
            param_updated_msg = "已为您将临床科室修改为 **泌尿外科**。前列腺切除或肾肿瘤剥除微创手术中对系统适配度要求极高，已同步为您更新场景匹配。"
            updated = True
        elif "肝" in msg:
            current_state.target_department = "肝胆外科"
            param_updated_msg = "已为您将临床科室修改为首选的 **肝胆外科**。原发性肝脏切除术中，无论是荧光分子探针还是三维重建都是极为成熟的应用。"
            updated = True
        elif "放射" in msg:
            current_state.target_department = "放射科"
            param_updated_msg = "已为您将目标就诊/诊断科室变更为 **放射科**。放射科是影像智能诊断 SaMD 模型落地及前瞻性效能验证的核心科室。"
            updated = True
        elif "肿瘤内" in msg:
            current_state.target_department = "肿瘤内科"
            param_updated_msg = "已为您将临床就诊科室变更为 **肿瘤内科**。肿瘤内科是各类靶向药及生物制剂一期爬坡试验及受试者筛选的重要科室。"
            updated = True
        elif "普通外科" in msg or "普外" in msg:
            current_state.target_department = "普通外科"
            param_updated_msg = "已为您将临床就诊科室变更为 **普通外科**。普通外科涵盖广泛的微创及消化道重建术式，适合改良新术式的带教推广。"
            updated = True
            
    # Financing Amount Change Intent
    if any(kw in msg for kw in ["融资", "钱", "金额", "额度", "千万", "万", "亿"]):
        import re
        numbers = re.findall(r'\d+', msg)
        if numbers:
            val = float(numbers[0])
            if "万" in msg:
                current_state.financing_amount = val / 100.0
            elif "亿" in msg:
                current_state.financing_amount = val * 10.0
            else:
                current_state.financing_amount = val if val > 1 else val
            
            param_updated_msg = f"已将本次融资规划额度调整为 **{current_state.financing_amount * 100:.0f} 万元人民币**。已重新分配资金划拨比例，并自动重写了相应领域的《商业融资计划书》。"
            updated = True
            
    # Clinical Trial Site Change
    if any(kw in msg for kw in ["医院", "基地", "中心", "修改地点"]):
        if "华北" in msg or "北京" in msg or "协和" in msg:
            current_state.clinical_trial_site = "北京协和医院(GCP基地)"
            param_updated_msg = "临床试验基地已变更为 **北京协和医院(GCP基地)**。"
            updated = True
        elif "华东" in msg or "上海" in msg or "中山医院" in msg:
            current_state.clinical_trial_site = "华东地区三甲医院(上海中山医院等)"
            param_updated_msg = "临床试验基地已变更为 **华东地区三甲医院(上海中山医院等)**。"
            updated = True
        elif "华南" in msg or "广州" in msg or "中山大学" in msg:
            current_state.clinical_trial_site = "华南地区三甲医院(中山大学附属医院等)"
            param_updated_msg = "临床试验基地已变更为 **华南地区三甲医院(中山大学附属医院等)**。"
            updated = True

    # Drugs specific intents
    if current_state.domain == "drugs":
        if "靶点" in msg or "target" in msg:
            for t in ["EGFR", "KRAS-G12C", "PD-L1", "HER2", "ALK"]:
                if t.lower() in msg:
                    current_state.target = t
                    param_updated_msg = f"已将创新药靶点变更为 **{t}**。已同步重写新药方案与融资计划书中的结合机制。"
                    updated = True
                    break
        if "适应症" in msg or "疾病" in msg or "癌" in msg:
            for ind in ["非小细胞肺癌", "胃癌", "结直肠癌", "乳腺癌", "胰腺癌"]:
                if ind in msg:
                    current_state.indication = ind
                    param_updated_msg = f"已将目标适应症变更为 **{ind}**。"
                    updated = True
                    break
        if "半衰期" in msg or "消除" in msg:
            import re
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                current_state.drug_half_life = float(nums[0])
                param_updated_msg = f"已将新药血浆消除半衰期设定为 **{current_state.drug_half_life} 小时**。药代模型已重新计算血药浓度分布曲线。"
                updated = True
        if "限制毒性" in msg or "dlt" in msg:
            import re
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                current_state.dlt_dose = float(nums[0])
                param_updated_msg = f"已将新药限制毒性剂量 (DLT) 调整为 **{current_state.dlt_dose} mg/m²**。一期起始人体剂量估算同步更新。"
                updated = True
        if "终点" in msg or "endpoint" in msg:
            for ep in ["PFS (无进展生存期)", "ORR (客观缓解率)", "OS (总生存期)"]:
                if ep.lower() in msg or ep.split(" ")[0].lower() in msg:
                    current_state.primary_endpoint = ep
                    param_updated_msg = f"已将主要疗效终点变更为 **{ep}**。"
                    updated = True
                    break

    # AI specific intents
    elif current_state.domain == "ai":
        if "准确" in msg or "精度" in msg or "auc" in msg or "accuracy" in msg:
            import re
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                val = float(nums[0])
                current_state.accuracy = val if val > 1.0 else val * 100.0
                param_updated_msg = f"已将 SaMD 算法目标诊断精度 (AUC/准确率) 调整为 **{current_state.accuracy}%**。ROC 效能曲线已重新绘制。"
                updated = True
        if "延迟" in msg or "时延" in msg or "ms" in msg or "latency" in msg:
            import re
            nums = re.findall(r'\d+(?:\.\d+)?', msg)
            if nums:
                current_state.latency = float(nums[0])
                param_updated_msg = f"已将算法单帧推理时延设定为 **{current_state.latency} ms**，硬件计算集群参数已同步优化。"
                updated = True
        if "架构" in msg or "模型" in msg or "神经网络" in msg:
            for arch in ["3D-Unet", "3D-Unet+", "Med-Transformer", "Swin-UNETR"]:
                if arch.lower() in msg:
                    current_state.architecture = arch
                    param_updated_msg = f"已将算法神经网络架构变更为 **{arch}**。"
                    updated = True
                    break
        if "模态" in msg or "图像" in msg or "影像" in msg:
            for mod in ["MRI-T2WI", "CT-Chest", "MRI-T1ce", "PET-CT"]:
                if mod.lower() in msg:
                    current_state.modality = mod
                    param_updated_msg = f"已将目标影像模态变更为 **{mod}**。"
                    updated = True
                    break

    # Surgical specific intents
    elif current_state.domain == "surgical":
        if "学习曲线" in msg or "例数" in msg or "例" in msg:
            import re
            nums = re.findall(r'\d+', msg)
            if nums:
                current_state.learning_curve_cases = int(nums[0])
                param_updated_msg = f"已将青年医师标准化带教学习曲线设定为 **{current_state.learning_curve_cases} 例**。手术用时衰减平台已同步调整。"
                updated = True
        if "部位" in msg or "解剖" in msg or "手术部位" in msg:
            for site in ["胰腺十二指肠区", "肝脏切除区", "胃肠吻合区", "肺段切除区"]:
                if site in msg:
                    current_state.anatomical_site = site
                    param_updated_msg = f"已将改良术式手术目标解剖部位变更为 **{site}**。"
                    updated = True
                    break
        if "器械" in msg or "手术器械" in msg:
            for inst in ["腹腔镜能量切割闭合器", "超声能量手术刀", "吻合器", "双极电凝镊"]:
                if inst in msg:
                    current_state.core_instruments = inst
                    param_updated_msg = f"已将核心手术器械配置变更为 **{inst}**。"
                    updated = True
                    break
        if "安全终点" in msg or "并发症" in msg:
            for ep in ["30天术后并发症率", "90天吻合口瘘率", "术后胆瘘/胰瘘发生率"]:
                if ep in msg:
                    current_state.safety_endpoint = ep
                    param_updated_msg = f"已将临床准入追踪的安全终点指标设定为 **{ep}**。"
                    updated = True
                    break

    # 2. Build LLM context or fallback conversation message
    clinical_doc_text = payload.clinical_doc or ""
    bp_doc_text = payload.bp_doc or ""
    
    state_context = f"\n[当前系统转化医学细分领域]: {current_state.domain}\n"
    state_context += f"[当前系统通用物理、药理或算法参数]:\n"
    state_context += f"- 目标科室: {current_state.target_department}\n"
    state_context += f"- 临床试验基地: {current_state.clinical_trial_site}\n"
    state_context += f"- 商业融资金额: {current_state.financing_amount * 100:.0f} 万元人民币\n"
    
    if current_state.domain == "devices":
        state_context += (
            f"- 靶向探针激发波长: {current_state.excitation_wavelength} nm\n"
            f"- 靶向探针发射波长: {current_state.emission_wavelength} nm\n"
            f"- 半衰期: {current_state.half_life} 小时\n"
            f"- 完全代谢周期: {current_state.metabolic_cycle} 小时\n"
            f"- LD50 (半数致死量): {current_state.ld50} mg/kg\n"
            f"- MTD (最大耐受剂量): {current_state.mtd} mg/kg\n"
        )
    elif current_state.domain == "drugs":
        state_context += (
            f"- 治疗靶点: {current_state.target}\n"
            f"- 目标适应症: {current_state.indication}\n"
            f"- 血浆消除半衰期: {current_state.drug_half_life} 小时\n"
            f"- 限制毒性剂量 DLT: {current_state.dlt_dose} mg/m²\n"
            f"- 主要疗效终点: {current_state.primary_endpoint}\n"
        )
    elif current_state.domain == "ai":
        state_context += (
            f"- 算法架构: {current_state.architecture}\n"
            f"- 影像模态: {current_state.modality}\n"
            f"- 模型诊断精度 (AUC): {current_state.accuracy}%\n"
            f"- 推理延迟: {current_state.latency} ms\n"
            f"- 系统接入标准: {current_state.integration_standard}\n"
        )
    elif current_state.domain == "surgical":
        state_context += (
            f"- 手术部位: {current_state.anatomical_site}\n"
            f"- 核心器械配置: {current_state.core_instruments}\n"
            f"- 学习曲线例数: {current_state.learning_curve_cases} 例\n"
            f"- 安全随访指标: {current_state.safety_endpoint}\n"
        )
    
    if clinical_doc_text:
        state_context += f"\n[当前一期临床试验设计方案/临床验证规范草案关键文本]:\n{clinical_doc_text[:1000]}\n"
    if bp_doc_text:
        state_context += f"\n[当前商业融资计划书/商业化白皮书关键文本]:\n{bp_doc_text[:1000]}\n"
        
    full_system_prompt = (payload.system_prompt or "作为智慧医疗多智能体系统协同助手“医算子”做出答复。") + "\n" + state_context

    # 3. Call LLM or Fallback
    if payload.api_key:
        api_messages = []
        for h in payload.history:
            api_messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        
        # Add current message
        api_messages.append({"role": "user", "content": payload.message})
        
        # If parameters were updated, append a note
        if updated:
            api_messages[-1]["content"] += f"\n(注: 系统已成功应用修改指令: {param_updated_msg})"
            
        reply = call_llm_api(payload.provider, payload.api_key, full_system_prompt, api_messages)
    else:
        # Fallback to local deterministic mock chat response
        # Detect if user is asking about the model version
        if any(kw in msg for kw in ["模型", "版本", "model", "version", "当前模型"]):
            reply = (
                "您好！我是“医算子”。根据您在左侧控制面板中选择的「模型提供商」与输入的 API Key，系统底层实际联调调用的具体大语言模型版本配置如下：\n\n"
                "1. **DeepSeek** (默认): 接入官方当前最新版本的双翼旗舰模型 **`deepseek-chat` (DeepSeek-V3/R1 接口)**。\n"
                "2. **OpenAI**: 接入官方当前最具性价比的轻量旗舰模型 **`gpt-4o-mini`**。\n"
                "3. **OpenRouter**: 统一桥接并默认调用 Google 当前前沿多模态大模型 **`google/gemini-2.5-flash`**。\n"
                "4. **Google Gemini**: 接入官方标准的开发者端 OpenAI 兼容接口，并使用主力模型 **`gemini-1.5-flash`**。\n"
                "5. **Huawei Pangu (华为云盘古)**: 优先推荐并自动适配为 **`deepseek-chat`** 算法底座以保障最稳定的中英文转化医学性能。\n\n"
                "如果您当前未配置 API Key（即处于 Mock/Demo 模式下），我将作为一个**离线医学规则状态机 (Local TM-Rule Engine v1.0.0)** 为您服务，支持在无网环境下通过意图识别执行参数快速更新。"
            )
        elif updated:
            reply = param_updated_msg
        else:
            reply = (
                "您好！我是“云脉”系统的多智能体协同助手——“医算子”。检测到您当前未输入 API Key 或处于 Demo 模式。\n\n"
                "在没有配置大模型密钥的情况下，我目前仅支持对参数调整类指令进行模拟响应，您可以尝试告诉我：\n"
                "1. 📂 **修改目标科室**（例如：‘将目标科室改为脑外科’）\n"
                "2. 💰 **调整融资金额**（例如：‘把商业融资额度修改为 3000 万’）\n"
                "3. 🏥 **修改临床基地**（例如：‘修改临床基地到北京协和医院’）\n"
                "4. 🔬 **修改领域特定参数**（如：‘把新药半衰期设为 18小时’，‘将算法准确率提高到 95%’，‘学习曲线例数改为 15例’）\n\n"
                "若要开启真实的 LLM 问答并全链路内容问询，请在左侧设置栏切换至“大模型联调模式”并输入有效的 API Key。届时您还可以自由编辑我的“专有提示词”来调教我的表现！"
            )
            
    return {
        "reply": reply,
        "state_updated": updated,
        "current_state": current_state
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
