import type { AppParams, RobotMatch, ChatMessage, RAGReference, ParamCitation } from './types';
import { BACKEND_URL, DEFAULT_ROBOTS, DRUGS_ROBOTS, AI_ROBOTS, SURGICAL_ROBOTS } from './constants';
import type { SanitizeResult } from './npuSanitizer';

const SESSION_STORAGE_KEY = 'cloudvein_session_id';
const ACTOR_ROLE_STORAGE_KEY = 'cloudvein_actor_role';
const JWT_TOKEN_STORAGE_KEY = 'cloudvein_jwt_token';

export type ActorRole = 'researcher' | 'reviewer';

export function getActorRole(): ActorRole {
  try {
    const raw = localStorage.getItem(ACTOR_ROLE_STORAGE_KEY);
    return raw === 'researcher' ? 'researcher' : 'reviewer';
  } catch {
    return 'reviewer';
  }
}

export function setActorRole(role: ActorRole): void {
  try {
    localStorage.setItem(ACTOR_ROLE_STORAGE_KEY, role);
  } catch {
    // ignore storage limits
  }
}

export function getJwtToken(): string {
  try {
    return localStorage.getItem(JWT_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export async function switchActorRole(role: ActorRole): Promise<{
  role: ActorRole;
  displayName: string;
  hasJwt: boolean;
}> {
  setActorRole(role);
  const fallbackName = role === 'researcher' ? '临床转化研究员' : '医学合规审评官 (PI)';
  try {
    const res = await fetch(`${BACKEND_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      return { role, displayName: fallbackName, hasJwt: false };
    }
    const json = await res.json();
    if (json?.access_token) {
      try {
        localStorage.setItem(JWT_TOKEN_STORAGE_KEY, json.access_token);
      } catch {
        // ignore
      }
      return {
        role,
        displayName: json?.user?.display_name || fallbackName,
        hasJwt: true,
      };
    }
  } catch {
    // offline fallback
  }
  return { role, displayName: fallbackName, hasJwt: false };
}

export function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return 'default';
  }
}

export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Session-Id': getSessionId(),
    'X-Actor-Role': getActorRole(),
  };
  const token = getJwtToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return {
    ...headers,
    ...extra,
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export async function fetchBackendState(): Promise<AppParams | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/state`, {
      headers: apiHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function syncBackendState(params: AppParams): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/state`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.error('Error syncing state:', err);
  }
}

export interface PersistedPaperRecord {
  id: string;
  title: string;
  domain: string;
  content: string;
  params: AppParams;
  clinical_doc: string;
  bp_doc: string;
  doc_source: 'llm' | 'template';
  created_at: string;
  updated_at: string;
}

export async function fetchPersistedPapers(): Promise<PersistedPaperRecord[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/papers`, {
      headers: apiHeaders(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function deletePersistedPaper(paperId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/papers/${encodeURIComponent(paperId)}`, {
      method: 'DELETE',
      headers: apiHeaders(),
    });
  } catch {
    // ignore network failure
  }
}

export interface ModelProviderStatusResponse {
  status: string;
  server_configured_providers: Record<string, boolean>;
  has_server_key: boolean;
}

export async function fetchModelProviderStatus(): Promise<ModelProviderStatusResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/models/status`, {
      headers: apiHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface AnalyzePaperResponse {
  state: AppParams;
  rag_references?: RAGReference[];
  param_citations?: Record<string, ParamCitation>;
  page_count?: number;
  references_stripped?: boolean;
  is_scanned_pdf?: boolean;
  is_valid?: boolean;
  status?: string;
  reason?: string;
  analysis_source?: 'llm' | 'local_rule' | 'parser_error';
  provider_used?: string;
  model_name?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  extracted_text?: string;
  extracted_chars?: number;
  paper_id?: string;
  llm_error?: string | null;
}

export async function analyzePaper(
  title: string,
  content: string,
  apiKey: string | null,
  provider: string | null,
  options?: {
    fileBase64?: string;
    filename?: string;
    paperId?: string;
  }
): Promise<AnalyzePaperResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/analyze-paper`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title,
        content,
        api_key: apiKey,
        provider,
        file_base64: options?.fileBase64 ?? null,
        filename: options?.filename ?? null,
        paper_id: options?.paperId ?? null,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error in analyze-paper:', err);
    return null;
  }
}

export async function matchScenarios(
  domain: string,
  wavelength: number,
  department: string
): Promise<RobotMatch[] | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/match-scenarios?domain=${encodeURIComponent(domain)}&wavelength=${encodeURIComponent(
        String(wavelength)
      )}&department=${encodeURIComponent(department)}`,
      { headers: apiHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.matches;
  } catch (err) {
    console.error('Error in match-scenarios:', err);
    return null;
  }
}

export interface GenerateDocsResponse {
  status?: string;
  doc_source?: 'llm' | 'template';
  provider_used?: string;
  model_name?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  llm_error?: string | null;
  clinical_trial_protocol: string;
  business_plan: string;
}

export async function generateDocs(
  apiKey: string | null,
  provider: string | null,
  state: AppParams,
  paperId?: string
): Promise<GenerateDocsResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/generate-docs`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        api_key: apiKey,
        provider,
        state,
        paper_id: paperId ?? null,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error in generate-docs:', err);
    return null;
  }
}

async function consumeSseStream(
  res: Response,
  onEvent: (event: Record<string, any>) => void
): Promise<boolean> {
  if (!res.ok || !res.body) return false;
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let receivedAny = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(dataStr);
        receivedAny = true;
        onEvent(parsed);
      } catch {
        // ignore malformed chunk
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const dataStr = buffer.trim().slice(5).trim();
    if (dataStr && dataStr !== '[DONE]') {
      try {
        const parsed = JSON.parse(dataStr);
        receivedAny = true;
        onEvent(parsed);
      } catch {
        // ignore
      }
    }
  }
  return receivedAny;
}

export interface GenerateDocsStreamCallbacks {
  onStart?: (docSource: 'llm' | 'template') => void;
  onReset?: () => void;
  onClinicalDelta?: (delta: string, accumulated: string) => void;
  onBpDelta?: (delta: string, accumulated: string) => void;
}

export async function exportDocxFromBackend(
  title: string,
  content: string,
  domain: string,
  filename: string
): Promise<Blob | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/docs/export-docx`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, content, domain, filename }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch (err) {
    console.error('Error in export-docx:', err);
    return null;
  }
}

export async function generateDocsStream(
  apiKey: string | null,
  provider: string | null,
  state: AppParams,
  paperId?: string,
  callbacks?: GenerateDocsStreamCallbacks
): Promise<GenerateDocsResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/generate-docs/stream`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        api_key: apiKey,
        provider,
        state,
        paper_id: paperId ?? null,
      }),
    });

    if (!res.ok || !res.body) {
      return await generateDocs(apiKey, provider, state, paperId);
    }

    let clinicalAcc = '';
    let bpAcc = '';
    let finalResponse: GenerateDocsResponse | null = null;
    let docSource: 'llm' | 'template' = 'template';

    const ok = await consumeSseStream(res, (evt) => {
      if (evt.type === 'start') {
        docSource = evt.doc_source === 'llm' ? 'llm' : 'template';
        callbacks?.onStart?.(docSource);
      } else if (evt.type === 'reset') {
        clinicalAcc = '';
        bpAcc = '';
        callbacks?.onReset?.();
      } else if (evt.type === 'clinical_delta' && typeof evt.delta === 'string') {
        clinicalAcc += evt.delta;
        callbacks?.onClinicalDelta?.(evt.delta, clinicalAcc);
      } else if (evt.type === 'bp_delta' && typeof evt.delta === 'string') {
        bpAcc += evt.delta;
        callbacks?.onBpDelta?.(evt.delta, bpAcc);
      } else if (evt.type === 'done') {
        finalResponse = {
          status: evt.status || 'success',
          doc_source: evt.doc_source === 'llm' ? 'llm' : 'template',
          provider_used: evt.provider_used,
          model_name: evt.model_name,
          input_tokens: evt.input_tokens,
          output_tokens: evt.output_tokens,
          latency_ms: evt.latency_ms,
          llm_error: evt.llm_error ?? null,
          clinical_trial_protocol: evt.clinical_trial_protocol || clinicalAcc,
          business_plan: evt.business_plan || bpAcc,
        };
      }
    });

    if (finalResponse) return finalResponse;
    if (ok && (clinicalAcc || bpAcc)) {
      return {
        status: 'success',
        doc_source: docSource,
        clinical_trial_protocol: clinicalAcc,
        business_plan: bpAcc,
      };
    }
    return await generateDocs(apiKey, provider, state, paperId);
  } catch (err) {
    console.error('Error in generate-docs/stream:', err);
    return await generateDocs(apiKey, provider, state, paperId);
  }
}

export interface ChatAgentResult {
  reply: string;
  state_updated?: boolean;
  current_state?: AppParams;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  model_name?: string;
  provider_id?: string;
  chat_source?: string;
}

export async function chatAgent(
  message: string,
  apiKey: string | null,
  provider: string | null,
  systemPrompt: string,
  clinicalDoc: string,
  bpDoc: string,
  history: ChatMessage[]
): Promise<ChatAgentResult | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/chat-agent`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message,
        api_key: apiKey,
        provider,
        system_prompt: systemPrompt,
        clinical_doc: clinicalDoc,
        bp_doc: bpDoc,
        history: history.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error in chat-agent:', err);
    return null;
  }
}

export interface ChatAgentStreamCallbacks {
  onState?: (stateUpdated: boolean, currentState?: AppParams) => void;
  onDelta?: (delta: string, accumulated: string) => void;
}

export async function chatAgentStream(
  message: string,
  apiKey: string | null,
  provider: string | null,
  systemPrompt: string,
  clinicalDoc: string,
  bpDoc: string,
  history: ChatMessage[],
  callbacks?: ChatAgentStreamCallbacks
): Promise<ChatAgentResult | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/chat-agent/stream`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message,
        api_key: apiKey,
        provider,
        system_prompt: systemPrompt,
        clinical_doc: clinicalDoc,
        bp_doc: bpDoc,
        history: history.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      }),
    });

    if (!res.ok || !res.body) {
      return await chatAgent(message, apiKey, provider, systemPrompt, clinicalDoc, bpDoc, history);
    }

    let replyAcc = '';
    let stateUpdated = false;
    let currentState: AppParams | undefined;
    let finalResult: ChatAgentResult | null = null;

    const ok = await consumeSseStream(res, (evt) => {
      if (evt.type === 'state') {
        stateUpdated = Boolean(evt.state_updated);
        currentState = evt.current_state;
        callbacks?.onState?.(stateUpdated, currentState);
      } else if (evt.type === 'delta' && typeof evt.delta === 'string') {
        replyAcc += evt.delta;
        callbacks?.onDelta?.(evt.delta, replyAcc);
      } else if (evt.type === 'done') {
        finalResult = {
          reply: evt.reply || replyAcc,
          state_updated: evt.state_updated ?? stateUpdated,
          current_state: evt.current_state ?? currentState,
          input_tokens: evt.input_tokens,
          output_tokens: evt.output_tokens,
          latency_ms: evt.latency_ms,
          model_name: evt.model_name,
          provider_id: evt.provider_id,
          chat_source: evt.chat_source,
        };
      }
    });

    if (finalResult) return finalResult;
    if (ok && replyAcc) {
      return {
        reply: replyAcc,
        state_updated: stateUpdated,
        current_state: currentState,
      };
    }
    return await chatAgent(message, apiKey, provider, systemPrompt, clinicalDoc, bpDoc, history);
  } catch (err) {
    console.error('Error in chat-agent/stream:', err);
    return await chatAgent(message, apiKey, provider, systemPrompt, clinicalDoc, bpDoc, history);
  }
}

export async function sanitizeTextViaBackend(text: string): Promise<SanitizeResult | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/harmony/sanitize`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getLocalRobotMatches(domain: string, targetDepartment: string): RobotMatch[] {
  if (domain === 'drugs') return DRUGS_ROBOTS;
  if (domain === 'ai') return AI_ROBOTS;
  if (domain === 'surgical') return SURGICAL_ROBOTS;
  return DEFAULT_ROBOTS.map((robot) => {
    let score = 90;
    if (robot.id === 'shurui' && targetDepartment.includes('脑')) score = 96;
    if (robot.id === 'davinci-xi' && targetDepartment.includes('肝')) score = 98;
    return { ...robot, compatibility_score: score };
  }).sort((a, b) => b.compatibility_score - a.compatibility_score);
}

export function generateParamsForCustomPaper(fileName: string, fileContent: string): AppParams {
  const title = fileName.replace(/\.[^/.]+$/, '');
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  let domain: string = 'devices';
  const textToCheck = (fileName + ' ' + fileContent).toLowerCase();

  if (
    textToCheck.includes('unet') ||
    textToCheck.includes('cnn') ||
    textToCheck.includes('samd') ||
    textToCheck.includes('影像') ||
    textToCheck.includes('诊断') ||
    textToCheck.includes('算法') ||
    textToCheck.includes('深度学习') ||
    textToCheck.includes('ai') ||
    textToCheck.includes('segmentation') ||
    textToCheck.includes('neural') ||
    textToCheck.includes('transformer') ||
    textToCheck.includes('accuracy') ||
    textToCheck.includes('latency')
  ) {
    domain = 'ai';
  } else if (
    textToCheck.includes('kras') ||
    textToCheck.includes('inhibitor') ||
    textToCheck.includes('靶向药') ||
    textToCheck.includes('药物') ||
    textToCheck.includes('抗体') ||
    textToCheck.includes('前药') ||
    textToCheck.includes('drug') ||
    textToCheck.includes('antibody') ||
    textToCheck.includes('monoclonal') ||
    textToCheck.includes('target')
  ) {
    domain = 'drugs';
  } else if (
    textToCheck.includes('lpppd') ||
    textToCheck.includes('laparoscopic') ||
    textToCheck.includes('surgical') ||
    textToCheck.includes('术式') ||
    textToCheck.includes('腹腔镜') ||
    textToCheck.includes('切除术') ||
    textToCheck.includes('缝合') ||
    textToCheck.includes('resection') ||
    textToCheck.includes('reconstruction') ||
    textToCheck.includes('anastomosis') ||
    textToCheck.includes('suture')
  ) {
    domain = 'surgical';
  }

  const baseParams: AppParams = {
    domain,
    paper_title: title,
    target_department: '肝胆外科',
    financing_amount: 15.0,
    clinical_trial_site: '华东地区三甲医院',
    phase_1_duration: 12,
    sample_size: 20,
    excitation_wavelength: 790.0,
    emission_wavelength: 820.0,
    metabolic_cycle: 24.0,
    half_life: 2.4,
    ld50: 50.0,
    mtd: 5.0,
    target: 'KRAS-G12C',
    indication: '非小细胞肺癌',
    drug_half_life: 12.0,
    dlt_dose: 400.0,
    primary_endpoint: 'ORR (客观缓解率)',
    architecture: '3D-Unet',
    modality: 'MRI-T2WI',
    accuracy: 92.4,
    latency: 18.5,
    integration_standard: 'DICOM 3.0',
    anatomical_site: '胰腺十二指肠区',
    core_instruments: '腹腔镜能量切割闭合器',
    learning_curve_cases: 25,
    safety_endpoint: '30天术后并发症率',
  };

  if (domain === 'devices') {
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
    baseParams.target_department = '肝胆外科';
  } else if (domain === 'drugs') {
    baseParams.target = textToCheck.includes('kras') ? 'KRAS-G12C' : 'EGFR';
    baseParams.indication = textToCheck.includes('肺') ? '非小细胞肺癌' : '消化道肿瘤';
    baseParams.drug_half_life = parseFloat((8.0 + (absHash % 120) / 10).toFixed(1));
    baseParams.dlt_dose = 200 + (absHash % 5) * 100;
    baseParams.primary_endpoint = textToCheck.includes('pfs') ? 'PFS (无进展生存期)' : 'ORR (客观缓解率)';
    baseParams.target_department = '肿瘤内科';
    baseParams.financing_amount = 45.0;
  } else if (domain === 'ai') {
    baseParams.architecture = textToCheck.includes('unet') ? '3D-Unet+' : 'Med-Transformer';
    baseParams.modality = textToCheck.includes('mri') ? 'MRI-T2WI' : 'CT-Chest';
    baseParams.accuracy = parseFloat((88.0 + (absHash % 100) / 10).toFixed(1));
    baseParams.latency = parseFloat((10.0 + (absHash % 150) / 10).toFixed(1));
    baseParams.target_department = textToCheck.includes('脑') ? '脑外科/神经外科' : '放射科';
    baseParams.financing_amount = 8.0;
  } else if (domain === 'surgical') {
    baseParams.anatomical_site = textToCheck.includes('胰') ? '胰腺十二指肠区' : '肝脏切除区';
    baseParams.core_instruments = '腹腔镜能量切割闭合器';
    baseParams.learning_curve_cases = 15 + (absHash % 20);
    baseParams.target_department = '普通外科';
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
  if (
    lowerKey.includes('pangu') ||
    lowerKey.includes('huawei') ||
    lowerKey.startsWith('hw-') ||
    lowerKey.includes('hwcloud')
  ) {
    return 'Huawei Pangu';
  }
  if (lowerKey.startsWith('pb-') || lowerKey.includes('anthropic') || lowerKey.includes('claude')) {
    return 'Anthropic Claude';
  }
  if (lowerKey.includes('gemini') || lowerKey.startsWith('ai_') || lowerKey.startsWith('aiza')) {
    return 'Google Gemini';
  }
  if (lowerKey.includes('zhipu') || lowerKey.startsWith('gl-')) {
    return 'Zhipu GLM';
  }
  return '通用 API 开发者 Key';
}
