import type { AppParams, DiffItem } from '../lib/types';

const toInt = (val: number | string) => Math.round(Number(val) || 0);

export function generateClinicalDoc(state: AppParams): string {
  const domain = state.domain || 'devices';

  if (domain === 'drugs') {
    const target = state.target || 'KRAS-G12C';
    const indication = state.indication || '非小细胞肺癌';
    const halfLife = state.drug_half_life || 12.0;
    const dltDose = state.dlt_dose || 400.0;
    return `# 🏥 《${state.paper_title}》临床试验设计方案草案 (Phase I/II)

## 1. 试验基本信息与研究目的
* **研发靶点**：${target}
* **目标适应症**：${indication}
* **试验分期**：I 期临床研究 (IND 获批后阶段)
* **首要目的**：在受试者中评估靶向药物对 ${indication} 的耐受性、安全性，并确定最大耐受剂量 (MTD) 及限制毒性剂量 (DLT)。
* **次要目的**：测定单次与多次给药的药代动力学参数（血浆消除半衰期预计为 ${halfLife} 小时），并评估主要疗效终点（${state.primary_endpoint || 'ORR (客观缓解率)'}）。

## 2. 受试者入组与排除标准
### 2.1 入组标准
1. 年龄 18 至 75 周岁，确诊为晚期 ${indication} 且经过标准治疗失败的患者。
2. 具有可测量病灶（符合 RECIST 1.1 标准），主要脏器功能符合入组要求。
3. 拟开展一期研究科室：**${state.target_department}**。
4. 自愿在 **${state.clinical_trial_site}** 进行全程监测并签署知情同意书。

### 2.2 排除标准
1. 入组前 4 周内接受过大手术或系统性抗肿瘤治疗者。
2. 具有明显的排泄/代谢障碍（血浆消除半衰期达 ${halfLife} 小时，肝肾代谢严重不全时蓄积毒性风险高）。
3. 有严重心脑血管疾病或无法控制的脑转移患者。

## 3. 给药剂量与安全保障
* **起始剂量推算**：根据非临床毒理学试验确立的限制毒性剂量 DLT 为 ${dltDose} mg/m²，人体起始剂量采用 1/10 DLT，即 **${(dltDose * 0.1).toFixed(1)} mg/m²**。
* **爬坡方案**：采用标准“3+3”剂量递增设计，设 4 个爬坡剂量组。
* **毒性监测**：严密观察血常规及心电图，在给药后 24-48 小时内重点观测剂量限制性毒性反应。

## 4. 试验设计与进度规划
* **受试者规模**：计划入组 **${state.sample_size}** 例患者。
* **临床试验中心**：由 **${state.clinical_trial_site}** 伦理委员会批准后在 GCP 中心实施。
* **操作周期**：项目周期预计为 **${state.phase_1_duration} 个月**。
`;
  }

  if (domain === 'ai') {
    const arch = state.architecture || '3D-Unet';
    const modality = state.modality || 'MRI-T2WI';
    const acc = state.accuracy || 92.4;
    const latency = state.latency || 18.5;
    const std = state.integration_standard || 'DICOM 3.0';
    return `# 🏥 《${state.paper_title}》SaMD 临床效能验证与质量控制方案

## 1. 试验基本信息与研究目的
* **软件分类**：医疗器械软件 (SaMD - Software as a Medical Device)
* **模型架构**：基于 ${arch} 的三维医学影像分析模型
* **影像模态**：支持 ${modality} 三维图像自动处理
* **首要目的**：通过回顾性与前瞻性临床队列，验证 SaMD 算法对病灶检出和分级的灵敏度与特异度（目标 AUC 精度达 ${acc}%）。
* **次要目的**：评估模型在边缘计算环境的推理延迟（平均延迟控制在 ${latency} ms 以内），保障临床实时阅片应用可行性。

## 2. 影像数据入组与排除标准
### 2.1 入组标准
1. 在 **${state.clinical_trial_site}** 影像数据库中建档的 ${modality} 图像，具备完整的病理学诊断金标准。
2. 图像分辨率、层厚符合临床规范，DICOM 标准头文件信息完整，主治/诊断科室为 **${state.target_department}**。
3. 图像无严重伪影，病灶边界清晰可见。

### 2.2 排除标准
1. 影像质量低下（伪影严重、扫描范围不全、无对比度增强相）。
2. 不符合 ${std} 规范、无法被软件自动解析的非标准格式数据。

## 3. 临床对比测试与金标准建立
* **金标准建立**：以三位资深高年资主治医师的联合阅片及组织病理学诊断为金标准。
* **软件运算与延迟**：图像输入系统后，SaMD 模型在边缘 GPU 服务器运行，要求单次推理延迟不超过 **${latency} ms**，全程保持数据沙箱隔离。
* **效能评估**：计算模型输出的特异性、敏感性与一致性 kappa 指标，目标综合准确度不低于 **${acc}%**。

## 4. 试验设计与进度规划
* **样本规模**：回顾性收集不少于 **${state.sample_size * 10} 例** 患者的脱敏影像病例。
* **测试中心**：在 **${state.clinical_trial_site}** 信息科与 **${state.target_department}** 联合开展临床效能评价。
* **项目周期**：预计研发与临床效能验证总耗时 **${state.phase_1_duration} 个月**。
`;
  }

  if (domain === 'surgical') {
    const site = state.anatomical_site || '胰腺十二指肠区';
    const inst = state.core_instruments || '腹腔镜能量切割闭合器';
    const cases = state.learning_curve_cases || 25;
    const safety = state.safety_endpoint || '30天术后并发症率';
    return `# 🏥 《${state.paper_title}》创新临床术式标准化路径指南与临床前评估

## 1. 术式基本信息与开发目的
* **手术解剖部位**：${site}
* **核心器械配置**：${inst}
* **主要评估目的**：规范并在科室推广完全镜下 ${site} 切除与改良缝合重建术式，缩短青年医师学习曲线。
* **临床安全终点**：在临床准入阶段严密追踪患者术后并发症发生情况，要求首批开展病例的“${safety}”优于传统开腹或常规腔镜对照组。

## 2. 受试患者入组与排除标准
### 2.1 入组标准
1. 影像学诊断为 ${site} 良恶性肿瘤，具备明确微创腔镜手术指征者。
2. 心肺功能良好，能耐受气腹及长时间全身麻醉。
3. 就诊科室：**${state.target_department}**。
4. 自愿在 **${state.clinical_trial_site}** 接受改良术式治疗并签署特别知情同意书。

### 2.2 排除标准
1. 肿瘤严重侵犯周围大血管，预估完全腔镜下无法安全游离重建者。
2. 具有凝血功能障碍或高度恶病质，术后伤口愈合极度不良者。

## 3. 术式核心流程与操作质控
* **核心器械操作**：全程采用 **${inst}** 进行精细切割、止血和缝合关闭。
* **青年医师带教**：设定 **${cases} 例** 的学习曲线目标，参与医师需在大体解剖室进行模拟训练方能进入一期临床实操。
* **安全性追踪**：重点跟踪并登记术后吻合口漏、延迟愈合以及“**${safety}**”，若发生严重三级并发症需立刻中止准入流程。

## 4. 临床前评估与示范规划
* **样本量**：临床准入示范案例共 **${state.sample_size}** 例。
* **基地选址**：在 **${state.clinical_trial_site}** 微创手术中心开展首期应用。
* **推广周期**：标准流程固化与科室医师培训周期预计为 **${state.phase_1_duration} 个月**。
`;
  }

  const probeId = toInt(state.excitation_wavelength);
  return `# 🏥 《${state.paper_title}》一期临床试验设计方案草案 (Phase I)

## 1. 试验基本信息与研究目的
* **产品名称**：基于 ${state.excitation_wavelength}nm 激发的早期肿瘤靶向荧光探针（FL-Probe-${probeId}）
* **研发代号**：OPC-MED-001
* **试验分期**：I 期临床试验 (Phase I)
* **首要目的**：评估健康受试者及早期肿瘤患者单次静脉注射 FL-Probe-${probeId} 的安全性、耐受性以及药代动力学（PK）特征。
* **次要目的**：初步探索探针在术中导航的显像对比度、最佳显像时间窗口以及主要脏器蓄积情况。

## 2. 受试者入组与排除标准
### 2.1 入组标准 (Inclusion Criteria)
1. 年龄 18 至 75 周岁，男女不限。
2. 经病理学或影像学诊断为早期肿瘤，且计划在 **${state.clinical_trial_site}** 进行手术切除。
3. 拟切除病灶符合术中荧光显像导航指征，主治科室为：**${state.target_department}**。
4. 主要脏器功能良好（血常规、肝肾功能指标符合临床试验要求）。
5. 自愿参加本试验并签署知情同意书。

### 2.2 排除标准 (Exclusion Criteria)
1. 有严重过敏史，或对近红外造影材料（如吲哚菁绿 ICG）过敏者。
2. 严重肝功能不全（Child-Pugh C 级）或肾功能严重受损患者（排泄半衰期为 **${state.half_life} 小时**，需通过肾脏代谢清除）。
3. 孕期或哺乳期妇女。

## 3. 给药剂量与安全保障
* **起始剂量推算**：根据非临床毒理学试验得出的安全参数（最大耐受剂量 MTD 为 ${state.mtd} mg/kg，半数致死量 LD50 为 ${state.ld50} mg/kg），采用 1/10 MTD 作为人体起始剂量，即给药浓度为 **${(state.mtd * 0.1).toFixed(2)} mg/kg**。
* **给药方式**：术前 2 至 4 小时进行外周静脉注射，注射速率恒定。
* **排泄监视**：由于探针完全代谢周期为 **${state.metabolic_cycle} 小时**，在给药后 24 小时内需严密监测尿液及主要器官的荧光蓄积情况。

## 4. 试验设计与进度规划
* **设计类型**：单中心、开放性、剂量递增设计。
* **受试者规模**：预计入组 **${state.sample_size}** 例患者。
* **临床中心**：由 **${state.clinical_trial_site}** 科研伦理委员会批准并组织实施。
* **操作周期**：项目周期预计为 **${state.phase_1_duration} 个月**。
`;
}

export function generateBpDoc(state: AppParams): string {
  const domain = state.domain || 'devices';
  const financingWan = Math.round(state.financing_amount * 100);

  if (domain === 'drugs') {
    const target = state.target || 'KRAS-G12C';
    const indication = state.indication || '非小细胞肺癌';
    const halfLife = state.drug_half_life || 12.0;
    const dltDose = state.dlt_dose || 400.0;
    return `# 🚀 创新靶向新药（FL-Target-${target}）临床开发与商业融资计划书

## 1. 行业痛点与未满足的临床需求
目前在晚期 ${indication} 临床治疗中，传统化疗和免疫治疗面临响应率低、耐药性强和全身系统毒性高的瓶颈。针对 ${target} 突变或过表达靶点的创新靶向小分子药是当前行业突破口，旨在通过高特异性口袋结合设计攻克耐药难题。

## 2. 核心技术壁垒与优势
* **高亲和力靶向机制**：对 ${target} 具有纳摩级 (nM) 抑制活性，选择性高，脱靶毒性低。
* **卓越药代特征**：血浆半衰期达 **${halfLife} 小时**，给药顺应性高，体内起效浓度维持时间长。
* **安全性宽裕**：限制毒性剂量 DLT 为 **${dltDose} mg/m²**，非临床安全性窗口宽。

## 3. 市场定位与产业化配套对接
通过场景匹配 Agent，已与国内顶级医药工业制造（CDMO）平台形成中试产线 GMP 合作意向，并在目标三甲医院 **${state.target_department}** 建立示范招募中心。

## 4. 融资规划与资金用途
* **融资金额**：**${financingWan} 万人民币**（${state.financing_amount} Million RMB）。
* **出让股权**：10% - 15%（视最终路演及协议确定）。
* **资金划拨与用途**：
  1. **60%** 用于在 **${state.clinical_trial_site}** 开展临床 I/II 期推进（招募 ${state.sample_size} 例受试者，耗时 ${state.phase_1_duration} 个月）。
  2. **20%** 用于完成管线在 CDMO 平台的中试药学（CMC）及原料药生产验证。
  3. **20%** 用于研发团队激励、知识产权全球防御布局及二代后备管线立项。

## 5. 项目里程碑规划
* **Q1-Q2**：向国家药监局递交正式 IND 申报，并在一期基地通过伦理审查。
* **Q3-Q4**：启动首组剂量组爬坡，评估 DLT 安全指标。
* **次年**：完成全部 **${state.sample_size} 例** 队列招募并公布初步 ${state.primary_endpoint || 'ORR'} 药效终点数据。
`;
  }

  if (domain === 'ai') {
    const arch = state.architecture || '3D-Unet';
    const modality = state.modality || 'MRI-T2WI';
    const acc = state.accuracy || 92.4;
    const latency = state.latency || 18.5;
    const std = state.integration_standard || 'DICOM 3.0';
    return `# 🚀 创新 SaMD 医疗影像辅助智能诊断软件（AI-Vision-SaMD）商业化白皮书

## 1. 行业痛点与未满足的临床需求
在临床放射和阅片流程中，阅片医生工作量高度饱和，对微小/边缘病灶漏诊率达 15%-20%。在 **${state.target_department}** 中，本 SaMD 软件基于 ${arch} 架构，实现 ${modality} 三维图像的像素级自动勾画与术前精准规划。

## 2. 核心技术壁垒与优势
* **诊断准确性领先**：独立测试集 AUC 精度达 **${acc}%**。
* **超低推理延迟**：TensorRT 优化后单帧推理仅 **${latency} ms**，满足实时阅片高吞吐需求。
* **标准无缝接入**：完全兼容 **${std}** 协议规范，无需重构医院原有 PACS 系统。

## 3. 市场定位与医院信息化生态集成
首批切入三甲医院 **${state.target_department}** 与放射科，已完成主流 PACS 生态联调，具备跨院区快速部署能力。

## 4. 融资规划与资金用途
* **融资金额**：**${financingWan} 万人民币**（${state.financing_amount} Million RMB）。
* **资金划拨与用途**：
  1. **50%** 用于在 **${state.clinical_trial_site}** 等影像中心开展前瞻性效能验证（评估 ${state.sample_size * 10} 例样本，耗时 ${state.phase_1_duration} 个月）。
  2. **30%** 用于国产化边缘算力适配及 NMPA 三类医疗器械 SaMD 注册申报。
  3. **20%** 用于核心算法工程师招募与医院渠道预售。

## 5. 项目里程碑规划
* **Q1-Q2**：获得三类医疗器械分类界定并完成临床试验伦理备案。
* **Q3-Q4**：联合 **${state.clinical_trial_site}** 完成 **${state.sample_size * 10} 例** 对比评价并提交注册。
* **次年**：启动百家医院 PACS 装机推广与 SaaS 订阅变现。
`;
  }

  if (domain === 'surgical') {
    const site = state.anatomical_site || '胰腺十二指肠区';
    const inst = state.core_instruments || '腹腔镜能量切割闭合器';
    const cases = state.learning_curve_cases || 25;
    const safety = state.safety_endpoint || '30天术后并发症率';
    return `# 🚀 腹腔镜下改良 ${site} 临床新术式推广与技术推介书

## 1. 行业痛点与未满足的临床需求
传统针对 ${site} 的腔镜大范围切除与吻合重建学习曲线漫长、吻合口漏风险高。本术式改良切除游离与缝合路径，配合 **${inst}** 大幅降低操作门槛。

## 2. 核心技术特征与优势
* **安全终点优异**：术后“**${safety}**”显著低于常规对照组。
* **培训门槛低**：青年医师标准化学习曲线缩短至 **${cases} 例**。
* **器械兼容度高**：全面适配常规 4K 腔镜手术塔与 **${inst}**，无重资产采购负担。

## 3. 市场推广与教学基地构建
首期实训中心设立于 **${state.clinical_trial_site}**，通过高仿真大体标本与动物实验规范带教，向周边医院 **${state.target_department}** 辐射准入。

## 4. 融资规划与资金用途
* **融资金额**：**${financingWan} 万人民币**（${state.financing_amount} Million RMB）。
* **资金划拨与用途**：
  1. **60%** 用于在 **${state.clinical_trial_site}** 开展为期 **${state.phase_1_duration} 个月** 的进修培训及首批 **${cases} 例** 大体实训。
  2. **20%** 用于手术标准操作指南撰写、专家共识发布及学术推广。
  3. **20%** 用于带教模拟器研发与器械包定制。

## 5. 项目里程碑规划
* **Q1-Q2**：录制改良术式标准演示案例并完成伦理安全审定。
* **Q3-Q4**：完成首批进修医师招募与示范带教。
* **次年**：发布多中心随访数据并推动写入微创手术临床路径指南。
`;
  }

  const probeId = toInt(state.excitation_wavelength);
  return `# 🚀 创新早期肿瘤切除荧光探针（FL-Probe-${probeId}）商业融资计划书

## 1. 行业痛点与未满足的临床需求
在早期肿瘤切除手术中，医生难以仅凭肉眼精确界定肿瘤边界。在 **${state.target_department}** 高难度切除术中，本产品结合 AI4S 靶向探针与荧光手术机器人实现毫米级实时导航，显著降低病灶残留率。

## 2. 核心技术壁垒与优势
* **靶向精准度**：特异性结合早期肿瘤细胞，信噪比 (TBR) > 5.5。
* **物理性能优异**：激发波长 **${state.excitation_wavelength} nm**、发射光谱 **${state.emission_wavelength} nm**，组织穿透深度达 1.5 cm，完美匹配主流手术机器人荧光通道。
* **极佳安全性**：代谢周期 **${state.metabolic_cycle} 小时**，半衰期 **${state.half_life} 小时**，LD50 达 **${state.ld50} mg/kg**、MTD 为 **${state.mtd} mg/kg**，安全窗口达 **${Math.max(1, Math.round(state.ld50 / Math.max(0.1, state.mtd)))}×**。

## 3. 市场定位与设备兼容性匹配
通过场景匹配 Agent，已精准对接国内装机的荧光手术机器人系统，完美兼容本探针的 ${state.excitation_wavelength}nm 激发光谱，在 **${state.target_department}** 具备明确商业落地基础。

## 4. 融资规划与资金用途
* **融资金额**：**${financingWan} 万人民币**（${state.financing_amount} Million RMB）。
* **资金划拨与用途**：
  1. **60%** 用于在 **${state.clinical_trial_site}** 开展 I 期临床试验（计划招募 **${state.sample_size}** 例受试者，耗时 **${state.phase_1_duration}** 个月）。
  2. **20%** 用于中试车间的 GMP 升级与药学研究（CMC）。
  3. **20%** 用于核心研发团队建设、专利全球布局以及后续管线研发。

## 5. 项目里程碑规划
* **Q1-Q2**：完成 IND 临床试验申报批件获取，在首家临床基地启动伦理审查。
* **Q3-Q4**：招募首组受试者，完成首批安全剂量组爬坡试验。
* **次年**：完成全部 **${state.sample_size} 例** 临床案例收集并启动 Phase II 筹备。
`;
}

const FIELD_META: Array<{
  key: keyof AppParams;
  label: string;
  format?: (v: any) => string;
}> = [
  { key: 'financing_amount', label: '融资额度', format: (v) => `${Math.round(Number(v) * 100)}万` },
  { key: 'clinical_trial_site', label: '临床基地' },
  { key: 'target_department', label: '目标科室' },
  { key: 'excitation_wavelength', label: '激发波长', format: (v) => `${v} nm` },
  { key: 'emission_wavelength', label: '发射波长', format: (v) => `${v} nm` },
  { key: 'half_life', label: '半衰期 T₁/₂', format: (v) => `${v} h` },
  { key: 'metabolic_cycle', label: '完全代谢时间', format: (v) => `${v} h` },
  { key: 'ld50', label: '半数致死量 LD₅₀', format: (v) => `${v} mg/kg` },
  { key: 'mtd', label: '最大耐受剂量 MTD', format: (v) => `${v} mg/kg` },
  { key: 'target', label: '治疗靶点' },
  { key: 'indication', label: '目标适应症' },
  { key: 'drug_half_life', label: '血浆半衰期', format: (v) => `${v} h` },
  { key: 'dlt_dose', label: '限制毒性剂量 DLT', format: (v) => `${v} mg/m²` },
  { key: 'primary_endpoint', label: '主要有效终点' },
  { key: 'architecture', label: '算法架构' },
  { key: 'modality', label: '影像模态' },
  { key: 'accuracy', label: '诊断精度 AUC', format: (v) => `${v}%` },
  { key: 'latency', label: '推理延迟', format: (v) => `${v} ms` },
  { key: 'integration_standard', label: '接入标准' },
  { key: 'anatomical_site', label: '解剖部位' },
  { key: 'core_instruments', label: '核心器械' },
  { key: 'learning_curve_cases', label: '学习曲线', format: (v) => `${v} 例` },
  { key: 'safety_endpoint', label: '安全终点' },
  { key: 'sample_size', label: '样本规模', format: (v) => `${v} 例` },
  { key: 'phase_1_duration', label: '周期', format: (v) => `${v} 个月` },
];

export function computeStateDiffs(prev: AppParams, next: AppParams): DiffItem[] {
  const diffs: DiffItem[] = [];
  for (const field of FIELD_META) {
    const oldVal = prev[field.key];
    const newVal = next[field.key];
    if (String(oldVal) !== String(newVal)) {
      const fmt = field.format || ((v: any) => String(v));
      diffs.push({
        label: field.label,
        before: fmt(oldVal),
        after: fmt(newVal),
      });
    }
  }
  return diffs;
}
