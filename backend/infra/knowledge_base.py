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
            "content": "对于腹腔镜微创胰十二指肠切除或吻合新术式的临床准入，科室首批开展案例需由资深高年资主治医师全程指导。主要安全性追踪指标为'30天术后严重并发症发生率'（按 Clavien-Dindo 分级三级以上发生率不得高于5%），同时需严密随访吻合口漏、延迟胃排空及胰瘘。"
        },
        {
            "source": "微创外科医学教育协会《青年医师微创手术学习曲线规范》",
            "title": "手术操作熟练度与学习曲线(Cases)收敛平台",
            "content": "腹腔镜复杂吻合术式的学习曲线分析显示，随着青年医师操作案例数的累积，平均手术时间呈现明显的负指数收敛。一般在经过 20-30 例标准带教实训及大体模拟考核后，手术时间、术中出血量及术后胃排空延迟发生率进入相对平稳的'技术成熟平台期'。"
        }
    ]
}

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
