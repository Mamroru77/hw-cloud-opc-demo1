export interface RAGReference {
  source: string;
  title: string;
  content: string;
}

export interface RobotMatch {
  id: string;
  name: string;
  manufacturer: string;
  compatibility_score: number;
  national_installs: number;
  channels: string[];
  description: string;
}

export interface AppParams {
  domain: string;
  paper_title: string;
  target_department: string;
  financing_amount: number;
  clinical_trial_site: string;
  phase_1_duration: number;
  sample_size: number;
  excitation_wavelength: number;
  emission_wavelength: number;
  metabolic_cycle: number;
  half_life: number;
  ld50: number;
  mtd: number;
  target: string;
  indication: string;
  drug_half_life: number;
  dlt_dose: number;
  primary_endpoint: string;
  architecture: string;
  modality: string;
  accuracy: number;
  latency: number;
  integration_standard: string;
  anatomical_site: string;
  core_instruments: string;
  learning_curve_cases: number;
  safety_endpoint: string;
}

// 默认值工厂函数
export function createDefaultAppParams(): AppParams {
  return {
    domain: 'devices',
    paper_title: '',
    target_department: '',
    financing_amount: 0,
    clinical_trial_site: '',
    phase_1_duration: 0,
    sample_size: 0,
    excitation_wavelength: 0,
    emission_wavelength: 0,
    metabolic_cycle: 0,
    half_life: 0,
    ld50: 0,
    mtd: 0,
    target: '',
    indication: '',
    drug_half_life: 0,
    dlt_dose: 0,
    primary_endpoint: '',
    architecture: '',
    modality: '',
    accuracy: 0,
    latency: 0,
    integration_standard: '',
    anatomical_site: '',
    core_instruments: '',
    learning_curve_cases: 0,
    safety_endpoint: ''
  };
}

export interface PresetPaper {
  id: string;
  domain: string;
  title: string;
  year: number;
  recommend: string;
  params: AppParams;
}

export interface CustomPaper {
  id: string;
  title: string;
  isCustom: boolean;
  content?: string;
  params: AppParams;
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  modelName?: string;
}

export interface ApiConfig {
  endpoint: string;
  provider: string;
  apiKey: string;
  demoMode: boolean;
}

export const MODEL_PROVIDERS: string[] = [
  'OpenAI',
  'DeepSeek',
  '通义千问',
  '文心一言',
  '智谱GLM',
  'Moonshot'
];

export function createDefaultApiConfig(): ApiConfig {
  return {
    endpoint: 'http://localhost:8000',
    provider: 'DeepSeek',
    apiKey: '',
    demoMode: true
  };
}

export interface TokenMetrics {
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  model_name?: string;
  provider_id?: string;
}

export interface BenchmarkEntry {
  provider_id: string;
  model_name: string;
  avg_latency_ms: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  accuracy_score: number;
  task_type: string;
}

export interface AuditLogEntry {
  action: string;
  timestamp: string;
  details?: string;
}

export interface DevLogEntry {
  title: string;
  content: string;
  timestamp: string;
}

export interface CICDPipeline {
  name: string;
  stage: string;
  status: string;
}

export interface RunCacheEntry {
  pipelineStep: number;
  currentTab: string;
  state: AppParams;
  matchedRobots: RobotMatch[];
  clinicalDoc: string;
  bpDoc: string;
  ragReferences: RAGReference[];
  harmonySynced: boolean;
}

// 预设论文
export const PRESET_PAPERS: PresetPaper[] = [
  {
    id: 'devices-default',
    domain: 'devices',
    title: '新型荧光探针在早期肿瘤切除手术中的应用',
    year: 2026,
    recommend: '推荐用于术中导航',
    params: {
      domain: 'devices', paper_title: '新型荧光探针在早期肿瘤切除手术中的应用',
      target_department: '肝胆外科', financing_amount: 15.0, clinical_trial_site: '华东地区三甲医院',
      phase_1_duration: 12, sample_size: 20, excitation_wavelength: 790.0, emission_wavelength: 820.0,
      metabolic_cycle: 24.0, half_life: 2.4, ld50: 50.0, mtd: 5.0,
      target: 'KRAS-G12C', indication: '非小细胞肺癌', drug_half_life: 12.0, dlt_dose: 400.0,
      primary_endpoint: 'ORR', architecture: '3D-Unet', modality: 'MRI-T2WI',
      accuracy: 92.4, latency: 18.5, integration_standard: 'DICOM 3.0',
      anatomical_site: '胰腺十二指肠区', core_instruments: '腹腔镜能量切割闭合器',
      learning_curve_cases: 25, safety_endpoint: '30天术后并发症率'
    }
  },
  {
    id: 'drugs-default',
    domain: 'drugs',
    title: '一种面向非小细胞肺癌的靶向 KRAS-G12C 突变创新药前药临床前研究',
    year: 2026,
    recommend: '推荐开展新药临床试验',
    params: {
      domain: 'drugs', paper_title: '一种面向非小细胞肺癌的靶向 KRAS-G12C 突变创新药前药临床前研究',
      target_department: '肿瘤内科', financing_amount: 45.0, clinical_trial_site: '北京协和医院(GCP基地)',
      phase_1_duration: 24, sample_size: 40, excitation_wavelength: 790.0, emission_wavelength: 820.0,
      metabolic_cycle: 24.0, half_life: 2.4, ld50: 50.0, mtd: 5.0,
      target: 'KRAS-G12C', indication: '非小细胞肺癌', drug_half_life: 12.0, dlt_dose: 400.0,
      primary_endpoint: 'ORR', architecture: '3D-Unet', modality: 'MRI-T2WI',
      accuracy: 92.4, latency: 18.5, integration_standard: 'DICOM 3.0',
      anatomical_site: '胰腺十二指肠区', core_instruments: '腹腔镜能量切割闭合器',
      learning_curve_cases: 25, safety_endpoint: '30天术后并发症率'
    }
  },
  {
    id: 'ai-default',
    domain: 'ai',
    title: '基于三维卷积神经网络的脑胶质瘤 MRI 图像术前智能分级与边界分割系统',
    year: 2026,
    recommend: '推荐用于 SaMD 系统部署',
    params: {
      domain: 'ai', paper_title: '基于三维卷积神经网络的脑胶质瘤 MRI 图像术前智能分级与边界分割系统',
      target_department: '脑外科/神经外科', financing_amount: 8.0, clinical_trial_site: '华东地区三甲医院',
      phase_1_duration: 10, sample_size: 30, excitation_wavelength: 790.0, emission_wavelength: 820.0,
      metabolic_cycle: 24.0, half_life: 2.4, ld50: 50.0, mtd: 5.0,
      target: 'KRAS-G12C', indication: '非小细胞肺癌', drug_half_life: 12.0, dlt_dose: 400.0,
      primary_endpoint: 'ORR', architecture: '3D-Unet', modality: 'MRI-T2WI',
      accuracy: 92.4, latency: 18.5, integration_standard: 'DICOM 3.0',
      anatomical_site: '胰腺十二指肠区', core_instruments: '腹腔镜能量切割闭合器',
      learning_curve_cases: 25, safety_endpoint: '30天术后并发症率'
    }
  },
  {
    id: 'surgical-default',
    domain: 'surgical',
    title: '完全腹腔镜下保留幽门的胰十二指肠切除术（LPPPD）改良术式与临床效能分析',
    year: 2026,
    recommend: '推荐微创术式标准化推广',
    params: {
      domain: 'surgical', paper_title: '完全腹腔镜下保留幽门的胰十二指肠切除术（LPPPD）改良术式与临床效能分析',
      target_department: '普通外科', financing_amount: 5.0, clinical_trial_site: '华南地区三甲医院',
      phase_1_duration: 18, sample_size: 25, excitation_wavelength: 790.0, emission_wavelength: 820.0,
      metabolic_cycle: 24.0, half_life: 2.4, ld50: 50.0, mtd: 5.0,
      target: 'KRAS-G12C', indication: '非小细胞肺癌', drug_half_life: 12.0, dlt_dose: 400.0,
      primary_endpoint: 'ORR', architecture: '3D-Unet', modality: 'MRI-T2WI',
      accuracy: 92.4, latency: 18.5, integration_standard: 'DICOM 3.0',
      anatomical_site: '胰腺十二指肠区', core_instruments: '腹腔镜能量切割闭合器',
      learning_curve_cases: 25, safety_endpoint: '30天术后并发症率'
    }
  }
];

// 论文分析结果
export interface PaperAnalysisResult {
  state: AppParams;
  rag_references?: RAGReference[];
  is_valid?: boolean;
  status?: string;
  reason?: string;
}

// 流水线步骤
export enum PipelineStep {
  UNDERSTAND = 0,
  MATCH = 1,
  EXECUTE = 2
}

// 状态同步请求体
export interface SyncStateBody {
  state: AppParams;
  matchedRobots: RobotMatch[];
  clinicalDoc: string;
  bpDoc: string;
}
