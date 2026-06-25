import { RAGReference, PresetPaper, RobotMatch, AppParams } from './types';

export const BACKEND_URL = "http://127.0.0.1:8000/api";

export const FRONTEND_KNOWLEDGE_BASE: Record<string, RAGReference[]> = {
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
      "content": "SaMD在医院部署必须严格符合 DICOM 3.0 协议规范。系统应通过标准的C-STORE/C-MOVE服务与 PACS 影像云进行数据通信，图像传输及特征脱敏应在内网隔离沙箱中进行以满足患者隐私保密安全等级要求。"
    }
  ],
  "surgical": [
    {
      "source": "《微创外科新技术与新术式临床准入管理规范》",
      "title": "改良腹腔镜切除术与安全随访终点设定",
      "content": "对于腹腔镜微创胰十二指肠切除或吻合新术式的临床准入，科室首批开展案例需由资深高年资主治医师全程指导。主要安全性追踪指标为'30天术后严重并发症发生率'（按 Clavien-Dindo 分级三级以上发生率不得高于5%），同时需严密随访吻合口漏、延迟胃排空及胰瘘。"
    },
    {
      "source": "微创外科医学教育协会《青年医师微创手术学习曲线规范》",
      "title": "手术操作熟练度与学习曲线(Cases)收敛平台",
      "content": "腹腔镜复杂吻合术式的学习曲线分析显示，随着青年医师操作案例数的累积，平均手术时间呈现明显的负指数收敛。一般在经过 20-30 例标准带教实训及大体模拟考核后，手术时间、术中出血量及术后胃排空延迟发生率进入相对平稳的'技术成熟平台期'。"
    }
  ]
};

export const DEFAULT_ROBOTS: RobotMatch[] = [
  {
    id: "davinci-xi",
    name: "达芬奇 Xi (Da Vinci Xi)",
    manufacturer: "Intuitive Surgical",
    compatibility_score: 95,
    national_installs: 420,
    channels: ["近红外荧光通道 (Firefly)"],
    description: "全球市场占有率最高的多孔手术机器人，Firefly 荧光显微系统完美支持近红外一区/二区荧光成像。"
  },
  {
    id: "toumai",
    name: "图迈 (Toumai)",
    manufacturer: "微创机器人",
    compatibility_score: 92,
    national_installs: 150,
    channels: ["三维高清近红外内窥镜通道"],
    description: "国产多孔手术机器人翘楚，具备极佳的近红外光谱分辨率，荧光显像清晰度达 4K 级别。"
  },
  {
    id: "shurui",
    name: "术锐 (Shurui)",
    manufacturer: "术锐机器人",
    compatibility_score: 88,
    national_installs: 85,
    channels: ["单孔荧光内窥镜成像系统"],
    description: "单孔手术机器人领军者，专为狭窄体腔设计，其荧光光源能量高度集中于 790-800nm。"
  }
];

const SHARED_PARAMS: Omit<AppParams, 'domain' | 'paper_title' | 'target_department' | 'financing_amount' | 'clinical_trial_site' | 'phase_1_duration' | 'sample_size'> & Pick<AppParams, 'domain' | 'paper_title' | 'target_department' | 'financing_amount' | 'clinical_trial_site' | 'phase_1_duration' | 'sample_size'> = {
  domain: "devices",
  paper_title: "",
  target_department: "肝胆外科",
  financing_amount: 15.0,
  clinical_trial_site: "华东地区三甲医院",
  phase_1_duration: 12,
  sample_size: 20,
  excitation_wavelength: 790.0,
  emission_wavelength: 820.0,
  metabolic_cycle: 24.0,
  half_life: 2.4,
  ld50: 50.0,
  mtd: 5.0,
  target: "KRAS-G12C",
  indication: "非小细胞肺癌",
  drug_half_life: 12.0,
  dlt_dose: 400.0,
  primary_endpoint: "ORR (客观缓解率)",
  architecture: "3D-Unet",
  modality: "MRI-T2WI",
  accuracy: 92.4,
  latency: 18.5,
  integration_standard: "DICOM 3.0",
  anatomical_site: "胰腺十二指肠区",
  core_instruments: "腹腔镜能量切割闭合器",
  learning_curve_cases: 25,
  safety_endpoint: "30天术后并发症率"
};

export const PRESET_PAPERS: PresetPaper[] = [
  {
    id: "devices-default",
    domain: "devices",
    title: "新型荧光探针在早期肿瘤切除手术中的应用",
    year: 2026,
    recommend: "推荐用于术中导航",
    params: {
      ...SHARED_PARAMS,
      domain: "devices",
      paper_title: "新型荧光探针在早期肿瘤切除手术中的应用",
      target_department: "肝胆外科",
      financing_amount: 15.0,
      clinical_trial_site: "华东地区三甲医院",
      phase_1_duration: 12,
      sample_size: 20,
    }
  },
  {
    id: "drugs-default",
    domain: "drugs",
    title: "一种面向非小细胞肺癌的靶向 KRAS-G12C 突变创新药前药临床前研究",
    year: 2026,
    recommend: "推荐开展新药临床试验",
    params: {
      ...SHARED_PARAMS,
      domain: "drugs",
      paper_title: "一种面向非小细胞肺癌的靶向 KRAS-G12C 突变创新药前药临床前研究",
      target_department: "肿瘤内科",
      financing_amount: 45.0,
      clinical_trial_site: "北京协和医院(GCP基地)",
      phase_1_duration: 24,
      sample_size: 40,
    }
  },
  {
    id: "ai-default",
    domain: "ai",
    title: "基于三维卷积神经网络的脑胶质瘤 MRI 图像术前智能分级与边界分割系统",
    year: 2026,
    recommend: "推荐用于 SaMD 系统部署",
    params: {
      ...SHARED_PARAMS,
      domain: "ai",
      paper_title: "基于三维卷积神经网络的脑胶质瘤 MRI 图像术前智能分级与边界分割系统",
      target_department: "脑外科/神经外科",
      financing_amount: 8.0,
      clinical_trial_site: "华东地区三甲医院",
      phase_1_duration: 10,
      sample_size: 30,
    }
  },
  {
    id: "surgical-default",
    domain: "surgical",
    title: "完全腹腔镜下保留幽门的胰十二指肠切除术（LPPPD）改良术式与临床效能分析",
    year: 2026,
    recommend: "推荐微创术式标准化推广",
    params: {
      ...SHARED_PARAMS,
      domain: "surgical",
      paper_title: "完全腹腔镜下保留幽门的胰十二指肠切除术（LPPPD）改良术式与临床效能分析",
      target_department: "普通外科",
      financing_amount: 5.0,
      clinical_trial_site: "华南地区三甲医院(中山大学附属医院等)",
      phase_1_duration: 18,
      sample_size: 25,
    }
  }
];

export const DEFAULT_STATE: AppParams = PRESET_PAPERS[0].params;

export const DRUGS_ROBOTS: RobotMatch[] = [
  {
    id: "wuxi-apptec",
    name: "药明生物中试 CDMO 基地 (WuXi Biologics CDMO)",
    manufacturer: "药明康德",
    compatibility_score: 96,
    national_installs: 12,
    channels: ["GMP 生产车间", "新药中试外包资质"],
    description: "国内顶尖药代药动 CMC 研发配套 CDMO 平台，已打通从小分子合成到千克级工艺放大的全套 GMP 标准产线。"
  },
  {
    id: "xiehe-gcp",
    name: "北京协和医院临床 GCP 中心 (PUMCH GCP Center)",
    manufacturer: "北京协和医院",
    compatibility_score: 92,
    national_installs: 8,
    channels: ["国家重点GCP临床试验基地"],
    description: "全国综合实力最强的临床基地，在肿瘤免疫及靶向小分子一期爬坡试验方面拥有极其深厚的试验设计及受试者伦理保障经验。"
  },
  {
    id: "fudan-gcp",
    name: "复旦大学附属中山医院 GCP 基地",
    manufacturer: "上海中山医院",
    compatibility_score: 89,
    national_installs: 6,
    channels: ["肿瘤/普通外科临床药理室"],
    description: "华东地区规模领先的临床评价试验中心，具备高度的样本信息化采集和极速的病患队列招募效率。"
  }
];

export const AI_ROBOTS: RobotMatch[] = [
  {
    id: "neusoft-pacs",
    name: "东软医疗 PACS 影像生态系统 (Neusoft PACS)",
    manufacturer: "东软医疗",
    compatibility_score: 95,
    national_installs: 680,
    channels: ["DICOM 3.0 标准接入", "三维影像云存储端口"],
    description: "国产装机覆盖率第一的 PACS 系统，具备优异的开放接口，能实现脑外科/胸外科三维图像的免重构热接入。"
  },
  {
    id: "nvidia-compute",
    name: "NVIDIA HGX 智慧医疗计算集群",
    manufacturer: "英伟达 (NVIDIA)",
    compatibility_score: 93,
    national_installs: 120,
    channels: ["CUDA 12.x 推理加速", "TensorRT 优化引擎"],
    description: "专为三维超大卷积网络和Transformer医学影像模型优化设计的边缘推理服务器集群，可将延迟压低至 10ms。"
  },
  {
    id: "sensetime-care",
    name: "商汤 SenseCare 诊疗一体化平台",
    manufacturer: "商汤科技",
    compatibility_score: 90,
    national_installs: 210,
    channels: ["多模态智能辅助诊断接口"],
    description: "集成度极高的智慧医疗图像中间件平台，拥有完备的临床沙箱安全隔离和PACS多层级通信协议适配。"
  }
];

export const SURGICAL_ROBOTS: RobotMatch[] = [
  {
    id: "sim-center",
    name: "华东微创技能大体解剖模拟实验室 (Micro-Surg Sim)",
    manufacturer: "临床技能实训基地",
    compatibility_score: 96,
    national_installs: 15,
    channels: ["大体解剖室", "高仿真腔镜模拟系统"],
    description: "国内顶级的微创医师技能带教基地，完美支持改良术式在大体/离体器官上的模拟实训及安全性考核。"
  },
  {
    id: "lap-tower",
    name: "腹腔镜一体化高清手术室平台 (Karl Storz Lap Tower)",
    manufacturer: "Karl Storz",
    compatibility_score: 92,
    national_installs: 320,
    channels: ["百级层流配置", "4K腔镜影像系统"],
    description: "全球微创外科标杆手术塔，支持高清气腹切割及多视角带教视频录制，广泛适配各类腹腔镜切割吻合器。"
  },
  {
    id: "animal-lab",
    name: "高仿真活体动物外科手术实训基地",
    manufacturer: "医学教育实训中心",
    compatibility_score: 88,
    national_installs: 28,
    channels: ["活体动物实验准入", "无菌手术台"],
    description: "提供猪、兔等活体动物微创重建的伦理和实验环境，是改良缝合术式缩短学习曲线的最佳第一步考核基地。"
  }
];

export const VALID_KEYWORDS = [
  "probe", "wavelength", "clinical", "tumor", "fluorescent", "cancer", "imaging", "spectroscopy",
  "toxicity", "pharmacokinetics", "clearance", "half-life", "efficacy", "safety", "patient", "trial",
  "探针", "波长", "临床", "肿瘤", "荧光", "医学", "细胞", "手术", "成像", "切除", "治疗",
  "drug", "kras", "inhibitor", "unet", "cnn", "samd", "laparoscopic", "surgical", "procedure", "resection",
  "lpppd", "pancreatoduodenectomy", "靶向药", "突变", "影像", "诊断", "算法", "重建", "therapeutic", "antibody",
  "device", "diagnosis", "accuracy", "sensitivity", "specificity", "auc", "segmentation", "reconstruction"
];

export const DEFAULT_SYSTEM_PROMPT = "作为"云脉"系统的协同助手"医算子"，你需要结合学术论文中的理化与药代指标，推导并验证临床可行性及商业可行性。微调指令应联动触发技术理解、场景匹配与执行输出三个智能体，实现全链路参数与生成文档的一致性更新。用户提问时，请基于当前提取的分子物理化学参数、适配的手术机器人及生成的临床方案和商业计划书，给予专业、详实的解答。";

export const WELCOME_MESSAGE: ChatMessage = {
  sender: 'assistant',
  text: '您好！我是"云脉"智慧医疗多智能体系统的交互顾问——"医算子"。我已预置了通用成果转化平台，目前支持四大转化医学细分领域：\n\n1. 📂 医疗器械与成像分子（代表作：荧光成像探针）\n2. 💊 创新药物与生物治疗（代表作：KRAS-G12C 靶向药）\n3. 🧠 医疗 AI 与智能诊断（代表作：脑胶质瘤 3D-Unet 图像分割）\n4. 🏥 创新临床术式与疗法（代表作：腔镜 LPPPD 改良术式）\n\n作为专为成果转化设计的智能顾问，我能根据您的意图实时联动技术理解、场景匹配与执行输出智能体。您可以随时输入微调指令，例如：\n- "将新药靶点改为 EGFR，适应症改为肺腺癌"\n- "把SaMD准确率提升至 95%，推理时延降低到 12ms"\n- "将手术部位改为肝脏切除区，学习曲线例数改为 15例"\n- "融资额度调整为 3000万，临床基地改为北京协和医院"'
};
