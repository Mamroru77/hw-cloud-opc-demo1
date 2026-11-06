import { http } from '@kit.NetworkKit';
import { PaperAnalysisResult, RobotMatch, AppParams } from './Types';
import { HarmonyDevice, SanitizeResult } from './HarmonyTypes';
import { npuSanitize } from './NpuSanitizer';

interface AnalyzePaperBody {
  title: string;
  content: string;
  api_key: string | null;
  provider: string | null;
}

interface MatchScenariosResponse {
  status: string;
  matches: RobotMatch[];
}

interface GenerateDocsResponse {
  status: string;
  clinical_trial_protocol: string;
  business_plan: string;
}

interface GenerateDocsBody {
  api_key: string | null;
  provider: string | null;
  state: AppParams;
}

interface GenerateDocsResult {
  clinicalDoc: string;
  bpDoc: string;
}

// HTTP配置接口
export interface HttpConfig {
  baseUrl?: string;
  connectTimeout?: number;
  readTimeout?: number;
  retryTimes?: number;
}

// HTTP错误类
export class HttpError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'HttpError';
  }
}

const DEMO_ROBOTS: RobotMatch[] = [
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

const DEMO_DRUGS_ROBOTS: RobotMatch[] = [
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

const DEMO_AI_ROBOTS: RobotMatch[] = [
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

const DEMO_SURGICAL_ROBOTS: RobotMatch[] = [
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

export class HttpUtil {
  private static BASE_URL: string = '';
  private static API_KEY: string = '';
  private static API_PROVIDER: string = '';
  private static DEMO_MODE: boolean = true;
  private static DEFAULT_TIMEOUT: number = 60000;
  private static DEFAULT_RETRY: number = 3;

  static configure(config: HttpConfig): void {
    if (config.baseUrl) {
      HttpUtil.BASE_URL = config.baseUrl;
    }
  }

  static setApiKey(key: string): void {
    HttpUtil.API_KEY = key;
  }

  static setApiProvider(provider: string): void {
    HttpUtil.API_PROVIDER = provider;
  }

  static setBaseUrl(url: string): void {
    HttpUtil.BASE_URL = url;
  }

  static setDemoMode(enabled: boolean): void {
    HttpUtil.DEMO_MODE = enabled;
  }

  // 响应状态检查
  private static checkResponseStatus(response: http.HttpResponse): void {
    const statusCode = response.responseCode;
    if (statusCode < 200 || statusCode >= 300) {
      let detail = '';
      try {
        const body = response.result as string;
        if (body) {
          const parsed = JSON.parse(body) as Record<string, string>;
          detail = parsed['detail'] || parsed['message'] || body.substring(0, 200);
        }
      } catch (_err) {
        // ignore parse errors
      }
      const msg = detail ? `HTTP ${statusCode}: ${detail}` : `HTTP request failed with status ${statusCode}`;
      throw new HttpError(msg, statusCode);
    }
  }

  // 通用请求方法
  private static async request<T>(
    path: string,
    method: http.RequestMethod,
    data?: object
  ): Promise<T> {
    const httpRequest = http.createHttp();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < HttpUtil.DEFAULT_RETRY; attempt++) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (HttpUtil.API_KEY) {
          headers['Authorization'] = `Bearer ${HttpUtil.API_KEY}`;
        }
        const options: http.HttpRequestOptions = {
          method: method,
          connectTimeout: HttpUtil.DEFAULT_TIMEOUT,
          readTimeout: HttpUtil.DEFAULT_TIMEOUT,
          header: headers
        };

        if (data) {
          options.extraData = data;
        }

        const response = await httpRequest.request(`${HttpUtil.BASE_URL}${path}`, options);
        
        HttpUtil.checkResponseStatus(response);
        
        const result = response.result as string;
        if (!result) {
          throw new HttpError('Empty response received', -1);
        }
        
        return JSON.parse(result) as T;
      } catch (err) {
        lastError = err as Error;
        console.error(`HTTP ${method} attempt ${attempt + 1} failed:`, JSON.stringify(err));
        
        // 如果是状态码错误，不重试
        if (err instanceof HttpError && err.code > 0) {
          break;
        }
        
        // 非最后一次尝试，等待后重试
        if (attempt < HttpUtil.DEFAULT_RETRY - 1) {
          await new Promise<void>(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      } finally {
        httpRequest.destroy();
      }
    }

    throw lastError || new HttpError('Unknown error occurred', -1);
  }

  static async get<T>(path: string): Promise<T> {
    return HttpUtil.request<T>(path, http.RequestMethod.GET);
  }

  static async post<T>(path: string, data: object): Promise<T> {
    return HttpUtil.request<T>(path, http.RequestMethod.POST, data);
  }

  static async put<T>(path: string, data: object): Promise<T> {
    return HttpUtil.request<T>(path, http.RequestMethod.PUT, data);
  }

  static async delete<T>(path: string): Promise<T> {
    return HttpUtil.request<T>(path, http.RequestMethod.DELETE);
  }

  static async analyzePaper(title: string, content: string): Promise<PaperAnalysisResult> {
    const body: AnalyzePaperBody = {
      title: title,
      content: content.substring(0, 4000),
      api_key: HttpUtil.API_KEY || null,
      provider: HttpUtil.API_PROVIDER || null
    };
    return HttpUtil.post<PaperAnalysisResult>('/api/analyze-paper', body);
  }

  static async matchScenarios(state: AppParams): Promise<RobotMatch[]> {
    if (HttpUtil.DEMO_MODE) {
      return HttpUtil.demoMatchScenarios(state);
    }
    const domain = state.domain || 'devices';
    const wavelength = state.excitation_wavelength || 790;
    const department = state.target_department || '肝胆外科';
    const path = `/api/match-scenarios?domain=${domain}&wavelength=${wavelength}&department=${department}`;
    console.info('matchScenarios request:', HttpUtil.BASE_URL + path);
    const response = await HttpUtil.get<MatchScenariosResponse>(path);
    return response.matches || [];
  }

  static async generateDocs(state: AppParams): Promise<GenerateDocsResult> {
    if (HttpUtil.DEMO_MODE) {
      return HttpUtil.demoGenerateDocs(state);
    }
    const body: GenerateDocsBody = {
      api_key: HttpUtil.API_KEY || null,
      provider: HttpUtil.API_PROVIDER || null,
      state: state
    };
    const response = await HttpUtil.post<GenerateDocsResponse>('/api/generate-docs', body);
    const result: GenerateDocsResult = {
      clinicalDoc: response.clinical_trial_protocol || '',
      bpDoc: response.business_plan || ''
    };
    return result;
  }

  private static demoMatchScenarios(state: AppParams): RobotMatch[] {
    const domain = state.domain || 'devices';
    if (domain === 'drugs') {
      return DEMO_DRUGS_ROBOTS;
    } else if (domain === 'ai') {
      return DEMO_AI_ROBOTS;
    } else if (domain === 'surgical') {
      return DEMO_SURGICAL_ROBOTS;
    }
    return DEMO_ROBOTS;
  }

  private static demoGenerateDocs(state: AppParams): GenerateDocsResult {
    const domain = state.domain || 'devices';
    const title = state.paper_title || '未知项目';
    let clinical = '';
    let bp = '';

    if (domain === 'drugs') {
      clinical = `# ${title} 临床试验设计方案 (Phase I/II)\n\n## 1. 试验基本信息与研究目的\n- 靶点：${state.target || '-'}\n- 适应症：${state.indication || '-'}\n- 试验基地：${state.clinical_trial_site || '-'}\n- 样本量：${state.sample_size || 'N/A'} 例\n\n## 2. 受试者入组与排除标准\n（Demo模式：模板内容，接入大模型后可生成完整方案）\n\n## 3. 给药剂量与安全保障\n- DLT剂量：${state.dlt_dose || '-'} mg/m²\n- 半衰期：${state.drug_half_life || '-'} h\n\n## 4. 试验设计与进度规划\n- 预计周期：${state.phase_1_duration || '-'} 个月`;
      bp = `# ${title} 商业融资计划书\n\n## 1. 行业痛点与未满足的临床需求\n靶向 ${state.target || '-'} 的 ${state.indication || '-'} 治疗领域存在巨大的未满足临床需求。\n\n## 2. 核心技术壁垒\n- 创新靶点机制：${state.target || '-'}\n- 优良药代特性：半衰期 ${state.drug_half_life || '-'} h\n\n## 3. 市场定位与产业化对接\n- GCP基地：${state.clinical_trial_site || '-'}\n- 融资金额：${(state.financing_amount || 0) * 100} 万元\n\n## 4. 融资规划与里程碑\n（Demo模式：模板内容，接入大模型后可生成完整方案）`;
    } else if (domain === 'ai') {
      clinical = `# ${title} SaMD 临床效能验证方案\n\n## 1. 试验基本信息\n- 模型架构：${state.architecture || '-'}\n- 影像模态：${state.modality || '-'}\n- 目标精度：${state.accuracy || '-'}%\n\n## 2. 数据入排标准\n（Demo模式：模板内容）\n\n## 3. 对比测试与金标准\n- 接入标准：${state.integration_standard || '-'}\n- 延迟要求：${state.latency || '-'} ms\n\n## 4. 进度规划\n- 预计周期：${state.phase_1_duration || '-'} 个月`;
      bp = `# ${title} SaMD 商业化白皮书\n\n## 1. 行业痛点\n放射科及${state.target_department || '临床科室'}的影像诊断工作流亟待AI赋能。\n\n## 2. 核心技术优势\n- 架构：${state.architecture || '-'}\n- 推理延迟：${state.latency || '-'} ms\n- 精度：${state.accuracy || '-'}%\n\n## 3. 医院信息化生态集成\n- 标准：${state.integration_standard || '-'}\n\n## 4. 融资规划\n- 资金需求：${(state.financing_amount || 0) * 100} 万元`;
    } else if (domain === 'surgical') {
      clinical = `# ${title} 标准化临床路径指南\n\n## 1. 术式基本信息\n- 解剖部位：${state.anatomical_site || '-'}\n- 核心器械：${state.core_instruments || '-'}\n\n## 2. 适应患者入排标准\n（Demo模式：模板内容）\n\n## 3. 操作质控\n- 学习曲线：${state.learning_curve_cases || '-'} 例\n- 安全终点：${state.safety_endpoint || '-'}\n\n## 4. 示范规划\n- 培训周期：${state.phase_1_duration || '-'} 个月`;
      bp = `# ${title} 临床新术式推广推介书\n\n## 1. 行业痛点\n${state.anatomical_site || '-'}手术领域亟需标准化改良术式。\n\n## 2. 技术优势\n- 核心器械：${state.core_instruments || '-'}\n- 学习曲线：${state.learning_curve_cases || '-'} 例\n\n## 3. 教学基地构建\n- 基地：${state.clinical_trial_site || '-'}\n\n## 4. 融资规划\n- 资金需求：${(state.financing_amount || 0) * 100} 万元`;
    } else {
      clinical = `# ${title} 一期临床试验方案 (Phase I)\n\n## 1. 试验基本信息\n- 探针：FL-Probe-${state.excitation_wavelength || 790}\n- 激发/发射：${state.excitation_wavelength || '-'} / ${state.emission_wavelength || '-'} nm\n- 科室：${state.target_department || '-'}\n- 基地：${state.clinical_trial_site || '-'}\n\n## 2. 受试者入排标准\n（Demo模式：模板内容）\n\n## 3. 给药剂量与安全\n- LD50：${state.ld50 || '-'} mg/kg\n- MTD：${state.mtd || '-'} mg/kg\n- 代谢半衰期：${state.half_life || '-'} h\n\n## 4. 进度规划\n- 周期：${state.phase_1_duration || '-'} 个月\n- 样本量：${state.sample_size || '-'} 例`;
      bp = `# ${title} 商业融资计划书\n\n## 1. 行业痛点\n近红外荧光手术导航领域存在巨大的精准诊疗需求。\n\n## 2. 核心技术壁垒\n- 激发/发射：${state.excitation_wavelength || '-'} / ${state.emission_wavelength || '-'} nm\n- 优良代谢特性：半衰期 ${state.half_life || '-'} h\n- 安全窗口：LD50 ${state.ld50 || '-'} / MTD ${state.mtd || '-'} mg/kg\n\n## 3. 设备兼容性\n- 科室：${state.target_department || '-'}\n\n## 4. 融资规划\n- 资金需求：${(state.financing_amount || 0) * 100} 万元\n- 临床试验基地：${state.clinical_trial_site || '-'}`;
    }
    return { clinicalDoc: clinical, bpDoc: bp };
  }

  // -------- Harmony API 方法 --------

  static async harmonyDiscover(): Promise<HarmonyDevice[]> {
    if (HttpUtil.DEMO_MODE) {
      // 返回 mock 设备列表
      return [
        {
          deviceId: 'harmony-tablet-001',
          deviceName: 'MatePad Pro',
          deviceType: 'tablet',
          connectionStatus: 'discovered'
        },
        {
          deviceId: 'harmony-screen-001',
          deviceName: '华为智慧屏 V5',
          deviceType: 'smart_screen',
          connectionStatus: 'discovered'
        },
        {
          deviceId: 'harmony-pc-001',
          deviceName: 'MateBook X Pro',
          deviceType: 'pc',
          connectionStatus: 'discovered'
        }
      ];
    }
    interface EmptyBody {}
    const emptyBody: EmptyBody = {};
    return HttpUtil.post<HarmonyDevice[]>('/api/harmony/discover', emptyBody);
  }

  static async harmonySanitize(text: string): Promise<SanitizeResult> {
    if (HttpUtil.DEMO_MODE) {
      // 调用本地 NPU 脱敏
      return npuSanitize(text);
    }
    interface SanitizeBody { text: string; }
    const sanitizeBody: SanitizeBody = { text: text };
    return HttpUtil.post<SanitizeResult>('/api/harmony/sanitize', sanitizeBody);
  }

  static async harmonyGetDevices(): Promise<HarmonyDevice[]> {
    if (HttpUtil.DEMO_MODE) {
      return [];
    }
    return HttpUtil.get<HarmonyDevice[]>('/api/harmony/devices');
  }

  static async syncState(state: object): Promise<void> {
    if (HttpUtil.DEMO_MODE) {
      return;
    }
    await HttpUtil.post<void>('/api/state', state);
  }
}
