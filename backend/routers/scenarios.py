from typing import Optional
from fastapi import APIRouter
from backend.infra.knowledge_base import ROBOTS_DB

router = APIRouter(prefix="/api", tags=["scenarios"])


@router.get("/match-scenarios")
def match_scenarios(domain: Optional[str] = None, wavelength: float = 790.0, department: str = "肝胆外科"):
    import backend.main as main_mod
    active_domain = domain or main_mod.current_state.domain

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
        for s in SURGICAL_DB:
            if department in ["普通外科", "肝胆外科", "胃肠外科"]:
                s["compatibility_score"] = min(100, s["compatibility_score"] + 3)
            else:
                s["compatibility_score"] = max(50, s["compatibility_score"] - 9)
        matched_results = sorted(SURGICAL_DB, key=lambda x: x["compatibility_score"], reverse=True)

    else:
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
