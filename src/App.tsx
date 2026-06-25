import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, FileText, Brain, Cpu, Send, Upload, 
  CheckCircle2, ArrowRight, Sparkles, AlertCircle,
  TrendingUp, Compass, Settings, ShieldCheck, Download,
  Smartphone, Share2
} from 'lucide-react';
import * as echarts from 'echarts';
import './App.css';
import { motion, AnimatePresence } from 'framer-motion';

// Custom ECharts wrapper for React 19 compatibility (bypassing findDOMNode)
function CustomEChart({ option, style }: { option: any, style?: React.CSSProperties }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Initialize chart once
  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update option smoothly when it changes
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '220px', ...style }} />;
}

// --- FRONTEND KNOWLEDGE BASE FOR RAG REFERENCES ---
const FRONTEND_KNOWLEDGE_BASE: Record<string, Array<{source: string, title: string, content: string}>> = {
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
      "content": "对于腹腔镜微创胰十二指肠切除或吻合新术式的临床准入，科室首批开展案例需由资深高年资主治医师全程指导。主要安全性追踪指标为‘30天术后严重并发症发生率’（按 Clavien-Dindo 分级三级以上发生率不得高于5%），同时需严密随访吻合口漏、延迟胃排空及胰瘘。"
    },
    {
      "source": "微创外科医学教育协会《青年医师微创手术学习曲线规范》",
      "title": "手术操作熟练度与学习曲线(Cases)收敛平台",
      "content": "腹腔镜复杂吻合术式的学习曲线分析显示，随着青年医师操作案例数的累积，平均手术时间呈现明显的负指数收敛。一般在经过 20-30 例标准带教实训及大体模拟考核后，手术时间、术中出血量及术后胃排空延迟发生率进入相对平稳的‘技术成熟平台期’。"
    }
  ]
};

// --- FRONTEND MOCK DATA FALLBACKS ---
const PRESET_PAPERS = [
  {
    id: "devices-default",
    domain: "devices",
    title: "新型荧光探针在早期肿瘤切除手术中的应用",
    year: 2026,
    recommend: "推荐用于术中导航",
    params: {
      domain: "devices",
      paper_title: "新型荧光探针在早期肿瘤切除手术中的应用",
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
      // Fallback defaults for other domains to prevent TS issues
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
    }
  },
  {
    id: "drugs-default",
    domain: "drugs",
    title: "一种面向非小细胞肺癌的靶向 KRAS-G12C 突变创新药前药临床前研究",
    year: 2026,
    recommend: "推荐开展新药临床试验",
    params: {
      domain: "drugs",
      paper_title: "一种面向非小细胞肺癌的靶向 KRAS-G12C 突变创新药前药临床前研究",
      target_department: "肿瘤内科",
      financing_amount: 45.0,
      clinical_trial_site: "北京协和医院(GCP基地)",
      phase_1_duration: 24,
      sample_size: 40,
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
    }
  },
  {
    id: "ai-default",
    domain: "ai",
    title: "基于三维卷积神经网络的脑胶质瘤 MRI 图像术前智能分级与边界分割系统",
    year: 2026,
    recommend: "推荐用于 SaMD 系统部署",
    params: {
      domain: "ai",
      paper_title: "基于三维卷积神经网络的脑胶质瘤 MRI 图像术前智能分级与边界分割系统",
      target_department: "脑外科/神经外科",
      financing_amount: 8.0,
      clinical_trial_site: "华东地区三甲医院",
      phase_1_duration: 10,
      sample_size: 30,
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
    }
  },
  {
    id: "surgical-default",
    domain: "surgical",
    title: "完全腹腔镜下保留幽门的胰十二指肠切除术（LPPPD）改良术式与临床效能分析",
    year: 2026,
    recommend: "推荐微创术式标准化推广",
    params: {
      domain: "surgical",
      paper_title: "完全腹腔镜下保留幽门的胰十二指肠切除术（LPPPD）改良术式与临床效能分析",
      target_department: "普通外科",
      financing_amount: 5.0,
      clinical_trial_site: "华南地区三甲医院(中山大学附属医院等)",
      phase_1_duration: 18,
      sample_size: 25,
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
    }
  }
];

const DEFAULT_STATE = PRESET_PAPERS[0].params;

const DEFAULT_ROBOTS = [
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

interface NpuSandboxPanelProps {
  selectedPaperId: string;
}

function NpuSandboxPanel({ selectedPaperId }: NpuSandboxPanelProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setStatus('idle');
    setProgress(0);
    setLogs([]);
  }, [selectedPaperId]);

  const runSandbox = () => {
    setStatus('running');
    setProgress(0);
    setLogs(['[1] 正在初始化 ArkCompiler NPU 隐私安全沙箱虚拟机...']);

    const steps = [
      { p: 20, log: '[2] 载入端侧轻量化医学底座模型 (云脉-Lite 3B)...' },
      { p: 50, log: '[3] 扫描分析学术文本，智能匹配并提取受试者隐私哈希...' },
      { p: 80, log: '[4] 敏感数据脱敏过滤成功 (SHA-256 哈希比对通过)...' },
      { p: 100, log: '[5] 本地沙箱自检完成，生成本地安全加密元数据！' }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setProgress(step.p);
        setLogs(prev => [...prev, step.log]);
        if (index === steps.length - 1) {
          setStatus('completed');
        }
      }, (index + 1) * 800);
    });
  };

  return (
    <div className="npu-sandbox-container">
      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <button className="harmony-btn secondary" onClick={runSandbox} style={{ width: '100%', cursor: 'pointer' }}>
            启动 NPU 本地隐私校准
          </button>
        </div>
      )}

      {status === 'running' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="npu-progress-wrapper">
            <div className="npu-progress-bar" style={{ width: `${progress}%` }}></div>
            <span className="npu-progress-text">{progress}%</span>
          </div>
          <div className="npu-console-logs">
            {logs.map((log, i) => (
              <div key={i} className="npu-log-line">{log}</div>
            ))}
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="npu-success-box">
            <ShieldCheck size={16} style={{ color: 'var(--accent-green)' }} />
            <span>本地沙箱自检通过 - 隐私泄露概率 0.00%</span>
          </div>
          <div className="npu-console-logs">
            {logs.map((log, i) => (
              <div key={i} className="npu-log-line">{log}</div>
            ))}
          </div>
          <button className="harmony-btn secondary" onClick={() => setStatus('idle')} style={{ width: '100%', marginTop: '6px', cursor: 'pointer' }}>
            重新运行校准
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  // API Config
  const [apiKey, setApiKey] = useState('');
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    "作为“云脉”系统的协同助手“医算子”，你需要结合学术论文中的理化与药代指标，推导并验证临床可行性及商业可行性。微调指令应联动触发技术理解、场景匹配与执行输出三个智能体，实现全链路参数与生成文档的一致性更新。用户提问时，请基于当前提取的分子物理化学参数、适配的手术机器人及生成的临床方案和商业计划书，给予专业、详实的解答。"
  );
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [modelProvider, setModelProvider] = useState('DeepSeek');

  // Auto-detect and pre-select provider on API Key paste
  useEffect(() => {
    if (!apiKey) return;
    const lowerKey = apiKey.toLowerCase();
    if (lowerKey.startsWith('sk-or-')) {
      setModelProvider('OpenRouter');
    } else if (lowerKey.includes('pangu') || lowerKey.includes('huawei') || lowerKey.startsWith('hw-') || lowerKey.includes('hwcloud')) {
      setModelProvider('Huawei Pangu');
    } else if (lowerKey.includes('gemini') || lowerKey.startsWith('ai_')) {
      setModelProvider('Google Gemini');
    } else if (lowerKey.startsWith('sk-d') || lowerKey.includes('deepseek')) {
      setModelProvider('DeepSeek');
    } else if (lowerKey.startsWith('sk-')) {
      setModelProvider('OpenAI');
    }
  }, [apiKey]);

  const detectProvider = (key: string) => {
    if (!key) return '';
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('sk-or-')) return 'OpenRouter';
    if (lowerKey.startsWith('sk-d') || lowerKey.includes('deepseek')) return 'DeepSeek';
    if (lowerKey.startsWith('sk-') || lowerKey.includes('openai')) return 'OpenAI';
    if (lowerKey.includes('pangu') || lowerKey.includes('huawei') || lowerKey.startsWith('hw-') || lowerKey.includes('hwcloud')) return 'Huawei Pangu';
    if (lowerKey.startsWith('pb-') || lowerKey.includes('anthropic') || lowerKey.includes('claude')) return 'Anthropic Claude';
    if (lowerKey.includes('gemini') || lowerKey.startsWith('ai_')) return 'Google Gemini';
    return '通用 API 开发者 Key';
  };

  // App States
  const [paperSelected, setPaperSelected] = useState(true);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('devices-default');
  const [customPapers, setCustomPapers] = useState<Array<{
    id: string,
    title: string,
    isCustom: boolean,
    params: typeof DEFAULT_STATE
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pipelineStep, setPipelineStep] = useState(0); // 0: Idle, 1: Understanding, 2: Matching, 3: Completed
  const [currentTab, setCurrentTab] = useState('params'); // params, matching, docs
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [harmonySynced, setHarmonySynced] = useState(false);
  const [isSyncingHarmony, setIsSyncingHarmony] = useState(false);

  // RAG references & Caching states (Phase 7)
  const [ragReferences, setRagReferences] = useState<Array<{source: string, title: string, content: string}>>([]);
  const [isHarmonyDrawerOpen, setIsHarmonyDrawerOpen] = useState(false);
  const [runCache, setRunCache] = useState<Record<string, {
    pipelineStep: number;
    currentTab: string;
    state: typeof DEFAULT_STATE;
    matchedRobots: typeof DEFAULT_ROBOTS;
    clinicalDoc: string;
    bpDoc: string;
    ragReferences: Array<{source: string, title: string, content: string}>;
    harmonySynced: boolean;
  }>>({});

  const handleSelectPaper = (paperId: string, paperParams: any) => {
    // 1. Save current state of the old selected paper to cache
    if (selectedPaperId) {
      setRunCache(prev => ({
        ...prev,
        [selectedPaperId]: {
          pipelineStep,
          currentTab,
          state,
          matchedRobots,
          clinicalDoc,
          bpDoc,
          ragReferences,
          harmonySynced
        }
      }));
    }

    // 2. Set new selected paper
    setSelectedPaperId(paperId);
    setPaperSelected(true);

    // 3. Load from cache or clear results
    const cached = runCache[paperId];
    if (cached) {
      setPipelineStep(cached.pipelineStep);
      setCurrentTab(cached.currentTab);
      setState(cached.state);
      setMatchedRobots(cached.matchedRobots);
      setClinicalDoc(cached.clinicalDoc);
      setBpDoc(cached.bpDoc);
      setRagReferences(cached.ragReferences);
      setHarmonySynced(cached.harmonySynced);
    } else {
      setPipelineStep(0);
      setCurrentTab('params');
      setState(paperParams);
      setMatchedRobots([]);
      setClinicalDoc('');
      setBpDoc('');
      setRagReferences([]);
      setHarmonySynced(false);
    }

    // 4. Sync state with backend if available
    if (isOnlineMode && backendAvailable) {
      fetch(`${BACKEND_URL}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paperParams)
      }).catch(err => console.error("Error syncing paper state:", err));
    }
  };

  const handleClearResults = () => {
    if (isAnalyzing) return;

    // Reset current run states
    setPipelineStep(0);
    setCurrentTab('params');
    setMatchedRobots([]);
    setClinicalDoc('');
    setBpDoc('');
    setRagReferences([]);
    setHarmonySynced(false);

    // Reset parameters to paper default
    let defaultParams = DEFAULT_STATE;
    if (selectedPaperId.endsWith('-default')) {
      const p = PRESET_PAPERS.find(x => x.id === selectedPaperId);
      if (p) defaultParams = p.params;
    } else {
      const p = customPapers.find(x => x.id === selectedPaperId);
      if (p) defaultParams = p.params;
    }
    setState(defaultParams);

    // Remove from cache
    setRunCache(prev => {
      const copy = { ...prev };
      delete copy[selectedPaperId];
      return copy;
    });

    if (isOnlineMode && backendAvailable) {
      fetch(`${BACKEND_URL}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultParams)
      }).catch(err => console.error("Error resetting state:", err));
    }
  };
  
  // Dynamic parameters synced with backend
  const [state, setState] = useState(DEFAULT_STATE);
  const [matchedRobots, setMatchedRobots] = useState(DEFAULT_ROBOTS);

  const generateParamsForCustomPaper = (fileName: string, fileContent: string) => {
    const title = fileName.replace(/\.[^/.]+$/, "");
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);

    let domain = "devices";
    const textToCheck = (fileName + " " + fileContent).toLowerCase();
    
    if (textToCheck.includes("unet") || textToCheck.includes("cnn") || textToCheck.includes("samd") || textToCheck.includes("影像") || textToCheck.includes("诊断") || textToCheck.includes("算法") || textToCheck.includes("深度学习") || textToCheck.includes("ai") || textToCheck.includes("segmentation") || textToCheck.includes("neural") || textToCheck.includes("transformer") || textToCheck.includes("accuracy") || textToCheck.includes("latency")) {
      domain = "ai";
    } else if (textToCheck.includes("kras") || textToCheck.includes("inhibitor") || textToCheck.includes("靶向药") || textToCheck.includes("药物") || textToCheck.includes("抗体") || textToCheck.includes("前药") || textToCheck.includes("drug") || textToCheck.includes("antibody") || textToCheck.includes("monoclonal") || textToCheck.includes("target")) {
      domain = "drugs";
    } else if (textToCheck.includes("lpppd") || textToCheck.includes("laparoscopic") || textToCheck.includes("surgical") || textToCheck.includes("术式") || textToCheck.includes("腹腔镜") || textToCheck.includes("切除术") || textToCheck.includes("缝合") || textToCheck.includes("resection") || textToCheck.includes("reconstruction") || textToCheck.includes("anastomosis") || textToCheck.includes("suture")) {
      domain = "surgical";
    }

    const baseParams = {
      domain: domain,
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
      let excitation = 750 + (absHash % 70); // 750nm - 820nm
      let emission = excitation + 30;
      let halfLife = parseFloat((1.5 + (absHash % 30) / 10).toFixed(1));
      let metabolic = halfLife * 10;
      let ld50 = 40 + (absHash % 40);
      let mtd = parseFloat((ld50 / 10).toFixed(1));
      
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
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    const isText = file.name.endsWith('.txt') || file.name.endsWith('.md');
    
    reader.onload = async (e) => {
      const textContent = isText ? (e.target?.result as string) : '';
      setIsAnalyzing(true);
      
      try {
        const title = file.name.replace(/\.[^/.]+$/, "");
        const res = await fetch(`${BACKEND_URL}/analyze-paper`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            content: textContent.substring(0, 4000),
            api_key: isOnlineMode ? apiKey : null,
            provider: isOnlineMode ? modelProvider : null
          })
        });
        const data = await res.json();
        setIsAnalyzing(false);
        
        if (data.status === 'warning' || !data.is_valid) {
          alert(`⚠️ 警告: 上传的文件验证未通过！\n\n原因: ${data.reason}\n\n该文档将不会被系统导入。`);
          return;
        }
        
        const verifiedParams = data.state;
        const newPaper = {
          id: 'custom-' + Date.now(),
          title: title,
          isCustom: true,
          content: textContent,
          params: verifiedParams
        };
        
        setCustomPapers(prev => [...prev, newPaper]);
        handleSelectPaper(newPaper.id, verifiedParams);
        console.log("Successfully verified and imported paper:", verifiedParams);
        
      } catch (err) {
        console.error("Backend error in analyze-paper during upload", err);
        setIsAnalyzing(false);
        
        // Local keyword checking fallback if offline
        const localParams = generateParamsForCustomPaper(file.name, textContent);
        const validKeywords = [
          "probe", "wavelength", "clinical", "tumor", "fluorescent", "cancer", "imaging", "spectroscopy", 
          "toxicity", "pharmacokinetics", "clearance", "half-life", "efficacy", "safety", "patient", "trial",
          "探针", "波长", "临床", "肿瘤", "荧光", "医学", "细胞", "手术", "成像", "切除", "治疗",
          "drug", "kras", "inhibitor", "unet", "cnn", "samd", "laparoscopic", "surgical", "procedure", "resection",
          "lpppd", "pancreatoduodenectomy", "靶向药", "突变", "影像", "诊断", "算法", "重建", "therapeutic", "antibody",
          "device", "diagnosis", "accuracy", "sensitivity", "specificity", "auc", "segmentation", "reconstruction"
        ];
        const textToCheck = (file.name + " " + textContent).toLowerCase();
        const hasKeyword = validKeywords.some(kw => textToCheck.includes(kw));
        
        if (!hasKeyword) {
          alert(`⚠️ 警告: 上传文件未通过本地规则校验！ / Local check failed!\n\n原因: 该文档不属于医疗健康、生物医学、诊疗算法或临床术式等转化医学相关领域，拒绝导入。\nReason: Document does not contain key terms related to translational medicine.`);
          return;
        }
        
        const newPaper = {
          id: 'custom-' + Date.now(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          isCustom: true,
          content: textContent,
          params: localParams
        };
        
        setCustomPapers(prev => [...prev, newPaper]);
        handleSelectPaper(newPaper.id, localParams);
      }
    };
    
    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file.slice(0, 1000));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processUploadedFile(file);
    }
  };

  const handleDeletePaper = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCustomPapers(prev => prev.filter(p => p.id !== id));
    
    setRunCache(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (selectedPaperId === id) {
      const defaultId = PRESET_PAPERS[0].id;
      handleSelectPaper(defaultId, PRESET_PAPERS[0].params);
    }
  };
  
  // Documents markdown contents
  const [clinicalDoc, setClinicalDoc] = useState('');
  const [bpDoc, setBpDoc] = useState('');

  // Chat/QA Agent States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{sender: 'user' | 'assistant', text: string}>>([
    {
      sender: 'assistant',
      text: '您好！我是“云脉”智慧医疗多智能体系统的交互顾问——“医算子”。我已预置了通用成果转化平台，目前支持四大转化医学细分领域：\n\n1. 📂 医疗器械与成像分子（代表作：荧光成像探针）\n2. 💊 创新药物与生物治疗（代表作：KRAS-G12C 靶向药）\n3. 🧠 医疗 AI 与智能诊断（代表作：脑胶质瘤 3D-Unet 图像分割）\n4. 🏥 创新临床术式与疗法（代表作：腔镜 LPPPD 改良术式）\n\n作为专为成果转化设计的智能顾问，我能根据您的意图实时联动技术理解、场景匹配与执行输出智能体。您可以随时输入微调指令，例如：\n- “将新药靶点改为 EGFR，适应症改为肺腺癌”\n- “把SaMD准确率提升至 95%，推理时延降低到 12ms”\n- “将手术部位改为肝脏切除区，学习曲线例数改为 15例”\n- “融资额度调整为 3000万，临床基地改为北京协和医院”'
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Test backend availability on mount
  const BACKEND_URL = "http://127.0.0.1:8000/api";
  useEffect(() => {
    fetch(`${BACKEND_URL}/state`)
      .then(res => res.json())
      .then(data => {
        setState(data);
        setBackendAvailable(true);
        setIsOnlineMode(true); // default to online mode if backend available
        console.log("Successfully connected to FastAPI Backend");
      })
      .catch(err => {
        setBackendAvailable(false);
        setIsOnlineMode(false); // default to mock mode if backend unavailable
        console.warn("Backend not running. Falling back to frontend mock system.");
      });
  }, []);

  // Sync current run states to cache when they change
  useEffect(() => {
    if (selectedPaperId && pipelineStep > 0) {
      setRunCache(prev => ({
        ...prev,
        [selectedPaperId]: {
          pipelineStep,
          currentTab,
          state,
          matchedRobots,
          clinicalDoc,
          bpDoc,
          ragReferences,
          harmonySynced
        }
      }));
    }
  }, [pipelineStep, currentTab, state, matchedRobots, clinicalDoc, bpDoc, ragReferences, harmonySynced, selectedPaperId]);

  // Recalculate documents on parameters change (Local Mock Fallback generator)
  useEffect(() => {
    if (pipelineStep !== 3) {
      setClinicalDoc('');
      setBpDoc('');
      return;
    }
    const domain = state.domain || 'devices';
    
    const genClinical = () => {
      if (domain === 'drugs') {
        return `# 🏥 《${state.paper_title}》临床试验设计方案草案 (Phase I/II)

## 1. 试验基本信息与研究目的
*   **研发靶点**：${(state as any).target || 'KRAS-G12C'}
*   **目标适应症**：${(state as any).indication || '非小细胞肺癌'}
*   **试验分期**：I期临床研究 (IND获批后阶段)
*   **首要目的**：在受试者中评估靶向药物对 ${(state as any).indication || '非小细胞肺癌'} 的耐受性、安全性，并确定最大耐受剂量 (MTD) 及限制毒性剂量 (DLT)。
*   **次要目的**：测定单次与多次给药的药代动力学参数（血浆消除半衰期预计为 ${(state as any).drug_half_life || 12.0} 小时），并评估主要疗效终点（如客观缓解率 ORR，预计主要疗效达标值）。

## 2. 受试者入组与排除标准
### 2.1 入组标准
1.  年龄 18 至 75 周岁，确诊为晚期 ${(state as any).indication || '非小细胞肺癌'} 且经过标准治疗失败的患者。
2.  具有可测量病灶（符合 RECIST 1.1 标准），主要脏器功能符合入组要求。
3.  拟就诊或签约开展一期研究科室为：**${state.target_department}**。
4.  自愿在 **${state.clinical_trial_site}** 进行全程监测并签署知情同意书。

### 2.2 排除标准
1.  入组前4周内接受过大手术或系统性抗肿瘤治疗者。
2.  具有明显的排泄/代谢障碍（由于血浆消除半衰期长达 ${(state as any).drug_half_life || 12.0} 小时，若肝肾代谢严重不全则蓄积毒性过大）。
3.  有严重心脑血管疾病或无法控制的脑转移患者。

## 3. 给药剂量与安全保障
*   **起始剂量推算**：根据非临床动物毒理学试验确立的限制毒性剂量 DLT 为 ${(state as any).dlt_dose || 400.0} mg/m²，人体起始剂量采用 1/10 DLT，即 **${(((state as any).dlt_dose || 400.0) * 0.1).toFixed(1)} mg/m²**。
*   **爬坡方案**：采用标准“3+3”剂量递增设计，设4个爬坡剂量组。
*   **毒性监测**：严密观察血常规及心电图，在给药后 24-48 小时内重点观测剂量限制性毒性反应。

## 4. 试验设计与进度规划
*   **受试者规模**：计划入组 **${state.sample_size}** 例患者。
*   **临床试验中心**：由 **${state.clinical_trial_site}** 伦理委员会批准后在 GCP 中心实施。
*   **操作周期**：项目周期预计为 **${state.phase_1_duration} 个月**。
`;
      } else if (domain === 'ai') {
        return `# 🏥 《${state.paper_title}》SaMD 临床效能验证与质量控制方案

## 1. 试验基本信息与研究目的
*   **软件分类**：医疗器械软件 (SaMD - Software as a Medical Device)
*   **模型架构**：基于 ${(state as any).architecture || '3D-Unet'} 的智能 analysis 模型
*   **影像模态**：支持 ${(state as any).modality || 'MRI-T2WI'} 三维图像自动处理
*   **首要目的**：通过回顾性与前瞻性临床队列，验证 SaMD 算法对病灶检出和分级的灵敏度与特异度（目标 AUC 精度达 ${(state as any).accuracy || 92.4}%）。
*   **次要目的**：评估模型在边缘计算环境的推理延迟（平均 latency 达 ${(state as any).latency || 18.5} ms 以内），检测其并发稳定性，保障临床实时阅片应用可行性。

## 2. 受试者（影像数据）入组与排除标准
### 2.1 入组标准
1.  在 **${state.clinical_trial_site}** 影像数据库中建档的 ${(state as any).modality || 'MRI-T2WI'} 图像，具备完整的病理学诊断金标准。
2.  图像分辨率、层厚符合临床规范，DICOM 标准头文件信息完整，主治/诊断科室为 **${state.target_department}**。
3.  图像无严重伪影，病灶清晰可见。

### 2.2 排除标准
1.  影像图像质量低下（伪影严重、扫描范围不全、无对比度增强相）。
2.  不符合 ${(state as any).integration_standard || 'DICOM 3.0'} 规范，无法被软件自动解析的非标准格式数据。

## 3. 临床对比测试与金标准建立
*   **金标准建立**：以三位资深高年资主治医师的联合阅片及组织病理学诊断为金标准。
*   **软件运算与延迟**：图像输入系统后， SaMD 模型在边缘 GPU 服务器运行，要求单次推理延迟不超过 **${(state as any).latency || 18.5} ms**，全程保持数据沙箱隔离。
*   **效能评估**：计算模型输出的特异性、敏感性与一致性 kappa 指标，目标综合准确度不低于 ${(state as any).accuracy || 92.4}%。

## 4. 试验设计与进度规划
*   **样本规模**：回顾性收集不少于 **${state.sample_size * 10} 例** 患者的脱敏影像病例。
*   **测试中心**：在 **${state.clinical_trial_site}** 信息科与**${state.target_department}**进行联合临床效能评价。
*   **项目周期**：预计研发与临床效能验证总耗时 **${state.phase_1_duration} 个月**。
`;
      } else if (domain === 'surgical') {
        return `# 🏥 《${state.paper_title}》创新临床术式标准化路径指南与临床前评估

## 1. 术式基本信息与开发目的
*   **手术解剖部位**：${(state as any).anatomical_site || '胰腺十二指肠区'}
*   **核心器械配置**：${(state as any).core_instruments || '腹腔镜能量切割闭合器'}
*   **主要评估目的**：规范并在科室推广完全镜下 ${(state as any).anatomical_site || '胰腺十二指肠区'} 切除与改良缝合重建术式，缩短青年医师学习曲线。
*   **临床安全终点**：在临床准入阶段，严密追踪患者术后并发症发生情况，要求首批开展病例的“${(state as any).safety_endpoint || '30天术后并发症率'}”优于传统开腹或常规腔镜对照组。

## 2. 适应受试患者入组与排除标准
### 2.1 入组标准
1.  影像学诊断为 ${(state as any).anatomical_site || '胰腺十二指肠区'} 良恶性肿瘤，具备明确微创腔镜手术指征者。
2.  心肺功能良好，能耐受气腹及长时间全身麻醉。
3.  就诊科室为：**${state.target_department}**。
4.  自愿在 **${state.clinical_trial_site}** 接受改良术式治疗并签署特别知情同意书。

### 2.2 排除标准
1.  肿瘤严重侵犯周围大血管，预估完全腔镜下无法安全游离重建者。
2.  具有凝血功能障碍或高度恶病质，术后伤口愈合极度不良者。

## 3. 术式核心流程与操作质控
*   **核心器械操作**：全程采用 **${(state as any).core_instruments || '腹腔镜能量切割闭合器'}** 进行精细切割、止血和缝合关闭。
*   **青年医师带教**：设定 **${(state as any).learning_curve_cases || 25} 例** 的学习曲线目标。参与医师需在大体解剖室进行模拟训练方能进入一期临床实操。
*   **安全性追踪**：重点跟踪并登记术后吻合口漏、延迟愈合以及“**${(state as any).safety_endpoint || '30天术后并发症率'}**”，若发生严重三级并发症需立刻中止准入流程。

## 4. 临床前评估与示范规划
*   **样本量**：临床准入示范案例共 **${state.sample_size}** 例。
*   **基地选址**：在 **${state.clinical_trial_site}** 微创手术中心开展首期应用。
*   **推广周期**：标准流程固化与科室医师培训周期预计为 **${state.phase_1_duration} 个月**。
`;
      } else {
        return `# 🏥 《${state.paper_title}》一期临床试验设计方案草案 (Phase I)

## 1. 试验基本信息与研究目的
*   **产品名称**：基于 ${state.excitation_wavelength}nm 激发的早期肿瘤靶向荧光探针（FL-Probe-${int(state.excitation_wavelength)}）
*   **研发代号**：OPC-MED-001
*   **试验分期**：I 期临床试验 (Phase I)
*   **首要目的**：评估健康受试者及早期肿瘤患者单次静脉注射 FL-Probe-${int(state.excitation_wavelength)} 的安全性、耐受性以及药代动力学（PK）特征。
*   **次要目的**：初步探索探针在术中导航的显像对比度、最佳显像时间窗口以及主要脏器蓄积情况。

## 2. 受试者入组与排除标准
### 2.1 入组标准 (Inclusion Criteria)
1.  年龄 18 至 75 周岁，男女不限。
2.  经病理学或影像学诊断为早期肿瘤（如原发性肝癌、神经胶质瘤等），且计划在 ${state.clinical_trial_site} 进行手术切除。
3.  拟切除病灶符合术中荧光显像导航指征，主治科室为：**${state.target_department}**。
4.  主要脏器功能良好（血常规、肝肾功能指标符合临床试验要求）。
5.  自愿参加本试验并签署知情同意书。

### 2.2 排除标准 (Exclusion Criteria)
1.  有严重过敏史，或对近红外造影材料（如吲哚菁绿 ICG）过敏者。
2.  严重肝功能不全（Child-Pugh C级）或肾功能严重受损患者（由于主要排泄半衰期为 {state.half_life} 小时，需完全通过肾脏代谢清除）。
3.  孕期或哺乳期妇女。

## 3. 给药剂量与安全保障
*   **起始剂量推算**：根据非临床毒理学试验得出的安全参数（最大耐受剂量 MTD 为 ${state.mtd} mg/kg，半数致死量 LD50 为 ${state.ld50} mg/kg），采用 1/10 MTD 作为人体起始剂量，即给药浓度为 **${(state.mtd * 0.1).toFixed(2)} mg/kg**。
*   **给药方式**：术前 2 至 4 小时进行外周静脉注射，注射速率恒定。
*   **排泄监视**：由于探针完全代谢周期为 **${state.metabolic_cycle} 小时**，在给药后 24 小时内需严密监测尿液及主要器官（肾脏、膀胱）的荧光蓄积情况，保障体内无药物残留。

## 4. 试验设计与进度规划
*   **设计类型**：单中心、开放性、剂量递增设计。
*   **受试者规模**：预计入组 **${state.sample_size}** 例患者。
*   **临床中心**：由 **${state.clinical_trial_site}** 科研伦理委员会批准并组织实施。
*   **操作周期**：项目周期预计为 **${state.phase_1_duration} 个月**。
`;
      }
    };

    const genBp = () => {
      if (domain === 'drugs') {
        return `# 🚀 创新靶向新药（FL-Target-${(state as any).target || 'KRAS-G12C'}）临床开发与商业融资计划书

## 1. 行业痛点与未满足的临床需求
目前在晚期 ${(state as any).indication || '非小细胞肺癌'} 临床治疗中，传统化疗和免疫治疗面临着响应率低、耐药性强和全身系统毒性高的瓶颈。
针对 ${(state as any).target || 'KRAS-G12C'} 突变或过表达靶点的创新靶向小分子药是目前的行业突破口。本管线药物旨在通过高度特异的口袋结合设计攻克耐药难题，为患者提供更高缓解率和更安全长期的口服给药选项，直接打入未满足的数百亿临床空缺市场。

## 2. 核心技术壁垒与优势
*   **高亲和力靶向机制**：对 ${(state as any).target || 'KRAS-G12C'} 具有纳摩级 (nM) 的极高抑制活性，选择性高，脱靶毒性低。
*   **卓越药代特征**：血浆半衰期达 ${(state as any).drug_half_life || 12.0} 小时，给药顺应性高，体内起效浓度维持时间长。
*   **安全性宽裕**：限制毒性剂量 DLT 为 ${(state as any).dlt_dose || 400.0} mg/m²，非临床安全性窗口宽，相比第一代靶向药毒副反应大为减弱。

## 3. 市场定位与产业化配套对接
通过成果转化 Agent，我们已与国内顶级的医药工业制造（CDMO）车间达成了中试产线的 GMP 供货协议，能提供高产量的低成本原料药及片剂供应。
在目标三甲医院的 **${state.target_department}** 形成了示范中心，该科室每年诊治的 ${(state as any).indication || '非小细胞肺癌'} 病患数逾千例，受试者招募速度极快，为一期及后续临床快速落地奠定了基础。

## 4. 融资规划与资金用途
*   **融资金额**：**${state.financing_amount * 100} 万人民币**（${state.financing_amount} Million RMB）。
*   **出让股权**：10% - 15%（视最终路演及协议确定）。
*   **资金划拨与用途**：
    1.  **60%** 用于在 **${state.clinical_trial_site}** 开展临床I/II期推进，预计招募 ${state.sample_size} 例受试者，耗时 ${state.phase_1_duration} 个月。
    2.  **20%** 用于完成管线在 CDMO 平台的中试药学（CMC）及原料药生产验证。
    3.  **20%** 用于公司日常研发人员激励、知识产权全球防御布局以及二代后备管线的立项。

## 5. 项目里程碑规划
*   **Q1-Q2**：向国家药监局递交正式 IND 申报，并在一期基地通过伦理审查。
*   **Q3-Q4**：启动首组剂量组爬坡，评估 DLT 安全指标。
*   **次年**：完成全部 **${state.sample_size} 例** 队列招募，争取公布初步 ORR/PFS 药效终点数据并筹备A+轮融资。
`;
      } else if (domain === 'ai') {
        return `# 🚀 创新 SaMD 医疗影像辅助智能诊断软件（AI-Vision-SaMD）商业化白皮书

## 1. 行业痛点与未满足的临床需求
在临床放射和阅片流程中，阅片医生工作量极度饱和，人工阅片易疲劳且对微小/边缘病灶的漏诊率达 15%-20%。
尤其在**${state.target_department}**中，依靠人眼界定肿瘤浸润范围极具主观性，常导致切除范围不精确。
本 SaMD 软件利用先进的 ${(state as any).architecture || '3D-Unet'} 神经网络架构，实现对 ${(state as any).modality || 'MRI-T2WI'} 图像的高级智能分幅和边界像素级自动勾画，助力术前精准规划和术中决策。

## 2. 核心技术壁垒与优势
*   **诊断准确性极高**：利用大规模临床数据库预训练，在独立测试集上对病灶提取的敏感性/特异性 AUC 精度达 **${(state as any).accuracy || 92.4}%**。
*   **超低推理延迟**：优化的 TensorRT 硬件部署方案使得单帧推理时间仅 **${(state as any).latency || 18.5} ms**，完全契合实时术中阅片与多终端阅片的高吞吐响应。
*   **标准无缝接入**：完美兼容 **${(state as any).integration_standard || 'DICOM 3.0'}** 协议规范，无需重构医院原有 PACS 系统即可实现平滑热接入。

## 3. 市场定位与医院信息化生态集成
首批主要切入三甲医院的 **${state.target_department}** 与**放射科**。目前已成功与国内主流的影像 PACS 系统完成技术对接联调，具备跨品牌快速部署优势，目前国内目标装机量市场估值已达数亿元。

## 4. 融资规划与资金用途
*   **融资金额**：**${state.financing_amount * 100} 万人民币**（${state.financing_amount} Million RMB）。
*   **资金划拨与用途**：
    1.  **50%** 用于在 **${state.clinical_trial_site}** 等多家影像大数据中心开展前瞻性效能验证（计划评估影像库样本 ${state.sample_size * 10} 例，耗时 ${state.phase_1_duration} 个月）。
    2.  **30%** 用于算法的软硬件国产化平台适配、NVIDIA 边缘服务器方案开发、以及向国家药监局递交三类医疗器械 SaMD 注册申报（NMPA）。
    3.  **20%** 用于核心开发人员招募及市场预售渠道开发。

## 5. 项目里程碑规划
*   **Q1-Q2**：获得国家三类医疗器械分类界定，完成临床试验伦理备案。
*   **Q3-Q4**：联合 **${state.clinical_trial_site}** 完成全部 **${state.sample_size * 10} 例** 数据对比评价，争取拿到正式 NMPA 注册证。
*   **次年**：启动全国百家医院的云端 PACS 装机推广，开展商业化变现与订阅式 SaaS 服务合作。
`;
      } else if (domain === 'surgical') {
        return `# 🚀 腹腔镜下改良 ${(state as any).anatomical_site || '胰腺十二指肠区'} 临床新术式推广与技术推介书

## 1. 行业痛点与未满足的临床需求
在传统微创手术中，针对 ${(state as any).anatomical_site || '胰腺十二指肠区'} 的大范围切除与吻合重建难度极高，极易发生吻合口漏、胰漏等致命并发症。年轻医生需要经过数百例的漫长学习才能掌握，技术难以向下沉医院普及。
本术式改良了切除游离与缝合对合路径，配合最前沿的 **${(state as any).core_instruments || '腹腔镜能量切割闭合器'}** 自动缝合，大幅降低吻合难度，将学习曲线周期缩短近一半，极具全国科室普及价值。

## 2. 核心技术特征与优势
*   **安全终点极佳**：通过大量数据统计，该改良术式的术后“**${(state as any).safety_endpoint || '30天术后并发症率'}**”发生率远低于常规对照组。
*   **培训门槛低**：优化带教方案，新术式的临床带教和学习曲线仅需 **${(state as any).learning_curve_cases || 25}** 例即可掌握，极大地缓解了年轻高潜医师短缺的困境。
*   **器械依赖合理**：完全兼容各大手术室标准的 **${(state as any).core_instruments || '腹腔镜能量切割闭合器'}** 及 4K 腔镜塔，不增加医院额外的重资产采购负担。

## 3. 市场推广与教学基地构建
我们将一期试验和带教实训中心设在 **${state.clinical_trial_site}** 手术实训室，利用高仿真动物和离体大体标本进行系统化规范带教，辐射带动周边下沉医院在 **${state.target_department}** 开展术式准入。

## 4. 融资规划与资金用途
*   **融资金额**：**${state.financing_amount * 100} 万人民币**（${state.financing_amount} Million RMB）。
*   **资金划拨与用途**：
    1.  **60%** 用于在 **${state.clinical_trial_site}** 进行为期 **${state.phase_1_duration} 个月** 的医师进修培训班开设及首批 **${(state as any).learning_curve_cases || 25}** 例带教大体实训。
    2.  **20%** 用于出版手术标准操作音视频、手术指南专家共识撰写及推广会赞助。
    3.  **20%** 用于公司核心团队的带教模拟器研发、器械包定制等项目开支。

## 5. 项目里程碑规划
*   **Q1-Q2**：联合领域内权威专家录制改良术式的标准演示案例并提交伦理安全审定。
*   **Q3-Q4**：招募并顺利带教首批进修班医生，完成全部示范临床带教工作。
*   **次年**：发布大样本多中心安全性随访数据，力争将该改良术式写入行业微创手术标准临床路径指南。
`;
      } else {
        return `# 🚀 创新早期肿瘤切除荧光探针（FL-Probe-${int(state.excitation_wavelength)}）商业融资计划书

## 1. 行业痛点与未满足的临床需求
在早期肿瘤切除手术中，医生极难通过肉眼及触觉精确界定肿瘤边界。切除过多会导致重要神经和血管损伤（尤其在**${state.target_department}**领域，如肝门区手术或脑胶质瘤手术）；切除过少则会导致肿瘤残留，引起复发。
本产品通过 AI4S 设计的靶向探针结合荧光手术机器人，能实现毫米级的术中实时导航，极大降低病灶残留率。

## 2. 核心技术壁垒与优势
*   **靶向精准度**：特异性结合早期肿瘤细胞，信噪比 (TBR) > 5.5。
*   **物理性能优异**：发射光谱位于 ${state.emission_wavelength}nm 近红外区，组织穿透深度达 1.5 cm，完美匹配各大手术机器人内置相机。
*   **极佳安全性**：代谢周期仅 **${state.metabolic_cycle} 小时**，半衰期仅 **${state.half_life} 小时**，快速通过肾脏排出，无重金属蓄积毒性。LD50 达 ${state.ld50} mg/kg，临床安全窗口极宽。

## 3. 市场定位与设备兼容性匹配
我们通过场景匹配 Agent，精准对接了国内已装机的荧光手术机器人系统。首选匹配型号为国内领先的手术导航平台，其激发光谱完美兼容本探针的 ${state.excitation_wavelength}nm 激发光。
在主要装机科室中，**${state.target_department}**对术中导航的需求最为迫切，首批目标示范医院装机量已达数百台，具备极佳的商业变现基础。

## 4. 融资规划与资金用途
*   **融资金额**：**${state.financing_amount * 100} 万人民币**（${state.financing_amount} Million RMB）。
*   **资金划拨与用途**：
    1.  **60%** 用于在 **${state.clinical_trial_site}** 开展 I 期临床试验（计划招募 {state.sample_size} 例受试者，耗时 {state.phase_1_duration} 个月）。
    2.  **20%** 用于中试车间的 GMP 升级与药学研究（CMC）。
    3.  **20%** 用于 OPC（一人公司）核心研发团队建设、专利全球布局以及后续管线研发。

## 5. 项目里程碑规划
*   **Q1-Q2**：完成 IND 临床试验申报批件获取，在首家临床基地启动伦理审查。
*   **Q3-Q4**：招募首组受试者，完成首批安全剂量组爬坡试验。
*   **次年**：完成全部 **${state.sample_size} 例** 临床案例收集，发表临床安全性数据并启动 Phase II 筹备。
`;
      }
    };

    setClinicalDoc(genClinical());
    setBpDoc(genBp());
  }, [state, pipelineStep]);

  const int = (val: any) => Math.round(parseFloat(val));

  // Trigger full pipeline simulation
  const startTranslation = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setPipelineStep(1); // Stage 1: Technical Understanding Agent
    setCurrentTab('params');
    
    let paperTitle = PRESET_PAPERS[0].title;
    let paperContent = "新型近红外二区（NIR-II）荧光探针在早期微小肝癌术中导航切除手术中的应用研究。该探针最佳激发光为790nm，发射光为820nm，在小鼠及人体排泄半衰期约为2.4小时，完全清除周期为24小时。毒理学测试表明半数致死量LD50为50mg/kg，最大耐受剂量MTD为5.0mg/kg。目标主治科室为肝胆外科。";
    
    if (selectedPaperId.endsWith('-default')) {
      const presetP = PRESET_PAPERS.find(p => p.id === selectedPaperId);
      if (presetP) {
        paperTitle = presetP.title;
        paperContent = presetP.title + " (预置论文)";
      }
    } else if (selectedPaperId !== '') {
      const customP = customPapers.find(p => p.id === selectedPaperId);
      if (customP) {
        paperTitle = customP.title;
        paperContent = (customP as any).content || "";
      }
    }

    let nextState = state;
    if (isOnlineMode && backendAvailable) {
      try {
        const res = await fetch(`${BACKEND_URL}/analyze-paper`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: paperTitle,
            content: paperContent,
            api_key: apiKey || null,
            provider: modelProvider || null
          })
        });
        const data = await res.json();
        
        if (data.status === 'warning' || !data.is_valid) {
          alert(`⚠️ 大模型分析警告: ${data.reason}`);
          setIsAnalyzing(false);
          setPipelineStep(0);
          return;
        }
        
        nextState = data.state;
        setState(nextState);
        setRagReferences(data.rag_references || FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
      } catch (err) {
        console.error("Backend fetch error in analyze-paper", err);
      }
    } else {
      setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
    }

    setTimeout(async () => {
      setPipelineStep(2); // Stage 2: Scenario Matching Agent
      setCurrentTab('matching');
      
      if (isOnlineMode && backendAvailable) {
        try {
          const res = await fetch(`${BACKEND_URL}/match-scenarios?domain=${nextState.domain}&wavelength=${nextState.excitation_wavelength}&department=${nextState.target_department}`);
          const data = await res.json();
          setMatchedRobots(data.matches);
        } catch (err) {
          console.error("Backend fetch error in match-scenarios", err);
        }
      } else {
        // Local calculation of robot matching based on wavelength/department
        let updated = [];
        if (nextState.domain === 'drugs') {
          updated = [
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
        } else if (nextState.domain === 'ai') {
          updated = [
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
              description: "专为三维超大卷积网络 and Transformer医学影像模型优化设计的边缘推理服务器集群，可将延迟压低至 10ms。"
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
        } else if (nextState.domain === 'surgical') {
          updated = [
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
        } else {
          updated = DEFAULT_ROBOTS.map(robot => {
            let score = 90;
            if (robot.id === 'shurui' && nextState.target_department.includes('脑')) score = 96;
            if (robot.id === 'davinci-xi' && nextState.target_department.includes('肝')) score = 98;
            return { ...robot, compatibility_score: score };
          }).sort((a,b) => b.compatibility_score - a.compatibility_score);
        }
        setMatchedRobots(updated);
      }
      
      setTimeout(async () => {
        setPipelineStep(3); // Stage 3: Completed & output docs
        setCurrentTab('docs');
        
        if (isOnlineMode && backendAvailable) {
          try {
            const res = await fetch(`${BACKEND_URL}/generate-docs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey || null,
                provider: modelProvider || null,
                state: nextState
              })
            });
            const data = await res.json();
            setClinicalDoc(data.clinical_trial_protocol);
            setBpDoc(data.business_plan);
          } catch (err) {
            console.error("Backend fetch error in generate-docs", err);
          }
        }
        setIsAnalyzing(false);
      }, 2000);
    }, 2000);
  };

  // Submit message to Chat Agent
  const handleSendMessage = async (textToSend: string) => {
    const userMsg = textToSend.trim();
    if (!userMsg) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Intercept model queries to return accurate info immediately
    const msgLower = userMsg.toLowerCase();
    const isAskingModel = ["模型", "版本", "供应商", "model", "version", "底座", "服务商", "提供商", "厂商"].some(kw => msgLower.includes(kw));
    
    if (isAskingModel) {
      setTimeout(() => {
        let activeModel = "未知模型";
        const providerLower = modelProvider.toLowerCase();
        if (providerLower.includes("openai")) {
          activeModel = "gpt-4o-mini";
        } else if (providerLower.includes("deepseek")) {
          activeModel = "deepseek-chat (DeepSeek-V3/R1)";
        } else if (providerLower.includes("openrouter")) {
          activeModel = "google/gemini-2.5-flash";
        } else if (providerLower.includes("gemini")) {
          activeModel = "gemini-1.5-flash";
        } else if (providerLower.includes("pangu") || providerLower.includes("huawei")) {
          activeModel = "Huawei Pangu (底座适配为 deepseek-chat)";
        }
        
        const hasKey = apiKey ? "已配置" : "未配置";
        const keyPreview = apiKey ? ` (密钥预览: ${apiKey.substring(0, 8)}...)` : "";
        
        const reply = `我是“医算子”——“云脉”智慧医疗多智能体系统的交互顾问。

根据系统当前的前端配置与底座对接状态，大模型供应商及底座模型具体信息如下：
- **当前选择的模型供应商**: \`${modelProvider}\`
- **当前匹配的底座模型版本**: \`${activeModel}\`
- **API Key 状态**: \`${hasKey}\`${keyPreview}

在当前模式下，我将通过此底座模型与云端的“技术理解”、“场景匹配”、“执行输出”智能体进行联动，为您解析文献指标参数、匹配临床场景设备，并自动输出标准化临床方案与商业融资计划书。如有任何参数或合规调整需求，请直接向我下达指令。`;
        
        setChatMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
      }, 300);
      return;
    }

    if (isOnlineMode && backendAvailable) {
      try {
        const res = await fetch(`${BACKEND_URL}/chat-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMsg,
            api_key: apiKey || null,
            provider: modelProvider || null,
            system_prompt: systemPrompt,
            clinical_doc: clinicalDoc,
            bp_doc: bpDoc,
            history: chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
          })
        });
        const data = await res.json();
        
        setChatMessages(prev => [...prev, { sender: 'assistant', text: data.reply }]);
        if (data.state_updated) {
          setState(data.current_state);
          setRagReferences(FRONTEND_KNOWLEDGE_BASE[data.current_state.domain || 'devices']);
          // Trigger re-match based on updated parameters
          const matchRes = await fetch(`${BACKEND_URL}/match-scenarios?domain=${data.current_state.domain}&wavelength=${data.current_state.excitation_wavelength}&department=${data.current_state.target_department}`);
          const matchData = await matchRes.json();
          setMatchedRobots(matchData.matches);
        }
      } catch (err) {
        console.error("Backend fetch error in chat-agent", err);
      }
    } else {
      // Local Client-side mock chat processing
      setTimeout(() => {
        let reply = "";
        let newState = { ...state };
        const msg = userMsg.toLowerCase();
        let updated = false;

        // Department
        if (msg.includes("科室") || msg.includes("部门") || msg.includes("修改科室")) {
          if (msg.includes("脑") || msg.includes("神经")) {
            newState.target_department = "脑外科/神经外科";
            reply = "已为您将转化医学目标临床科室修改为 **脑外科/神经外科**。该科室在神经影像自动分析、脑胶质瘤荧光切除术中有着极其重要的临床及装机需求。";
            updated = true;
          } else if (msg.includes("泌尿")) {
            newState.target_department = "泌尿外科";
            reply = "已为您将临床科室修改为 **泌尿外科**。前列腺切除或肾肿瘤剥除微创手术中对系统适配度要求极高，已同步更新场景匹配。";
            updated = true;
          } else if (msg.includes("肝")) {
            newState.target_department = "肝胆外科";
            reply = "已为您将临床科室修改为 **肝胆外科**。原发性肝脏切除术中，无论是荧光分子探针还是三维重建都是极为成熟的应用。";
            updated = true;
          } else if (msg.includes("放射")) {
            newState.target_department = "放射科";
            reply = "已为您将目标诊断科室变更为 **放射科**。放射科是影像智能诊断 SaMD 模型落地及前瞻性效能验证的核心科室。";
            updated = true;
          } else if (msg.includes("内科") || msg.includes("肿瘤内")) {
            newState.target_department = "肿瘤内科";
            reply = "已为您将临床就诊科室变更为 **肿瘤内科**。肿瘤内科是各类靶向药及生物制剂一期爬坡试验及受试者筛选的重要科室。";
            updated = true;
          } else if (msg.includes("普通外科") || msg.includes("普外")) {
            newState.target_department = "普通外科";
            reply = "已为您将临床就诊科室变更为 **普通外科**。普通外科涵盖广泛的微创及消化道重建术式，适合改良新术式的带教推广。";
            updated = true;
          }
        }

        // Financing
        if (msg.includes("融资") || msg.includes("额度") || msg.includes("金额") || msg.includes("万") || msg.includes("亿")) {
          const numbers = msg.match(/\d+/);
          if (numbers) {
            const val = parseFloat(numbers[0]);
            let actualVal = val;
            if (msg.includes("万")) {
              actualVal = val / 100.0;
            } else if (msg.includes("亿")) {
              actualVal = val * 10.0;
            } else {
              actualVal = val > 1.0 ? val : val * 100.0;
            }
            newState.financing_amount = actualVal;
            reply += `\n\n已将本次融资规划额度调整为 **${(actualVal * 100).toFixed(0)} 万元人民币**。已重新分配资金划拨比例，并自动重写了相应领域的《商业计划书》。`;
            updated = true;
          }
        }

        // Sites
        if (msg.includes("医院") || msg.includes("基地") || msg.includes("中心") || msg.includes("修改地点")) {
          if (msg.includes("华北") || msg.includes("北京") || msg.includes("协和")) {
            newState.clinical_trial_site = "北京协和医院(GCP基地)";
            reply += "\n\n临床试验基地已变更为 **北京协和医院(GCP基地)**。";
            updated = true;
          } else if (msg.includes("华东") || msg.includes("上海") || msg.includes("中山医院")) {
            newState.clinical_trial_site = "华东地区三甲医院(上海中山医院等)";
            reply += "\n\n临床试验基地已变更为 **华东地区三甲医院(上海中山医院等)**。";
            updated = true;
          } else if (msg.includes("华南") || msg.includes("广州") || msg.includes("中山大学")) {
            newState.clinical_trial_site = "华南地区三甲医院(中山大学附属医院等)";
            reply += "\n\n临床试验基地已变更为 **华南地区三甲医院(中山大学附属医院等)**。";
            updated = true;
          }
        }

        // Domain specific parameter adjustments
        if (newState.domain === 'drugs') {
          if (msg.includes("靶点") || msg.includes("target")) {
            for (const t of ["EGFR", "KRAS-G12C", "PD-L1", "HER2", "ALK"]) {
              if (msg.includes(t.toLowerCase())) {
                newState.target = t;
                reply += `\n\n已将创新药靶点变更为 **${t}**。已同步更新结合机制与融资书内容。`;
                updated = true;
                break;
              }
            }
          }
          if (msg.includes("适应症") || msg.includes("疾病") || msg.includes("癌")) {
            for (const ind of ["非小细胞肺癌", "胃癌", "结直肠癌", "乳腺癌", "胰腺癌", "肺腺癌"]) {
              if (msg.includes(ind)) {
                newState.indication = ind;
                reply += `\n\n已将目标适应症变更为 **${ind}**。`;
                updated = true;
                break;
              }
            }
          }
          if (msg.includes("半衰期") || msg.includes("消除")) {
            const numbers = msg.match(/\d+(?:\.\d+)?/);
            if (numbers) {
              newState.drug_half_life = parseFloat(numbers[0]);
              reply += `\n\n已将新药血浆消除半衰期设定为 **${newState.drug_half_life} 小时**。`;
              updated = true;
            }
          }
          if (msg.includes("限制毒性") || msg.includes("dlt")) {
            const numbers = msg.match(/\d+(?:\.\d+)?/);
            if (numbers) {
              newState.dlt_dose = parseFloat(numbers[0]);
              reply += `\n\n已将新药限制毒性剂量 (DLT) 调整为 **${newState.dlt_dose} mg/m²**。`;
              updated = true;
            }
          }
          if (msg.includes("终点") || msg.includes("疗效")) {
            for (const ep of ["PFS (无进展生存期)", "ORR (客观缓解率)", "OS (总生存期)"]) {
              if (msg.includes(ep.split(" ")[0].toLowerCase())) {
                newState.primary_endpoint = ep;
                reply += `\n\n已将主要疗效终点变更为 **${ep}**。`;
                updated = true;
                break;
              }
            }
          }
        } else if (newState.domain === 'ai') {
          if (msg.includes("准确") || msg.includes("精度") || msg.includes("auc") || msg.includes("accuracy")) {
            const numbers = msg.match(/\d+(?:\.\d+)?/);
            if (numbers) {
              const val = parseFloat(numbers[0]);
              newState.accuracy = val > 1.0 ? val : val * 100.0;
              reply += `\n\n已将 SaMD 算法目标诊断精度 (AUC/准确率) 调整为 **${newState.accuracy}%**。ROC 效能曲线已刷新。`;
              updated = true;
            }
          }
          if (msg.includes("延迟") || msg.includes("时延") || msg.includes("ms") || msg.includes("latency")) {
            const numbers = msg.match(/\d+(?:\.\d+)?/);
            if (numbers) {
              newState.latency = parseFloat(numbers[0]);
              reply += `\n\n已将算法单帧推理时延设定为 **${newState.latency} ms**。`;
              updated = true;
            }
          }
          if (msg.includes("架构") || msg.includes("网络") || msg.includes("模型")) {
            for (const arch of ["3D-Unet", "3D-Unet+", "Med-Transformer", "Swin-UNETR"]) {
              if (msg.includes(arch.toLowerCase())) {
                newState.architecture = arch;
                reply += `\n\n已将算法神经网络架构变更为 **${arch}**。`;
                updated = true;
                break;
              }
            }
          }
          if (msg.includes("模态") || msg.includes("影像") || msg.includes("图像")) {
            for (const mod of ["MRI-T2WI", "CT-Chest", "MRI-T1ce", "PET-CT"]) {
              if (msg.includes(mod.toLowerCase())) {
                newState.modality = mod;
                reply += `\n\n已将目标影像模态变更为 **${mod}**。`;
                updated = true;
                break;
              }
            }
          }
        } else if (newState.domain === 'surgical') {
          if (msg.includes("学习曲线") || msg.includes("例数") || msg.includes("例")) {
            const numbers = msg.match(/\d+/);
            if (numbers) {
              newState.learning_curve_cases = parseInt(numbers[0]);
              reply += `\n\n已将青年医师标准化带教学习曲线设定为 **${newState.learning_curve_cases} 例**。`;
              updated = true;
            }
          }
          if (msg.includes("部位") || msg.includes("解剖") || msg.includes("手术部位")) {
            for (const site of ["胰腺十二指肠区", "肝脏切除区", "胃肠吻合区", "肺段切除区"]) {
              if (msg.includes(site)) {
                newState.anatomical_site = site;
                reply += `\n\n已将改良术式手术目标解剖部位变更为 **${site}**。`;
                updated = true;
                break;
              }
            }
          }
          if (msg.includes("器械") || msg.includes("手术器械")) {
            for (const inst of ["腹腔镜能量切割闭合器", "超声能量手术刀", "吻合器", "双极电凝镊"]) {
              if (msg.includes(inst)) {
                newState.core_instruments = inst;
                reply += `\n\n已将核心手术器械配置变更为 **${inst}**。`;
                updated = true;
                break;
              }
            }
          }
          if (msg.includes("安全终点") || msg.includes("并发症")) {
            for (const ep of ["30天术后并发症率", "90天吻合口瘘率", "术后胆瘘/胰瘘发生率"]) {
              if (msg.includes(ep)) {
                newState.safety_endpoint = ep;
                reply += `\n\n已将临床准入追踪的安全终点指标设定为 **${ep}**。`;
                updated = true;
                break;
              }
            }
          }
        } else {
          // devices
          if (msg.includes("激发波长") || msg.includes("波长") || msg.includes("nm")) {
            const numbers = msg.match(/\d+/);
            if (numbers) {
              const val = parseInt(numbers[0]);
              if (val >= 700 && val <= 900) {
                newState.excitation_wavelength = val;
                newState.emission_wavelength = val + 30;
                reply += `\n\n已将荧光激发波长设定为 **${newState.excitation_wavelength} nm**，发射波长自动更新为 **${newState.emission_wavelength} nm**。`;
                updated = true;
              }
            }
          }
        }

        if (!reply) {
          reply = "您好！我是“云脉”智慧医疗系统的多智能体协同助手——“医算子”。我可以协助您微调商业和医学目标参数。\n\n目前支持以下调参指令：\n- 📂 **修改科室**（如‘改为肿瘤内科’）\n- 💰 **修改融资金额**（如‘融资额度修改为 3000 万’）\n- 🏥 **修改试验基地**（如‘基地改为上海中山医院’）\n- 🔬 **修改领域特定参数**（如‘药物半衰期改为 15小时’，‘准确率提升至 95%’，‘学习曲线改为 15例’等）";
        }

        setChatMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
        if (updated) {
          setState(newState);
          setRagReferences(FRONTEND_KNOWLEDGE_BASE[newState.domain || 'devices']);
          
          let updatedRobots = [];
          if (newState.domain === 'drugs') {
            updatedRobots = [
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
          } else if (newState.domain === 'ai') {
            updatedRobots = [
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
                description: "集成度极高的智慧医疗图像中间件平台，拥有完备 of 临床沙箱安全隔离和PACS多层级通信协议适配。"
              }
            ];
          } else if (newState.domain === 'surgical') {
            updatedRobots = [
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
          } else {
            updatedRobots = DEFAULT_ROBOTS.map(robot => {
              let score = 90;
              if (robot.id === 'shurui' && newState.target_department.includes('脑')) score = 96;
              if (robot.id === 'davinci-xi' && newState.target_department.includes('肝')) score = 98;
              return { ...robot, compatibility_score: score };
            }).sort((a,b) => b.compatibility_score - a.compatibility_score);
          }
          setMatchedRobots(updatedRobots);
        }
      }, 800);
    }
  };

  // ECharts: PK Dynamics Line Chart Option (Memoized)
  const pkChartOption = React.useMemo(() => {
    const domain = state.domain || 'devices';
    
    if (domain === 'ai') {
      const data = [];
      const accuracyVal = state.accuracy || 92.4;
      const a = accuracyVal / 100;
      const p = 1.0 - a; // e.g. 0.076
      for (let x = 0; x <= 1.01; x += 0.05) {
        const y = Math.pow(x, p);
        data.push([parseFloat(x.toFixed(2)), parseFloat(y.toFixed(3))]);
      }
      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          formatter: '误诊率 (FPR): {b}<br/>真阳性率 (TPR): {c}',
          backgroundColor: '#ffffff',
          borderColor: 'rgba(14, 165, 233, 0.2)',
          textStyle: { color: '#313a46' }
        },
        grid: { left: '10%', right: '5%', bottom: '15%', top: '15%' },
        xAxis: {
          type: 'value',
          name: 'FPR (1-特异度)',
          nameTextStyle: { color: '#5e6b7e' },
          splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#5e6b7e' },
          min: 0, max: 1
        },
        yAxis: {
          type: 'value',
          name: 'TPR (敏感度)',
          nameTextStyle: { color: '#5e6b7e' },
          splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#5e6b7e' },
          min: 0, max: 1
        },
        series: [{
          data: data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: '#0ea5e9',
            width: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(14, 165, 233, 0.3)'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(14, 165, 233, 0.15)' },
                { offset: 1, color: 'rgba(14, 165, 233, 0.0)' }
              ]
            }
          }
        }]
      };
    } else if (domain === 'surgical') {
      const data = [];
      const t_plateau = 90;
      const t_start = 220;
      const target_cases = state.learning_curve_cases || 25;
      const b = 3.0 / target_cases;
      for (let n = 1; n <= 50; n++) {
        const time = t_plateau + (t_start - t_plateau) * Math.exp(-b * (n - 1));
        data.push([n, Math.round(time)]);
      }
      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          formatter: '手术执行: 第 {b} 例<br/>平均用时: {c} 分钟',
          backgroundColor: '#ffffff',
          borderColor: 'rgba(14, 165, 233, 0.2)',
          textStyle: { color: '#313a46' }
        },
        grid: { left: '10%', right: '5%', bottom: '15%', top: '15%' },
        xAxis: {
          type: 'value',
          name: '累积手术例数 (例)',
          nameTextStyle: { color: '#5e6b7e' },
          splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#5e6b7e' },
          min: 1, max: 50
        },
        yAxis: {
          type: 'value',
          name: '手术时间 (min)',
          nameTextStyle: { color: '#5e6b7e' },
          splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#5e6b7e' },
          min: 80, max: 230
        },
        series: [{
          data: data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: '#f59e0b',
            width: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(245, 158, 11, 0.3)'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.15)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.0)' }
              ]
            }
          }
        }]
      };
    } else {
      // devices or drugs
      const data = [];
      const t_half = domain === 'drugs' ? (state.drug_half_life || 12.0) : (state.half_life || 2.4);
      const c0 = 100;
      const k = Math.log(2) / t_half;
      const max_t = domain === 'drugs' ? 96 : 24;
      const interval = domain === 'drugs' ? 2 : 0.5;
      
      for (let t = 0; t <= max_t; t += interval) {
        const conc = c0 * Math.exp(-k * t);
        data.push([t, parseFloat(conc.toFixed(2))]);
      }

      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          formatter: '时间: {b}h<br/>体内浓度: {c}%',
          backgroundColor: '#ffffff',
          borderColor: 'rgba(14, 165, 233, 0.2)',
          textStyle: { color: '#313a46' }
        },
        grid: { left: '8%', right: '5%', bottom: '15%', top: '15%' },
        xAxis: {
          type: 'value',
          name: '时间 (h)',
          nameTextStyle: { color: '#5e6b7e' },
          splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#5e6b7e' }
        },
        yAxis: {
          type: 'value',
          name: '体内浓度 (%)',
          nameTextStyle: { color: '#5e6b7e' },
          splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#5e6b7e' }
        },
        series: [{
          data: data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: '#10b981',
            width: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(16, 185, 129, 0.3)'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.15)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
              ]
            }
          }
        }]
      };
    }
  }, [state]);

  // ECharts: Robot Match Radar Chart Option (Memoized)
  const radarOption = React.useMemo(() => {
    const domain = state.domain || 'devices';
    let indicators = [
      { name: '光谱激发兼容性', max: 100 },
      { name: '科室适用契合度', max: 100 },
      { name: '医院装机量占比', max: 100 },
      { name: '接口系统开放度', max: 100 },
      { name: '首期临床便利度', max: 100 }
    ];
    let seriesName = '兼容设备适配比对';

    if (domain === 'drugs') {
      indicators = [
        { name: '靶向结合亲和力', max: 100 },
        { name: '科室患者流量度', max: 100 },
        { name: 'GCP临床中心资质', max: 100 },
        { name: 'CDMO中试配套度', max: 100 },
        { name: '伦理审查便利度', max: 100 }
      ];
      seriesName = '临床基地与CDMO筛选比对';
    } else if (domain === 'ai') {
      indicators = [
        { name: '算法推理延迟度', max: 100 },
        { name: 'PACS影像适配度', max: 100 },
        { name: '计算集群芯片兼容性', max: 100 },
        { name: '数据安全沙箱合规度', max: 100 },
        { name: '阅片工作流便利度', max: 100 }
      ];
      seriesName = '医疗PACS与推理服务器集群适配比对';
    } else if (domain === 'surgical') {
      indicators = [
        { name: '改良缝合降低吻合口漏率', max: 100 },
        { name: '带教实训效率', max: 100 },
        { name: '核心手术器械兼容性', max: 100 },
        { name: '术中质控稳定性', max: 100 },
        { name: '青年医师学习推广便利度', max: 100 }
      ];
      seriesName = '微创实训基地与手术室配套比对';
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(14, 165, 233, 0.2)',
        textStyle: { color: '#313a46' }
      },
      legend: {
        data: matchedRobots.map(r => r.name),
        textStyle: { color: '#5e6b7e', fontSize: 10 },
        bottom: 0
      },
      radar: {
        indicator: indicators,
        shape: 'circle',
        splitNumber: 4,
        axisName: { color: '#5e6b7e', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.05)' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.05)' } }
      },
      series: [{
        name: seriesName,
        type: 'radar',
        data: matchedRobots.map((robot, index) => {
          const valFactor = 1 - (index * 0.08);
          const isDeptFitted = robot.compatibility_score > 90;
          return {
            value: [
              robot.compatibility_score,
              isDeptFitted ? 95 : 60,
              Math.min(100, Math.round(robot.national_installs / 4.5)),
              Math.round(85 * valFactor),
              Math.round(90 * valFactor)
            ],
            name: robot.name,
            symbol: 'none',
            lineStyle: { width: 2 },
            areaStyle: { color: 'rgba(0, 0, 0, 0.01)' }
          };
        }),
        color: ['#0ea5e9', '#10b981', '#f43f5e']
      }]
    };
  }, [matchedRobots, state.domain]);

  const handleDownload = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderRAGBadge = () => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-green)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></span>
        <span>已连接知识库 (RAG-Enabled)</span>
      </div>
    );
  };

  const renderRAGReferences = () => {
    if (!ragReferences || ragReferences.length === 0) return null;
    return (
      <div className="rag-reference-box" style={{ marginTop: '20px', gridColumn: 'span 2', width: '100%' }}>
        <div className="rag-reference-header">
          <div className="rag-reference-badge">
            <span className="rag-badge-dot"></span>
            <span>RAG 知识库比对核验凭据</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>检索到 {ragReferences.length} 项法规与学术基准参考</span>
        </div>
        <div className="rag-reference-list">
          {ragReferences.map((ref, idx) => (
            <div key={idx} className="rag-ref-item">
              <div className="rag-ref-source">📄 数据依据来源：{ref.source}</div>
              <div className="rag-ref-title">参考条目：{ref.title}</div>
              <div className="rag-ref-content">{ref.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTabPlaceholder = (title: string, desc: string) => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '320px',
        color: 'var(--text-secondary)',
        background: 'rgba(255, 255, 255, 0.3)',
        border: '1px dashed rgba(14, 165, 233, 0.2)',
        borderRadius: '20px',
        padding: '30px',
        textAlign: 'center',
        width: '100%'
      }}>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ marginBottom: '16px' }}
        >
          <Sparkles size={40} style={{ color: 'var(--accent-cyan)', opacity: 0.8 }} />
        </motion.div>
        <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>{title}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6 }}>{desc}</p>
      </div>
    );
  };

  return (
    <div className="app-container">
      
      {/* 1. LEFT PANEL (Paper input selection) */}
      <div className="left-panel">
        <div className="panel-header">
          <Activity size={24} className="medical-icon-cyan" />
          <h2>“云脉” 智慧医疗多智能体系统</h2>
        </div>

        <div className="settings-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="section-title" style={{ margin: 0 }}>设置项</span>
          <button 
            onClick={() => setIsOnlineMode(prev => !prev)}
            className="mode-toggle-btn"
            title="手动切换运行模式"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              backgroundColor: isOnlineMode ? 'rgba(14, 165, 233, 0.1)' : 'rgba(163, 177, 198, 0.15)',
              color: isOnlineMode ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: `1px solid ${isOnlineMode ? 'rgba(14, 165, 233, 0.3)' : 'rgba(163, 177, 198, 0.25)'}`
            }}
          >
            <Settings size={10} />
            <span>切换模式</span>
          </button>
        </div>

        {/* Mode Status Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>当前状态:</span>
          <span 
            className="api-key-indicator"
            style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              color: isOnlineMode ? (apiKey ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-secondary)',
              backgroundColor: isOnlineMode ? (apiKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)') : 'rgba(163, 177, 198, 0.1)',
              padding: '3px 10px',
              borderRadius: '20px',
              border: `1px solid ${isOnlineMode ? (apiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)') : 'rgba(163, 177, 198, 0.15)'}`
            }}
          >
            {isOnlineMode ? (apiKey ? `大模型联调模式 (${detectProvider(apiKey)})` : 'API未输入') : 'Demo 模式 (Mock)'}
          </span>
        </div>

        {/* Api key input simulating actual cloud integration */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input 
            type="password" 
            placeholder={isOnlineMode ? "请输入 API Key" : "请输入 API Key 联调"}
            className="chat-input"
            style={{ fontSize: '11px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.45)', width: '100%' }}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsApiConfigured(e.target.value.length > 0);
            }}
          />
          {/* Model Provider Selection Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>模型提供商 (检测与选择):</span>
            <select
              className="chat-input"
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value)}
              style={{
                fontSize: '11px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.7)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
                width: '100%'
              }}
            >
              <option value="DeepSeek">DeepSeek (推荐)</option>
              <option value="OpenAI">OpenAI</option>
              <option value="Huawei Pangu">华为云盘古 (Huawei Pangu)</option>
              <option value="OpenRouter">OpenRouter</option>
              <option value="Google Gemini">Google Gemini</option>
            </select>
          </div>
          {apiKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 600, paddingLeft: '4px', marginTop: '2px' }}>
              <Sparkles size={10} />
              <span>当前检测提供商: {detectProvider(apiKey)}</span>
            </div>
          )}
          {isOnlineMode && !apiKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-red)', fontWeight: 600, paddingLeft: '4px' }}>
              <AlertCircle size={10} />
              <span>注意: 在大模型模式下必须配置 API Key 才能调用真实的后端接口</span>
            </div>
          )}
          {isOnlineMode && apiKey && !backendAvailable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-yellow)', fontWeight: 600, paddingLeft: '4px' }}>
              <AlertCircle size={10} />
              <span>后端服务未运行，将自动降级为 Mock 交互</span>
            </div>
          )}
        </div>

        <span className="section-title" style={{ textAlign: 'left', display: 'block' }}>选择预置学术论文</span>
        {PRESET_PAPERS.map(paper => (
          <div 
            key={paper.id}
            className={`paper-card ${selectedPaperId === paper.id ? 'active' : ''}`}
            onClick={() => handleSelectPaper(paper.id, paper.params)}
          >
            <h3>{paper.title}</h3>
            <div className="paper-meta">
              <span>发表年份: {paper.year}</span>
              <span style={{ 
                color: paper.domain === 'devices' ? 'var(--accent-cyan)' : 
                       paper.domain === 'drugs' ? 'var(--accent-green)' : 
                       paper.domain === 'ai' ? 'var(--accent-cyan)' : 'var(--accent-yellow)' 
              }}>
                {paper.recommend}
              </span>
            </div>
          </div>
        ))}

        {/* Custom Papers List */}
        {customPapers.length > 0 && (
          <>
            <span className="section-title" style={{ textAlign: 'left', display: 'block', marginTop: '16px' }}>已上传自定义论文</span>
            {customPapers.map(paper => (
              <div 
                key={paper.id}
                className={`paper-card ${selectedPaperId === paper.id ? 'active' : ''}`}
                onClick={() => handleSelectPaper(paper.id, paper.params)}
                style={{ position: 'relative' }}
              >
                <h3 style={{ paddingRight: '24px' }}>{paper.title}</h3>
                <div className="paper-meta">
                  <span style={{ color: 'var(--accent-cyan)' }}>
                    领域: {paper.params.domain === 'drugs' ? '生物医药' : 
                           paper.params.domain === 'ai' ? '医疗 AI' : 
                           paper.params.domain === 'surgical' ? '临床术式' : '器械与成像'}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeletePaper(e, paper.id)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="删除此论文"
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}

        <div 
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-color)',
            backgroundColor: isDragging ? 'rgba(14, 165, 233, 0.08)' : 'rgba(255, 255, 255, 0.4)',
            boxShadow: isDragging ? '0 0 15px rgba(14, 165, 233, 0.2)' : 'none',
            marginTop: '16px'
          }}
        >
          <Upload size={24} style={{ color: isDragging ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
          <span style={{ color: isDragging ? 'var(--accent-cyan)' : 'inherit', fontWeight: isDragging ? 600 : 'normal' }}>
            {isDragging ? '松开鼠标以上传论文' : '上传自定义论文 (PDF/MD/TXT)'}
          </span>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.md,.txt"
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="run-btn" 
            disabled={!paperSelected || isAnalyzing}
            onClick={startTranslation}
            style={{ flex: 1.5, cursor: (!paperSelected || isAnalyzing) ? 'not-allowed' : 'pointer', opacity: (!paperSelected || isAnalyzing) ? 0.6 : 1 }}
          >
            {isAnalyzing ? (
              <>
                <Sparkles size={16} className="glow-cyan" />
                <span>智能体转化中...</span>
              </>
            ) : (
              <>
                <Brain size={16} />
                <span>启动 Agent 转化</span>
              </>
            )}
          </button>
          <button 
            className="clear-btn" 
            disabled={isAnalyzing || pipelineStep === 0}
            onClick={handleClearResults}
            style={{
              flex: 1,
              padding: '12px 10px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-red)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: (isAnalyzing || pipelineStep === 0) ? 'not-allowed' : 'pointer',
              opacity: (isAnalyzing || pipelineStep === 0) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>清空结果</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER PANEL (Workflow & Data Viz) */}
      <div className="center-panel">
        
        {/* Agent Workflow Steps */}
        <div className="agent-pipeline">
          <div className={`agent-card ${pipelineStep === 1 ? 'active' : pipelineStep > 1 ? 'completed' : ''}`}>
            <div className="agent-avatar">
              <Brain size={18} />
            </div>
            <div className="agent-info" style={{ textAlign: 'left' }}>
              <h4>技术理解 Agent</h4>
              <p>{pipelineStep > 1 ? '提取关键参数成功' : pipelineStep === 1 ? '阅读解析论文中...' : '准备就绪'}</p>
            </div>
            <span className="agent-status">
              {pipelineStep > 1 ? (
                <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
              ) : pipelineStep === 1 ? (
                <span className="glow-cyan" style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>RUNNING</span>
              ) : 'IDLE'}
            </span>
          </div>

          <div className={`agent-card ${pipelineStep === 2 ? 'active' : pipelineStep > 2 ? 'completed' : ''}`}>
            <div className="agent-avatar">
              <Cpu size={18} />
            </div>
            <div className="agent-info" style={{ textAlign: 'left' }}>
              <h4>场景匹配 Agent</h4>
              <p>{pipelineStep > 2 ? '完成基地与接口匹配' : pipelineStep === 2 ? '匹配各大中心中...' : '准备就绪'}</p>
            </div>
            <span className="agent-status">
              {pipelineStep > 2 ? (
                <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
              ) : pipelineStep === 2 ? (
                <span className="glow-cyan" style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>MATCHING</span>
              ) : 'IDLE'}
            </span>
          </div>

          <div className={`agent-card ${pipelineStep === 3 ? 'completed' : ''}`}>
            <div className="agent-avatar">
              <FileText size={18} />
            </div>
            <div className="agent-info" style={{ textAlign: 'left' }}>
              <h4>执行输出 Agent</h4>
              <p>{pipelineStep === 3 ? '已生成标准化方案' : '准备就绪'}</p>
            </div>
            <span className="agent-status">
              {pipelineStep === 3 ? (
                <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
              ) : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Dynamic Panels */}
        <div className="viz-panel">
          <div className="tab-nav">
            <button className={`tab-btn ${currentTab === 'params' ? 'active' : ''}`} onClick={() => setCurrentTab('params')}>
              <Activity size={14} />
              <span>提取指标参数</span>
            </button>
            <button className={`tab-btn ${currentTab === 'matching' ? 'active' : ''}`} onClick={() => setCurrentTab('matching')}>
              <Compass size={14} />
              <span>成果落地匹配</span>
            </button>
            <button className={`tab-btn ${currentTab === 'docs' ? 'active' : ''}`} onClick={() => setCurrentTab('docs')}>
              <FileText size={14} />
              <span>生成商业/临床文档</span>
            </button>
          </div>

          <div className="tab-content">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: Extracted parameters and concentration curve */}
              {currentTab === 'params' && (
                pipelineStep === 0 ? (
                  renderTabPlaceholder("等待指标参数提取", "请点击左侧的【启动 Agent 转化】按钮。技术理解 Agent 将深度阅读论文，并自动检索知识库法规完成参数的高精度校准提取。")
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', height: '100%' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', textAlign: 'left' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>
                            {state.domain === 'ai' ? '智能诊断分类效能 (SaMD ROC 曲线)' : 
                             state.domain === 'surgical' ? '手术用时学习曲线 (Learning Curve)' : 
                             '体内药代动力学 (PK) 代谢曲线'}
                          </h3>
                          {renderRAGBadge()}
                        </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {state.domain === 'drugs' ? `技术理解 Agent 识别到该新药的血浆消除半衰期为 ${state.drug_half_life || 12.0} 小时，主要疗效终点为 ${state.primary_endpoint || 'ORR'}，符合新药一期安全性及有效性设计指标。` :
                         state.domain === 'ai' ? `技术理解 Agent 识别到该 SaMD 算法架构为 ${state.architecture || '3D-Unet'}，影像模态为 ${state.modality || 'MRI-T2WI'}，模型诊断精度 (AUC) 达 ${state.accuracy || 92.4}%，单帧推理延迟为 ${state.latency || 18.5} ms。` :
                         state.domain === 'surgical' ? `技术理解 Agent 识别到该改良术式解剖部位为 ${state.anatomical_site || '胰腺十二指肠区'}，核心器械配置为 ${state.core_instruments || '腹腔镜能量切割闭合器'}，预计青年医师带教学习曲线为 ${state.learning_curve_cases || 25} 例。` :
                         `技术理解 Agent 识别到该近红外探针的激发波长为 ${state.excitation_wavelength || 790.0} nm，排泄半衰期为 ${state.half_life || 2.4} 小时，完全排出周期为 ${state.metabolic_cycle || 24.0} 小时，符合一期临床快速排泄安全指标。`}
                      </p>
                    </div>
                    <div style={{ flex: 1, minHeight: '220px', marginTop: '10px' }}>
                      <CustomEChart option={pkChartOption} style={{ height: '100%', width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'left', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                    <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                      {state.domain === 'ai' ? '结构化算法参数' : 
                       state.domain === 'surgical' ? '结构化手术参数' : 
                       state.domain === 'drugs' ? '结构化药理参数' : 
                       '结构化物理化学参数'}
                    </h3>
                    
                    <div className="extracted-params-grid">
                      {state.domain === 'drugs' && (
                        <>
                          <div className="param-item">
                            <span className="param-label">治疗靶点</span>
                            <span className="param-value">{state.target}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">目标适应症</span>
                            <span className="param-value" style={{ fontSize: '13px' }}>{state.indication}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">消除半衰期 (t1/2)</span>
                            <span className="param-value">{state.drug_half_life}<span className="param-unit">h</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">限制毒性剂量 DLT</span>
                            <span className="param-value" style={{ fontSize: '16px' }}>{state.dlt_dose}<span className="param-unit">mg/m²</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">主要有效终点</span>
                            <span className="param-value" style={{ fontSize: '11px', color: 'var(--accent-green)' }}>{state.primary_endpoint}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">首期临床受试者</span>
                            <span className="param-value">{state.sample_size}<span className="param-unit">例</span></span>
                          </div>
                        </>
                      )}

                      {state.domain === 'ai' && (
                        <>
                          <div className="param-item">
                            <span className="param-label">算法神经网络架构</span>
                            <span className="param-value" style={{ fontSize: '14px' }}>{state.architecture}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">医学影像模态</span>
                            <span className="param-value">{state.modality}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">诊断准确度 (AUC)</span>
                            <span className="param-value">{state.accuracy}<span className="param-unit">%</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">边缘推理延迟</span>
                            <span className="param-value">{state.latency}<span className="param-unit">ms</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">网络通信接入标准</span>
                            <span className="param-value" style={{ fontSize: '12px' }}>{state.integration_standard}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">测试回顾病例数</span>
                            <span className="param-value">{state.sample_size * 10}<span className="param-unit">例</span></span>
                          </div>
                        </>
                      )}

                      {state.domain === 'surgical' && (
                        <>
                          <div className="param-item">
                            <span className="param-label">目标解剖部位</span>
                            <span className="param-value" style={{ fontSize: '13px' }}>{state.anatomical_site}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">核心手术器械配置</span>
                            <span className="param-value" style={{ fontSize: '11px' }}>{state.core_instruments}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">带教实训学习曲线</span>
                            <span className="param-value">{state.learning_curve_cases}<span className="param-unit">例</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">临床安全随访终点</span>
                            <span className="param-value" style={{ fontSize: '12px', color: 'var(--accent-red)' }}>{state.safety_endpoint}</span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">带教培训示范周期</span>
                            <span className="param-value">{state.phase_1_duration}<span className="param-unit">个月</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">临床准入病例数</span>
                            <span className="param-value">{state.sample_size}<span className="param-unit">例</span></span>
                          </div>
                        </>
                      )}

                      {(state.domain === 'devices' || !state.domain) && (
                        <>
                          <div className="param-item">
                            <span className="param-label">最佳激发波长</span>
                            <span className="param-value">{state.excitation_wavelength}<span className="param-unit">nm</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">最佳发射波长</span>
                            <span className="param-value">{state.emission_wavelength}<span className="param-unit">nm</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">半衰期 (t1/2)</span>
                            <span className="param-value">{state.half_life}<span className="param-unit">h</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">完全代谢时间</span>
                            <span className="param-value">{state.metabolic_cycle}<span className="param-unit">h</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">半数致死量 LD50</span>
                            <span className="param-value">{state.ld50}<span className="param-unit">mg/kg</span></span>
                          </div>
                          <div className="param-item">
                            <span className="param-label">最大耐受剂量 MTD</span>
                            <span className="param-value">{state.mtd}<span className="param-unit">mg/kg</span></span>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ marginTop: '20px', background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                        <Sparkles size={14} />
                        <span>
                          {state.domain === 'drugs' ? '新药药效与安全性评估' : 
                           state.domain === 'ai' ? 'SaMD 影像算法集成与质控评估' : 
                           state.domain === 'surgical' ? '改良术式安全准入与推广评估' : 
                           'AI4S 探针安全性评估'}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {state.domain === 'drugs' ? `相比传统非特异性疗法，该靶向药物对 ${state.target} 具备极高的特异性结合能力。一期临床拟招募 ${state.sample_size} 例受试者，有利于快速评估以 ${state.primary_endpoint} 为核心的主要疗效指标。` :
                         state.domain === 'ai' ? `该 SaMD 模型在边缘推理计算集群运行的延迟仅为 ${state.latency} ms，符合 PACS 系统 ${state.integration_standard} 实时交互要求。通过在 ${state.clinical_trial_site} 影像中心的回顾性测试，能快速确立临床效能金标准。` :
                         state.domain === 'surgical' ? `采用 ${state.core_instruments} 进行镜下精细操作与规范缝合重建，能显著改善 ${state.safety_endpoint}。设定 ${state.learning_curve_cases} 例的学习曲线培训目标，非常利于缩短带教门槛以实现术式的快速复制。` :
                         `相比传统无机荧光材料，该探针具备短半衰期及肾清除特征，未发现肝脏、脾脏器官滞留毒性，人体最大耐受量估算可达安全窗口的 ${Math.round(state.ld50 / state.mtd)} 倍，极具临床转化价值。`}
                      </p>
                    </div>
                  </div>
                  {renderRAGReferences()}
                </motion.div>
              )
            )}

              {/* Tab 2: Scenario Matching */}
              {currentTab === 'matching' && (
                pipelineStep < 2 ? (
                  renderTabPlaceholder("等待成果落地匹配", "请点击左侧的【启动 Agent 转化】按钮。场景匹配 Agent 将提取物理及临床指标，智能定位 TOP 3 GCP临床基地、CDMO平台或医疗互操作PACS生态系统。")
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', height: '100%' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>
                          {state.domain === 'drugs' ? '推荐合作临床 GCP 基地与 CDMO 机构 (TOP 3)' :
                           state.domain === 'ai' ? '推荐对接医院 PACS 影像系统与计算集群 (TOP 3)' :
                           state.domain === 'surgical' ? '推荐对接层流手术室与技能实训基地 (TOP 3)' :
                           '推荐适配手术系统与机器人 (TOP 3)'}
                        </h3>
                        {renderRAGBadge()}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                      成果转化 Agent 根据当前参数与目标科室进行了交叉匹配比对。目标科室：<span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{state.target_department}</span>。
                    </p>
                    <div className="matches-list">
                      {matchedRobots.map((robot, index) => (
                        <div key={robot.id} className="match-item-card">
                          <div className="match-item-left">
                            <div className="match-item-name">
                              <span>{robot.name}</span>
                              {index === 0 && <span className="match-score-badge">最佳推荐</span>}
                            </div>
                            <div className="match-item-meta">
                              {state.domain === 'drugs' ? `依托单位: ${robot.manufacturer} | 合作资质: ${robot.channels.join(', ')}` :
                               state.domain === 'ai' ? `技术平台: ${robot.manufacturer} | 对接标准: ${robot.channels.join(', ')}` :
                               state.domain === 'surgical' ? `建设单位: ${robot.manufacturer} | 配置规格: ${robot.channels.join(', ')}` :
                               `厂商: ${robot.manufacturer} | 适配接口: ${robot.channels.join(', ')}`}
                            </div>
                            <div className="match-item-desc">
                              {robot.description}
                            </div>
                          </div>
                          <div className="match-item-right">
                            <span className="match-installs-value">{robot.national_installs}</span>
                            <span className="match-installs-label">
                              {state.domain === 'drugs' ? '合作基地数' :
                               state.domain === 'ai' ? '装机节点数' :
                               state.domain === 'surgical' ? '示范基地数' :
                               '国内装机量'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {state.domain === 'drugs' ? 'GCP/CDMO 场景多维评分' :
                       state.domain === 'ai' ? 'PACS影像与推理集群兼容评分' :
                       state.domain === 'surgical' ? '实训基地标准化配套评分' :
                       '兼容设备多维评分'}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {state.domain === 'drugs' ? '比对新药靶向强度、病患招募速率及中试配套资质。' :
                       state.domain === 'ai' ? '比对影像时延适配、数据传输接口及安全沙箱保护。' :
                       state.domain === 'surgical' ? '比对解剖模拟程度、一体化手术室适配及带教便利性。' :
                       '比对荧光通道、装机覆盖及临床试验便利度。'}
                    </p>
                    <div style={{ flex: 1, minHeight: '220px', marginTop: '10px' }}>
                      <CustomEChart option={radarOption} style={{ height: '100%', width: '100%' }} />
                    </div>
                  </div>
                  {renderRAGReferences()}
                </motion.div>
              )
            )}

              {/* Tab 3: Generated Docs */}
              {currentTab === 'docs' && (
                pipelineStep < 3 ? (
                  renderTabPlaceholder("等待商业/临床文档生成", "请点击左侧的【启动 Agent 转化】按钮。执行输出 Agent 将根据微调校准后的参数，自动撰写合规性《临床研究方案》及《商业融资计划书》。")
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-5px' }}>
                      {renderRAGBadge()}
                    </div>
                    <div className="doc-split">
                      <div className="doc-card">
                        <div className="doc-header">
                          <h3>
                            {state.domain === 'drugs' ? '《临床试验设计方案 (Phase I/II)》' :
                             state.domain === 'ai' ? '《SaMD临床效能验证方案》' :
                             state.domain === 'surgical' ? '《标准化临床路径指南》' :
                             '《临床试验方案草案 (I期)》'}
                          </h3>
                          <button 
                            className="doc-action-btn"
                            onClick={() => handleDownload(
                              state.domain === 'drugs' ? 'Clinical_Trial_Protocol_Drugs.md' :
                              state.domain === 'ai' ? 'SaMD_Clinical_Evaluation_Protocol.md' :
                              state.domain === 'surgical' ? 'Surgical_Standardized_Guide.md' :
                              'Clinical_Trial_Protocol_Phase_I.md', 
                              clinicalDoc
                            )}
                          >
                            <Download size={12} />
                            导出方案
                          </button>
                        </div>
                        <div className="doc-body">
                          {clinicalDoc.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h1 key={i}>{line.replace('# ', '')}</h1>;
                            if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>;
                            if (line.startsWith('*   ') || line.startsWith('1.  ') || line.startsWith('2.  ') || line.startsWith('3.  ') || line.startsWith('4.  ')) {
                              return <div key={i} style={{ paddingLeft: '15px', margin: '4px 0' }}>{line}</div>;
                            }
                            return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
                          })}
                        </div>
                      </div>

                      <div className="doc-card">
                        <div className="doc-header">
                          <h3>
                            {state.domain === 'drugs' ? '《新药管线商业策划书》' :
                             state.domain === 'ai' ? '《智能影像诊断软件商业化白皮书》' :
                             state.domain === 'surgical' ? '《科室新术式推广推介书》' :
                             '《创新探针商业融资计划书》'}
                          </h3>
                          <button 
                            className="doc-action-btn"
                            onClick={() => handleDownload(
                              state.domain === 'drugs' ? 'Targeted_Drug_Business_Plan.md' :
                              state.domain === 'ai' ? 'SaMD_AI_Business_Whitepaper.md' :
                              state.domain === 'surgical' ? 'Surgical_Technique_Business_Plan.md' :
                              'Innovative_Probe_Business_Plan.md', 
                              bpDoc
                            )}
                          >
                            <Download size={12} />
                            导出 BP
                          </button>
                        </div>
                        <div className="doc-body">
                          {bpDoc.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h1 key={i}>{line.replace('# ', '')}</h1>;
                            if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>;
                            if (line.startsWith('*   ') || line.startsWith('1.  ') || line.startsWith('2.  ') || line.startsWith('3.  ') || line.startsWith('4.  ')) {
                              return <div key={i} style={{ paddingLeft: '15px', margin: '4px 0' }}>{line}</div>;
                            }
                            return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                    {renderRAGReferences()}
                  </motion.div>
                )
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* 3. RIGHT PANEL (QA / advisor console) */}
      <div className="right-panel">
        <div className="chat-header" style={{ paddingBottom: '12px' }}>
          <div className="chat-avatar">
            <Brain size={20} className="medical-icon-cyan" />
          </div>
          <div className="chat-title" style={{ textAlign: 'left', flex: 1 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>医算子</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>云脉多智能体系统的交互顾问</p>
          </div>
        </div>

        {/* Collapsible System Prompt Widget */}
        <div 
          style={{
            background: 'rgba(14, 165, 233, 0.04)',
            border: '1px solid rgba(14, 165, 233, 0.1)',
            borderRadius: '12px',
            padding: '10px 12px',
            margin: '0 24px 16px 24px',
            textAlign: 'left',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isPromptCollapsed ? '0' : '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
              <Sparkles size={11} />
              <span>医算子专有提示词 (System Prompt)</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setIsPromptCollapsed(!isPromptCollapsed)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(14, 165, 233, 0.08)'
                }}
              >
                {isPromptCollapsed ? '展开' : '收起'}
              </button>
              {!isPromptCollapsed && (
                <button
                  onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(14, 165, 233, 0.08)'
                  }}
                >
                  {isEditingPrompt ? '保存' : '编辑'}
                </button>
              )}
            </div>
          </div>
          
          {!isPromptCollapsed && (
            isEditingPrompt ? (
              <textarea
                className="chat-input"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  fontSize: '10px',
                  lineHeight: 1.4,
                  padding: '6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                  background: 'rgba(255,255,255,0.85)',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            ) : (
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0, whiteSpace: 'pre-wrap' }}>
                {systemPrompt}
              </p>
            )
          )}
        </div>

        <div className="chat-messages">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender}`}>
              {msg.text.split('\n').map((para, i) => (
                <p key={i} style={{ margin: '4px 0' }}>{para}</p>
              ))}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="chat-suggestions">
          {state.domain === 'drugs' ? (
            <>
              <button className="suggestion-chip" onClick={() => handleSendMessage("把靶点改为 EGFR，适应症改为肺腺癌")}>"改为EGFR靶点"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("把融资额度修改为 4500 万")}>"融资调至4500万"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("把主要疗效终点改为 PFS")}>"疗效终点改为PFS"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("基地改为协和医院")}>"基地改为协和医院"</button>
            </>
          ) : state.domain === 'ai' ? (
            <>
              <button className="suggestion-chip" onClick={() => handleSendMessage("把算法准确率提高到 95%")}>"准确率提高至95%"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("推理时延降低为 10 ms")}>"推理延迟降至10ms"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("将网络架构改为 Swin-UNETR")}>"架构改为Swin-UNETR"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("把融资额度修改为 1000 万")}>"融资调至1000万"</button>
            </>
          ) : state.domain === 'surgical' ? (
            <>
              <button className="suggestion-chip" onClick={() => handleSendMessage("学习曲线例数修改为 15例")}>"曲线例数改为15例"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("核心手术器械配置变更为超声能量手术刀")}>"核心器械改为超声刀"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("安全终点改为90天吻合口瘘率")}>"安全终点改为瘘率"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("基地改为协和医院")}>"基地改为协和医院"</button>
            </>
          ) : (
            <>
              <button className="suggestion-chip" onClick={() => handleSendMessage("将目标科室改为脑外科")}>"改为脑外科"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("把融资额度修改为 3000 万")}>"融资调至3000万"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("修改临床基地到北京协和医院")}>"基地改为协和医院"</button>
              <button className="suggestion-chip" onClick={() => handleSendMessage("激发波长改为 800 nm")}>"激发波长改为800nm"</button>
            </>
          )}
        </div>

        {/* Chat input form */}
        <form 
          className="chat-input-wrapper"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(chatInput);
          }}
        >
          <input 
            type="text"
            className="chat-input"
            placeholder="输入调整指令..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="send-btn">
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* HarmonyOS Distributed Collaboration FAB */}
      <button 
        className={`harmony-fab-btn ${isHarmonyDrawerOpen ? 'active' : ''}`}
        onClick={() => setIsHarmonyDrawerOpen(true)}
        title="鸿蒙端云协同控制台"
      >
        <div className="harmony-fab-pulse"></div>
        <Smartphone size={20} />
        <span className="harmony-fab-badge">HarmonyOS</span>
      </button>

      {/* HarmonyOS Drawer Overlay */}
      <AnimatePresence>
        {isHarmonyDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              className="harmony-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHarmonyDrawerOpen(false)}
            />
            {/* Drawer Panel */}
            <motion.div 
              className="harmony-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="harmony-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Share2 size={20} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>鸿蒙端云双向协同</h3>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Distributed StarLink & NPU Sandbox</p>
                  </div>
                </div>
                <button 
                  className="harmony-drawer-close"
                  onClick={() => setIsHarmonyDrawerOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className="harmony-drawer-body">
                {/* 1. NearLink Connection Status */}
                <div className="harmony-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="harmony-card-tag">星闪分布式总线</span>
                    <span className={`harmony-status-dot ${harmonySynced ? 'synced' : 'disconnected'}`}>
                      {harmonySynced ? '已绑定投屏' : 'NearLink 就绪'}
                    </span>
                  </div>
                  
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ArkUI 智能分布式元服务卡片
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    一键将当前提取的论文关键指标及可视化 PK/ROC 曲线，实时推流并渲染至附近 HarmonyOS 设备（平板、智慧屏或 PC 端侧服务中心）。
                  </p>

                  {/* Distributed Card Mockup */}
                  <div className="harmony-widget-preview">
                    <div className="harmony-widget-header">
                      <span className="widget-logo">云脉 🏥 ArkUI</span>
                      <span className="widget-device">MatePad Pro</span>
                    </div>
                    <div className="harmony-widget-body">
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {selectedPaperId.endsWith('-default') ? PRESET_PAPERS.find(p => p.id === selectedPaperId)?.title : customPapers.find(p => p.id === selectedPaperId)?.title || "学术文献"}
                      </div>
                      <div className="widget-grid">
                        <div className="widget-cell">
                          <span className="cell-label">细分领域</span>
                          <span className="cell-val">
                            {state.domain === 'drugs' ? '创新药物' : 
                             state.domain === 'ai' ? '医疗 SaMD' : 
                             state.domain === 'surgical' ? '改良术式' : '荧光探针'}
                          </span>
                        </div>
                        <div className="widget-cell">
                          <span className="cell-label">目标科室</span>
                          <span className="cell-val">{state.target_department || '全科室'}</span>
                        </div>
                        <div className="widget-cell">
                          <span className="cell-label">
                            {state.domain === 'drugs' ? '消除半衰期' :
                             state.domain === 'ai' ? '模型精度' :
                             state.domain === 'surgical' ? '学习曲线' : '排泄半衰期'}
                          </span>
                          <span className="cell-val">
                            {state.domain === 'drugs' ? `${state.drug_half_life || 12.0}h` :
                             state.domain === 'ai' ? `${state.accuracy || 92.4}%` :
                             state.domain === 'surgical' ? `${state.learning_curve_cases || 25}例` : `${state.half_life || 2.4}h`}
                          </span>
                        </div>
                        <div className="widget-cell">
                          <span className="cell-label">校准凭据数</span>
                          <span className="cell-val">{ragReferences.length} 条</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button 
                      className={`harmony-btn primary ${isSyncingHarmony ? 'loading' : ''}`}
                      disabled={isSyncingHarmony}
                      onClick={() => {
                        setIsSyncingHarmony(true);
                        setTimeout(() => {
                          setIsSyncingHarmony(false);
                          setHarmonySynced(true);
                        }, 1200);
                      }}
                      style={{ flex: 1 }}
                    >
                      {isSyncingHarmony ? '星闪总线同步中...' : harmonySynced ? '更新多端推流' : '星闪一键推流'}
                    </button>
                    {harmonySynced && (
                      <button 
                        className="harmony-btn secondary"
                        onClick={() => setHarmonySynced(false)}
                        style={{ cursor: 'pointer' }}
                      >
                        断开协同
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. End-side NPU sandbox Anonymizer */}
                <div className="harmony-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="harmony-card-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
                      ArkCompiler NPU 沙箱
                    </span>
                    <span className="npu-status-badge">
                      <Cpu size={10} style={{ marginRight: '4px' }} />
                      NPU 隐私保护
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    本地端侧 3B 大模型隐私脱敏
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    调用设备端侧麒麟处理器内置的 NPU 神经处理单元，在本地对上传的 PDF/MD 临床数据及患者病例进行本地脱敏（替换受试者 ID、过滤隐私及医院铭牌），保证核心资产不出沙箱。
                  </p>

                  {/* NPU Anonymizer Console Simulation */}
                  <NpuSandboxPanel selectedPaperId={selectedPaperId} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
