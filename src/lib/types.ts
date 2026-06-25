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
