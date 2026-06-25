import { AppParams, RobotMatch, ChatMessage } from './types';
import { BACKEND_URL, FRONTEND_KNOWLEDGE_BASE, DEFAULT_ROBOTS, DRUGS_ROBOTS, AI_ROBOTS, SURGICAL_ROBOTS } from './constants';

export async function fetchBackendState(): Promise<AppParams | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/state`);
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function syncBackendState(params: AppParams): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  } catch (err) {
    console.error("Error syncing state:", err);
  }
}

export async function analyzePaper(
  title: string,
  content: string,
  apiKey: string | null,
  provider: string | null
): Promise<{ state: AppParams; rag_references?: any; is_valid?: boolean; status?: string; reason?: string } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/analyze-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, api_key: apiKey, provider })
    });
    return await res.json();
  } catch (err) {
    console.error("Error in analyze-paper:", err);
    return null;
  }
}

export async function matchScenarios(
  domain: string,
  wavelength: number,
  department: string
): Promise<RobotMatch[] | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/match-scenarios?domain=${domain}&wavelength=${wavelength}&department=${department}`);
    const data = await res.json();
    return data.matches;
  } catch (err) {
    console.error("Error in match-scenarios:", err);
    return null;
  }
}

export async function generateDocs(
  apiKey: string | null,
  provider: string | null,
  state: AppParams
): Promise<{ clinical_trial_protocol: string; business_plan: string } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/generate-docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, provider, state })
    });
    return await res.json();
  } catch (err) {
    console.error("Error in generate-docs:", err);
    return null;
  }
}

export async function chatAgent(
  message: string,
  apiKey: string | null,
  provider: string | null,
  systemPrompt: string,
  clinicalDoc: string,
  bpDoc: string,
  history: ChatMessage[]
): Promise<{ reply: string; state_updated?: boolean; current_state?: AppParams } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/chat-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        api_key: apiKey,
        provider,
        system_prompt: systemPrompt,
        clinical_doc: clinicalDoc,
        bp_doc: bpDoc,
        history: history.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error in chat-agent:", err);
    return null;
  }
}

export function getLocalRobotMatches(domain: string, targetDepartment: string): RobotMatch[] {
  if (domain === 'drugs') return DRUGS_ROBOTS;
  if (domain === 'ai') return AI_ROBOTS;
  if (domain === 'surgical') return SURGICAL_ROBOTS;
  return DEFAULT_ROBOTS.map(robot => {
    let score = 90;
    if (robot.id === 'shurui' && targetDepartment.includes('脑')) score = 96;
    if (robot.id === 'davinci-xi' && targetDepartment.includes('肝')) score = 98;
    return { ...robot, compatibility_score: score };
  }).sort((a, b) => b.compatibility_score - a.compatibility_score);
}

export function generateParamsForCustomPaper(fileName: string, fileContent: string): AppParams {
  const title = fileName.replace(/\.[^/.]+$/, "");
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  let domain: string = "devices";
  const textToCheck = (fileName + " " + fileContent).toLowerCase();

  if (textToCheck.includes("unet") || textToCheck.includes("cnn") || textToCheck.includes("samd") || textToCheck.includes("影像") || textToCheck.includes("诊断") || textToCheck.includes("算法") || textToCheck.includes("深度学习") || textToCheck.includes("ai") || textToCheck.includes("segmentation") || textToCheck.includes("neural") || textToCheck.includes("transformer") || textToCheck.includes("accuracy") || textToCheck.includes("latency")) {
    domain = "ai";
  } else if (textToCheck.includes("kras") || textToCheck.includes("inhibitor") || textToCheck.includes("靶向药") || textToCheck.includes("药物") || textToCheck.includes("抗体") || textToCheck.includes("前药") || textToCheck.includes("drug") || textToCheck.includes("antibody") || textToCheck.includes("monoclonal") || textToCheck.includes("target")) {
    domain = "drugs";
  } else if (textToCheck.includes("lpppd") || textToCheck.includes("laparoscopic") || textToCheck.includes("surgical") || textToCheck.includes("术式") || textToCheck.includes("腹腔镜") || textToCheck.includes("切除术") || textToCheck.includes("缝合") || textToCheck.includes("resection") || textToCheck.includes("reconstruction") || textToCheck.includes("anastomosis") || textToCheck.includes("suture")) {
    domain = "surgical";
  }

  const baseParams: AppParams = {
    domain,
    paper_title: title,
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

  if (domain === "devices") {
    const excitation = 750 + (absHash % 70);
    const emission = excitation + 30;
    const halfLife = parseFloat((1.5 + (absHash % 30) / 10).toFixed(1));
    const metabolic = halfLife * 10;
    const ld50 = 40 + (absHash % 40);
    const mtd = parseFloat((ld50 / 10).toFixed(1));
    baseParams.excitation_wavelength = excitation;
    baseParams.emission_wavelength = emission;
    baseParams.half_life = halfLife;
    baseParams.metabolic_cycle = metabolic;
    baseParams.ld50 = ld50;
    baseParams.mtd = mtd;
    baseParams.target_department = "肝胆外科";
  } else if (domain === "drugs") {
    baseParams.target = textToCheck.includes("kras") ? "KRAS-G12C" : "EGFR";
    baseParams.indication = textToCheck.includes("肺") ? "非小细胞肺癌" : "消化道肿瘤";
    baseParams.drug_half_life = parseFloat((8.0 + (absHash % 120) / 10).toFixed(1));
    baseParams.dlt_dose = 200 + (absHash % 5) * 100;
    baseParams.primary_endpoint = textToCheck.includes("pfs") ? "PFS (无进展生存期)" : "ORR (客观缓解率)";
    baseParams.target_department = "肿瘤内科";
    baseParams.financing_amount = 45.0;
  } else if (domain === "ai") {
    baseParams.architecture = textToCheck.includes("unet") ? "3D-Unet+" : "Med-Transformer";
    baseParams.modality = textToCheck.includes("mri") ? "MRI-T2WI" : "CT-Chest";
    baseParams.accuracy = parseFloat((88.0 + (absHash % 100) / 10).toFixed(1));
    baseParams.latency = parseFloat((10.0 + (absHash % 150) / 10).toFixed(1));
    baseParams.target_department = textToCheck.includes("脑") ? "脑外科/神经外科" : "放射科";
    baseParams.financing_amount = 8.0;
  } else if (domain === "surgical") {
    baseParams.anatomical_site = textToCheck.includes("胰") ? "胰腺十二指肠区" : "肝脏切除区";
    baseParams.core_instruments = "腹腔镜能量切割闭合器";
    baseParams.learning_curve_cases = 15 + (absHash % 20);
    baseParams.target_department = "普通外科";
    baseParams.financing_amount = 5.0;
  }

  return baseParams;
}

export function detectProvider(key: string): string {
  if (!key) return '';
  const lowerKey = key.toLowerCase();
  if (lowerKey.startsWith('sk-or-')) return 'OpenRouter';
  if (lowerKey.startsWith('sk-d') || lowerKey.includes('deepseek')) return 'DeepSeek';
  if (lowerKey.startsWith('sk-') || lowerKey.includes('openai')) return 'OpenAI';
  if (lowerKey.includes('pangu') || lowerKey.includes('huawei') || lowerKey.startsWith('hw-') || lowerKey.includes('hwcloud')) return 'Huawei Pangu';
  if (lowerKey.startsWith('pb-') || lowerKey.includes('anthropic') || lowerKey.includes('claude')) return 'Anthropic Claude';
  if (lowerKey.includes('gemini') || lowerKey.startsWith('ai_')) return 'Google Gemini';
  return '通用 API 开发者 Key';
}
