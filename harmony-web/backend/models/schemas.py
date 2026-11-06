from pydantic import BaseModel
from typing import List, Dict, Optional


class SessionState(BaseModel):
    domain: str = "devices"
    paper_title: str = "新型荧光探针在早期肿瘤切除手术中的应用"
    target_department: str = "肝胆外科"
    financing_amount: float = 15.0
    clinical_trial_site: str = "华东地区三甲医院"
    phase_1_duration: int = 12
    sample_size: int = 20

    excitation_wavelength: float = 790.0
    emission_wavelength: float = 820.0
    metabolic_cycle: float = 24.0
    half_life: float = 2.4
    ld50: float = 50.0
    mtd: float = 5.0

    target: str = "KRAS-G12C"
    indication: str = "非小细胞肺癌"
    drug_half_life: float = 12.0
    dlt_dose: float = 400.0
    primary_endpoint: str = "ORR (客观缓解率)"

    architecture: str = "3D-Unet"
    modality: str = "MRI-T2WI"
    accuracy: float = 92.4
    latency: float = 18.5
    integration_standard: str = "DICOM 3.0"

    anatomical_site: str = "胰腺十二指肠区"
    core_instruments: str = "腹腔镜能量切割闭合器"
    learning_curve_cases: int = 25
    safety_endpoint: str = "30天术后并发症率"


class AnalyzePaperRequest(BaseModel):
    title: str
    content: str
    api_key: Optional[str] = None
    provider: Optional[str] = None


class GenerateDocsRequest(BaseModel):
    api_key: Optional[str] = None
    provider: Optional[str] = None
    state: SessionState


class ChatMessage(BaseModel):
    message: str
    api_key: Optional[str] = None
    provider: Optional[str] = None
    system_prompt: Optional[str] = None
    clinical_doc: Optional[str] = None
    bp_doc: Optional[str] = None
    history: List[Dict[str, str]] = []
