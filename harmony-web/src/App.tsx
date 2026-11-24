import { useEffect, useMemo, useRef, useState } from 'react';
import { TopHeaderBar } from './components/TopHeaderBar';
import { LeftPaperRail } from './components/LeftPaperRail';
import { CenterWorkspace } from './components/CenterWorkspace';
import { RightCopilotSheet } from './components/RightCopilotSheet';
import { OverlayDrawer } from './components/OverlayDrawer';
import { MobileBottomNav, type MobileSection } from './components/MobileBottomNav';
import { getProviderMeta } from './utils/providers';
import {
  DEFAULT_ROBOTS,
  DEFAULT_STATE,
  DEFAULT_SYSTEM_PROMPT,
  FRONTEND_KNOWLEDGE_BASE,
  PRESET_PAPERS,
  VALID_KEYWORDS,
} from './lib/constants';
import {
  analyzePaper,
  chatAgentStream,
  deletePersistedPaper,
  fetchBackendState,
  fetchModelProviderStatus,
  fetchPersistedPapers,
  fileToBase64,
  generateDocsStream,
  generateParamsForCustomPaper,
  getLocalRobotMatches,
  matchScenarios,
  syncBackendState,
} from './lib/api';
import {
  computeStateDiffs,
  generateBpDoc,
  generateClinicalDoc,
} from './utils/docGenerators';
import { buildLocalParamCitations } from './utils/docExporters';
import { processLocalChatCommand } from './utils/localChatEngine';
import { useModelStore } from './stores/modelStore';
import type {
  AppParams,
  ChatMessage,
  CustomPaper,
  DrawerType,
  ParamCitation,
  RAGReference,
  RobotMatch,
  RunCacheEntry,
  WorkspaceTab,
} from './lib/types';

function formatNowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const INITIAL_CHAT: ChatMessage[] = [
  {
    sender: 'assistant',
    text: '参数提取与 RAG 法规校准引擎已就绪。支持医疗器械、创新药、SaMD 影像算法与临床新术式四大领域；可直接点击参数卡片就地编辑，或在此下达微调指令同步更新匹配与文档。',
    timestamp: '就绪',
    provider: 'DeepSeek',
  },
];

function App() {
  // Model & API Configuration
  const [apiKey, setApiKey] = useState('');
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [hasServerModelKey, setHasServerModelKey] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [modelProvider, setModelProvider] = useState('DeepSeek');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const modelStore = useModelStore();

  // Paper Queue States
  const [deletedPresetIds, setDeletedPresetIds] = useState<Set<string>>(new Set());
  const [customPapers, setCustomPapers] = useState<CustomPaper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('devices-default');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Pipeline & Workspace States
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>('params');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [state, setState] = useState<AppParams>(DEFAULT_STATE);
  const [matchedRobots, setMatchedRobots] = useState<RobotMatch[]>(DEFAULT_ROBOTS);
  const [clinicalDoc, setClinicalDoc] = useState('');
  const [bpDoc, setBpDoc] = useState('');
  const [docSource, setDocSource] = useState<'llm' | 'template'>('template');
  const [docProviderUsed, setDocProviderUsed] = useState<string | null>(null);
  const [isDocsStale, setIsDocsStale] = useState(false);
  const [isRegeneratingDocs, setIsRegeneratingDocs] = useState(false);
  const [ragReferences, setRagReferences] = useState<RAGReference[]>([]);
  const [paramCitations, setParamCitations] = useState<Record<string, ParamCitation>>({});
  const [runCache, setRunCache] = useState<Record<string, RunCacheEntry>>({});

  // Layout, Drawers & Mobile Navigation
  const [isCopilotCollapsed, setIsCopilotCollapsed] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [mobileSection, setMobileSection] = useState<MobileSection>('params');

  // HarmonyOS Synergy
  const [harmonySynced, setHarmonySynced] = useState(false);

  // Copilot Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Refs to prevent tab hijacking and clean up timers
  const userSwitchedTabRef = useRef(false);
  const pipelineTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const visiblePresetPapers = useMemo(
    () => PRESET_PAPERS.filter((p) => !deletedPresetIds.has(p.id)),
    [deletedPresetIds]
  );

  const allVisiblePapers = useMemo(
    () => [...visiblePresetPapers, ...customPapers],
    [visiblePresetPapers, customPapers]
  );

  const completedPaperIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(runCache).forEach(([id, entry]) => {
      if (entry.pipelineStep >= 3) ids.add(id);
    });
    if (pipelineStep >= 3 && selectedPaperId) ids.add(selectedPaperId);
    return ids;
  }, [runCache, pipelineStep, selectedPaperId]);

  const selectedPaperTitle = useMemo(() => {
    const found = allVisiblePapers.find((p) => p.id === selectedPaperId);
    return found?.title || state.paper_title || '未选择论文';
  }, [allVisiblePapers, selectedPaperId, state.paper_title]);

  const selectedPaperContent = useMemo(() => {
    const custom = customPapers.find((p) => p.id === selectedPaperId);
    return custom?.content;
  }, [customPapers, selectedPaperId]);

  const canUseLLM = isOnlineMode && backendAvailable && (Boolean(apiKey.trim()) || hasServerModelKey);

  const clearPipelineTimers = () => {
    pipelineTimersRef.current.forEach((t) => clearTimeout(t));
    pipelineTimersRef.current = [];
  };

  useEffect(() => clearPipelineTimers, []);

  // Auto-detect provider when user pastes API key
  useEffect(() => {
    if (!apiKey) return;
    const lower = apiKey.toLowerCase();
    if (lower.startsWith('sk-or-')) setModelProvider('OpenRouter');
    else if (lower.includes('pangu') || lower.includes('huawei') || lower.startsWith('hw-')) setModelProvider('Huawei Pangu');
    else if (lower.includes('gemini') || lower.startsWith('ai_') || lower.startsWith('aiza')) setModelProvider('Google Gemini');
    else if (lower.includes('zhipu') || lower.startsWith('gl-')) setModelProvider('Zhipu GLM');
    else if (lower.startsWith('sk-d') || lower.includes('deepseek')) setModelProvider('DeepSeek');
    else if (lower.startsWith('sk-')) setModelProvider('OpenAI');
  }, [apiKey]);

  // Check FastAPI backend health, restore persisted session papers & detect server-managed LLM keys
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [backendState, persistedPapers, modelStatus] = await Promise.all([
        fetchBackendState(),
        fetchPersistedPapers(),
        fetchModelProviderStatus(),
      ]);

      if (cancelled) return;

      if (backendState && backendState.domain) {
        setState(backendState);
        setBackendAvailable(true);
        setIsOnlineMode(true);
      } else {
        setBackendAvailable(false);
        setIsOnlineMode(false);
      }

      if (modelStatus) {
        setHasServerModelKey(Boolean(modelStatus.has_server_key));
      }

      if (persistedPapers.length > 0) {
        const restoredCustom: CustomPaper[] = [];
        const restoredCache: Record<string, RunCacheEntry> = {};
        const presetIds = new Set(PRESET_PAPERS.map((p) => p.id));

        for (const p of persistedPapers) {
          if (!presetIds.has(p.id)) {
            restoredCustom.push({
              id: p.id,
              title: p.title,
              isCustom: true,
              content: p.content,
              params: p.params,
            });
          }
          if (p.clinical_doc && p.bp_doc) {
            restoredCache[p.id] = {
              pipelineStep: 3,
              currentTab: 'params',
              state: p.params,
              matchedRobots: getLocalRobotMatches(p.params.domain, p.params.target_department),
              clinicalDoc: p.clinical_doc,
              bpDoc: p.bp_doc,
              docSource: p.doc_source || 'template',
              docProviderUsed: null,
              isDocsStale: false,
              ragReferences: FRONTEND_KNOWLEDGE_BASE[p.params.domain || 'devices'] || [],
              paramCitations: buildLocalParamCitations(p.params, p.content),
              harmonySynced: false,
            };
          }
        }

        if (restoredCustom.length > 0) {
          setCustomPapers((prev) => {
            const existing = new Set(prev.map((x) => x.id));
            return [...prev, ...restoredCustom.filter((x) => !existing.has(x.id))];
          });
        }
        if (Object.keys(restoredCache).length > 0) {
          setRunCache((prev) => ({ ...restoredCache, ...prev }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync current paper's run state into cache
  useEffect(() => {
    if (selectedPaperId && pipelineStep > 0) {
      setRunCache((prev) => ({
        ...prev,
        [selectedPaperId]: {
          pipelineStep,
          currentTab,
          state,
          matchedRobots,
          clinicalDoc,
          bpDoc,
          docSource,
          docProviderUsed,
          isDocsStale,
          ragReferences,
          paramCitations,
          harmonySynced,
        },
      }));
    }
  }, [
    pipelineStep,
    currentTab,
    state,
    matchedRobots,
    clinicalDoc,
    bpDoc,
    docSource,
    docProviderUsed,
    isDocsStale,
    ragReferences,
    paramCitations,
    harmonySynced,
    selectedPaperId,
  ]);

  // Fix broken link #4: only auto-regenerate template docs when docSource === 'template' and not actively streaming.
  // When docSource === 'llm', preserve LLM output instead of silently overwriting with local templates!
  useEffect(() => {
    if (pipelineStep !== 3) {
      setClinicalDoc('');
      setBpDoc('');
      setIsDocsStale(false);
      return;
    }
    if (isAnalyzing || isRegeneratingDocs) {
      return;
    }
    if (docSource === 'template') {
      setClinicalDoc(generateClinicalDoc(state));
      setBpDoc(generateBpDoc(state));
      setIsDocsStale(false);
    }
  }, [state, pipelineStep, docSource, isAnalyzing, isRegeneratingDocs]);

  const handleSelectPaper = (paperId: string, paperParams: AppParams) => {
    if (isAnalyzing) return;

    if (selectedPaperId && pipelineStep > 0) {
      setRunCache((prev) => ({
        ...prev,
        [selectedPaperId]: {
          pipelineStep,
          currentTab,
          state,
          matchedRobots,
          clinicalDoc,
          bpDoc,
          docSource,
          docProviderUsed,
          isDocsStale,
          ragReferences,
          paramCitations,
          harmonySynced,
        },
      }));
    }

    setSelectedPaperId(paperId);
    setAnalysisError(null);
    const cached = runCache[paperId];

    if (cached) {
      setPipelineStep(cached.pipelineStep);
      setCurrentTab(cached.currentTab);
      setState(cached.state);
      setMatchedRobots(cached.matchedRobots);
      setClinicalDoc(cached.clinicalDoc);
      setBpDoc(cached.bpDoc);
      setDocSource(cached.docSource || 'template');
      setDocProviderUsed(cached.docProviderUsed ?? null);
      setIsDocsStale(Boolean(cached.isDocsStale));
      setRagReferences(cached.ragReferences);
      setParamCitations(cached.paramCitations || buildLocalParamCitations(cached.state));
      setHarmonySynced(cached.harmonySynced);
    } else {
      setPipelineStep(0);
      setCurrentTab('params');
      setState(paperParams);
      setMatchedRobots(getLocalRobotMatches(paperParams.domain, paperParams.target_department));
      setClinicalDoc('');
      setBpDoc('');
      setDocSource('template');
      setDocProviderUsed(null);
      setIsDocsStale(false);
      setRagReferences([]);
      setParamCitations({});
      setHarmonySynced(false);
    }

    if (isOnlineMode && backendAvailable) {
      syncBackendState(paperParams);
    }
  };

  const handleDeletePaper = (id: string) => {
    if (id.endsWith('-default')) {
      setDeletedPresetIds((prev) => new Set(prev).add(id));
    } else {
      setCustomPapers((prev) => prev.filter((p) => p.id !== id));
      if (backendAvailable) {
        deletePersistedPaper(id);
      }
    }

    setRunCache((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (selectedPaperId === id) {
      const remaining = allVisiblePapers.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        handleSelectPaper(remaining[0].id, remaining[0].params);
      } else {
        setSelectedPaperId('');
        setPipelineStep(0);
      }
    }
  };

  const handleRestorePresets = () => {
    setDeletedPresetIds(new Set());
    if (PRESET_PAPERS.length > 0) {
      handleSelectPaper(PRESET_PAPERS[0].id, PRESET_PAPERS[0].params);
    }
  };

  // Fix broken link #1: encode full PDF/MD/TXT bytes to base64 and send to backend for real PDF text extraction
  const handleUploadFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    const title = file.name.replace(/\.[^/.]+$/, '');
    const isText = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md');
    const paperId = 'custom-' + Date.now();

    let textContent = '';
    let base64Content = '';
    try {
      if (isText) {
        textContent = await file.text();
      }
      base64Content = await fileToBase64(file);
    } catch {
      setIsUploading(false);
      setUploadError('读取本地文件失败，请重试。');
      return;
    }

    if (backendAvailable) {
      const data = await analyzePaper(
        title,
        textContent.substring(0, 15000),
        isOnlineMode ? apiKey || null : null,
        isOnlineMode ? modelProvider : null,
        {
          fileBase64: base64Content,
          filename: file.name,
          paperId,
        }
      );

      setIsUploading(false);

      if (data) {
        if (data.status === 'warning' || !data.is_valid) {
          setUploadError(`文件校验未通过：${data.reason || '不属于转化医学相关文献'}`);
          return;
        }

        if (data.input_tokens !== undefined || data.output_tokens !== undefined) {
          modelStore.updateTokenMetrics({
            input_tokens: data.input_tokens || 0,
            output_tokens: data.output_tokens || 0,
            latency_ms: data.latency_ms || 0,
            model_name: data.model_name,
            provider_id: data.provider_used,
          });
        }

        const verifiedParams: AppParams = data.state;
        const extractedText = data.extracted_text || textContent;
        const newPaper: CustomPaper = {
          id: data.paper_id || paperId,
          title,
          isCustom: true,
          content: extractedText,
          params: verifiedParams,
        };
        setCustomPapers((prev) => [...prev, newPaper]);
        handleSelectPaper(newPaper.id, verifiedParams);
        return;
      }
    }

    // Offline fallback when backend is not running
    setIsUploading(false);
    const textToCheck = (file.name + ' ' + textContent).toLowerCase();
    const hasKeyword = VALID_KEYWORDS.some((kw) => textToCheck.includes(kw));

    if (!hasKeyword) {
      setUploadError(
        '离线本地校验未通过：后端服务未运行且文件名/文本未包含转化医学核心术语，请启动 FastAPI 后端以支持真实 PDF 正文解析。'
      );
      return;
    }

    const localParams = generateParamsForCustomPaper(file.name, textContent);
    const newPaper: CustomPaper = {
      id: paperId,
      title,
      isCustom: true,
      content: textContent,
      params: localParams,
    };
    setCustomPapers((prev) => [...prev, newPaper]);
    handleSelectPaper(newPaper.id, localParams);
  };

  const handleClearResults = () => {
    if (isAnalyzing) return;
    clearPipelineTimers();
    setPipelineStep(0);
    setCurrentTab('params');
    setAnalysisError(null);
    setClinicalDoc('');
    setBpDoc('');
    setDocSource('template');
    setDocProviderUsed(null);
    setIsDocsStale(false);
    setRagReferences([]);
    setParamCitations({});
    setHarmonySynced(false);

    let defaultParams = DEFAULT_STATE;
    const found = allVisiblePapers.find((p) => p.id === selectedPaperId);
    if (found) defaultParams = found.params;
    setState(defaultParams);
    setMatchedRobots(getLocalRobotMatches(defaultParams.domain, defaultParams.target_department));

    setRunCache((prev) => {
      const copy = { ...prev };
      delete copy[selectedPaperId];
      return copy;
    });

    if (isOnlineMode && backendAvailable) {
      syncBackendState(defaultParams);
    }
  };

  const handleRegenerateDocs = async () => {
    if (isRegeneratingDocs) return;
    if (!isOnlineMode || !backendAvailable) {
      setDocSource('template');
      setDocProviderUsed(null);
      setClinicalDoc(generateClinicalDoc(state));
      setBpDoc(generateBpDoc(state));
      setIsDocsStale(false);
      return;
    }

    setIsRegeneratingDocs(true);
    try {
      const data = await generateDocsStream(
        apiKey || null,
        modelProvider || null,
        state,
        selectedPaperId,
        {
          onStart: (src) => {
            setDocSource(src);
            setClinicalDoc('');
            setBpDoc('');
          },
          onReset: () => {
            setClinicalDoc('');
            setBpDoc('');
          },
          onClinicalDelta: (_delta, acc) => setClinicalDoc(acc),
          onBpDelta: (_delta, acc) => setBpDoc(acc),
        }
      );
      if (data?.clinical_trial_protocol && data?.business_plan) {
        setClinicalDoc(data.clinical_trial_protocol);
        setBpDoc(data.business_plan);
        setDocSource(data.doc_source === 'llm' ? 'llm' : 'template');
        setDocProviderUsed(data.provider_used || null);
        setIsDocsStale(false);
        if (data.input_tokens !== undefined || data.output_tokens !== undefined) {
          modelStore.updateTokenMetrics({
            input_tokens: data.input_tokens || 0,
            output_tokens: data.output_tokens || 0,
            latency_ms: data.latency_ms || 0,
            model_name: data.model_name,
            provider_id: data.provider_used,
          });
        }
      }
    } finally {
      setIsRegeneratingDocs(false);
    }
  };

  const handleStartTranslation = async () => {
    if (isAnalyzing) return;
    clearPipelineTimers();
    userSwitchedTabRef.current = false;
    setAnalysisError(null);
    setIsAnalyzing(true);
    setPipelineStep(1);
    setCurrentTab('params');
    setMobileSection('params');

    let paperTitle = selectedPaperTitle;
    let paperContent = `${paperTitle} (预置转化医学示范文献)`;

    const customP = customPapers.find((p) => p.id === selectedPaperId);
    if (customP) {
      paperTitle = customP.title;
      paperContent = customP.content || paperTitle;
    }

    let nextState = state;
    if (isOnlineMode && backendAvailable) {
      const data = await analyzePaper(
        paperTitle,
        paperContent,
        apiKey || null,
        modelProvider || null,
        { paperId: selectedPaperId }
      );
      if (data) {
        if (data.status === 'warning' || !data.is_valid) {
          setAnalysisError(`分析警告：${data.reason || '该文献未通过医学转化相关性检验'}`);
          setIsAnalyzing(false);
          setPipelineStep(0);
          return;
        }
        nextState = data.state;
        setState(nextState);
        setRagReferences(
          data.rag_references && data.rag_references.length > 0
            ? data.rag_references
            : FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']
        );
        setParamCitations(
          data.param_citations && Object.keys(data.param_citations).length > 0
            ? data.param_citations
            : buildLocalParamCitations(nextState, paperContent)
        );
        if (data.input_tokens !== undefined || data.output_tokens !== undefined) {
          modelStore.updateTokenMetrics({
            input_tokens: data.input_tokens || 0,
            output_tokens: data.output_tokens || 0,
            latency_ms: data.latency_ms || 0,
            model_name: data.model_name,
            provider_id: data.provider_used,
          });
        }
      } else {
        setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
        setParamCitations(buildLocalParamCitations(nextState, paperContent));
      }
    } else {
      setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
      setParamCitations(buildLocalParamCitations(nextState, paperContent));
    }

    const t1 = setTimeout(async () => {
      setPipelineStep(2);
      if (!userSwitchedTabRef.current) setCurrentTab('matching');

      if (isOnlineMode && backendAvailable) {
        const matches = await matchScenarios(
          nextState.domain,
          nextState.excitation_wavelength,
          nextState.target_department
        );
        if (matches) {
          setMatchedRobots(matches);
        } else {
          setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
        }
      } else {
        setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
      }

      const t2 = setTimeout(async () => {
        if (isOnlineMode && backendAvailable) {
          const docData = await generateDocsStream(
            apiKey || null,
            modelProvider || null,
            nextState,
            selectedPaperId,
            {
              onStart: (src) => {
                setDocSource(src);
                setClinicalDoc('');
                setBpDoc('');
              },
              onReset: () => {
                setClinicalDoc('');
                setBpDoc('');
              },
              onClinicalDelta: (_delta, acc) => setClinicalDoc(acc),
              onBpDelta: (_delta, acc) => setBpDoc(acc),
            }
          );
          if (docData?.clinical_trial_protocol && docData?.business_plan) {
            const source = docData.doc_source === 'llm' ? 'llm' : 'template';
            setDocSource(source);
            setDocProviderUsed(docData.provider_used || null);
            setClinicalDoc(docData.clinical_trial_protocol);
            setBpDoc(docData.business_plan);
            setIsDocsStale(false);
            if (docData.input_tokens !== undefined || docData.output_tokens !== undefined) {
              modelStore.updateTokenMetrics({
                input_tokens: docData.input_tokens || 0,
                output_tokens: docData.output_tokens || 0,
                latency_ms: docData.latency_ms || 0,
                model_name: docData.model_name,
                provider_id: docData.provider_used,
              });
            }
          } else {
            setDocSource('template');
            setDocProviderUsed(null);
            setClinicalDoc(generateClinicalDoc(nextState));
            setBpDoc(generateBpDoc(nextState));
            setIsDocsStale(false);
          }
        } else {
          setDocSource('template');
          setDocProviderUsed(null);
          setClinicalDoc(generateClinicalDoc(nextState));
          setBpDoc(generateBpDoc(nextState));
          setIsDocsStale(false);
        }

        setPipelineStep(3);
        if (!userSwitchedTabRef.current) setCurrentTab('params');
        setIsAnalyzing(false);
      }, 650);
      pipelineTimersRef.current.push(t2);
    }, 650);
    pipelineTimersRef.current.push(t1);
  };

  // Inline click-to-edit on MetricTile cards
  const handleInlineUpdateParam = async (
    key: keyof AppParams,
    value: number | string,
    label: string
  ) => {
    const prevState = state;
    const nextState: AppParams = { ...state, [key]: value };

    if (key === 'excitation_wavelength' && typeof value === 'number') {
      nextState.emission_wavelength = value + 30;
    }

    const diffs = computeStateDiffs(prevState, nextState);
    setState(nextState);

    if (pipelineStep === 3 && docSource === 'llm') {
      setIsDocsStale(true);
    }

    if (isOnlineMode && backendAvailable) {
      syncBackendState(nextState);
      const liveMatches = await matchScenarios(
        nextState.domain,
        nextState.excitation_wavelength,
        nextState.target_department
      );
      if (liveMatches) {
        setMatchedRobots(liveMatches);
      } else {
        setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
      }
    } else {
      setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
    }

    if (diffs.length > 0) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text:
            pipelineStep === 3 && docSource === 'llm'
              ? `已同步就地编辑的「${label}」，PK 曲线与场景权重已重算；当前保留大模型生成的文档，您可在文档页点击「同步最新参数并重新生成」更新正文：`
              : `已同步就地编辑的「${label}」，PK 曲线、场景权重与文档已实时重算：`,
          timestamp: formatNowTime(),
          provider: modelProvider,
          diffs,
        },
      ]);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const userMsg = textToSend.trim();
    if (!userMsg || isSendingChat) return;

    const prevStateSnapshot = state;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsSendingChat(true);

    // Quick intercept for model/provider status inquiries
    const msgLower = userMsg.toLowerCase();
    const isAskingModel = ['模型', '版本', '供应商', 'model', 'version', '底座', '服务商', '提供商'].some((kw) =>
      msgLower.includes(kw)
    );
    if (isAskingModel) {
      const meta = getProviderMeta(modelProvider);
      const hasKey = apiKey
        ? `已配置 (${apiKey.substring(0, 6)}...)`
        : hasServerModelKey
          ? '服务端 .env 已托管'
          : '未配置（本地规则引擎可用）';
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `当前激活模型路由：**${meta.label}**（底座 \`${meta.modelName}\`），API Key 状态：\`${hasKey}\`。您可以随时在顶部栏切换供应商。`,
            timestamp: formatNowTime(),
            provider: modelProvider,
          },
        ]);
        setIsSendingChat(false);
      }, 240);
      return;
    }

    if (isOnlineMode && backendAvailable) {
      let streamStarted = false;
      const ts = formatNowTime();

      const data = await chatAgentStream(
        userMsg,
        apiKey || null,
        modelProvider || null,
        systemPrompt,
        clinicalDoc,
        bpDoc,
        chatMessages,
        {
          onDelta: (_delta, acc) => {
            if (!streamStarted) {
              streamStarted = true;
              setChatMessages((prev) => [
                ...prev,
                {
                  sender: 'assistant',
                  text: acc,
                  timestamp: ts,
                  provider: modelProvider,
                },
              ]);
            } else {
              setChatMessages((prev) => {
                if (prev.length === 0) return prev;
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  text: acc,
                };
                return next;
              });
            }
          },
        }
      );

      if (data) {
        if (
          data.input_tokens !== undefined ||
          data.output_tokens !== undefined ||
          data.latency_ms !== undefined
        ) {
          modelStore.updateTokenMetrics({
            input_tokens: data.input_tokens || 0,
            output_tokens: data.output_tokens || 0,
            latency_ms: data.latency_ms || 0,
            model_name: data.model_name,
            provider_id: data.provider_id,
          });
        }

        let diffs = undefined;
        if (data.state_updated && data.current_state) {
          diffs = computeStateDiffs(prevStateSnapshot, data.current_state);
          setState(data.current_state);
          if (pipelineStep === 3 && docSource === 'llm') {
            setIsDocsStale(true);
          }
          setRagReferences(FRONTEND_KNOWLEDGE_BASE[data.current_state.domain || 'devices']);
          const liveMatches = await matchScenarios(
            data.current_state.domain,
            data.current_state.excitation_wavelength,
            data.current_state.target_department
          );
          if (liveMatches) {
            setMatchedRobots(liveMatches);
          } else {
            setMatchedRobots(
              getLocalRobotMatches(data.current_state.domain, data.current_state.target_department)
            );
          }
        }

        const finalText = data.reply || '已完成参数微调与文档同步。';
        if (streamStarted) {
          setChatMessages((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              text: finalText,
              diffs,
            };
            return next;
          });
        } else {
          setChatMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              text: finalText,
              timestamp: ts,
              provider: modelProvider,
              diffs,
            },
          ]);
        }
        setIsSendingChat(false);
        return;
      }
    }

    setTimeout(() => {
      const { reply, nextState, updated } = processLocalChatCommand(userMsg, prevStateSnapshot);
      const diffs = updated ? computeStateDiffs(prevStateSnapshot, nextState) : undefined;

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: reply,
          timestamp: formatNowTime(),
          provider: modelProvider,
          diffs,
        },
      ]);

      if (updated) {
        setState(nextState);
        if (pipelineStep === 3 && docSource === 'llm') {
          setIsDocsStale(true);
        }
        setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
        setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
      }
      setIsSendingChat(false);
    }, 360);
  };

  const handleDownloadDoc = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const handleMobileSectionSelect = (section: MobileSection) => {
    setMobileSection(section);
    if (section === 'copilot') {
      setActiveDrawer('copilot');
    } else {
      if (activeDrawer === 'copilot') setActiveDrawer(null);
      if (section === 'params') setCurrentTab('params');
      if (section === 'docs') setCurrentTab('docs');
    }
  };

  return (
    <div className="ym-app">
      <TopHeaderBar
        modelProvider={modelProvider}
        onSelectProvider={setModelProvider}
        apiKey={apiKey}
        onChangeApiKey={setApiKey}
        isApiConfigured={isApiConfigured}
        hasServerModelKey={hasServerModelKey}
        onSaveApiKey={() => setIsApiConfigured(Boolean(apiKey.trim()))}
        onClearApiKey={() => {
          setApiKey('');
          setIsApiConfigured(false);
        }}
        isOnlineMode={isOnlineMode}
        backendAvailable={backendAvailable}
        onToggleMode={setIsOnlineMode}
        activeDrawer={activeDrawer}
        onOpenDrawer={setActiveDrawer}
        isCopilotCollapsed={isCopilotCollapsed}
        onToggleCopilot={() => setIsCopilotCollapsed((v) => !v)}
        harmonySynced={harmonySynced}
      />

      <div className={`ym-workspace ${isCopilotCollapsed ? 'copilot-collapsed' : ''}`}>
        <LeftPaperRail
          papers={allVisiblePapers}
          selectedPaperId={selectedPaperId}
          completedPaperIds={completedPaperIds}
          hasDeletedPresets={deletedPresetIds.size > 0}
          isAnalyzing={isAnalyzing}
          isUploading={isUploading}
          uploadError={uploadError}
          onDismissUploadError={() => setUploadError(null)}
          onSelectPaper={(id, params) => {
            handleSelectPaper(id, params);
            setMobileSection('params');
          }}
          onDeletePaper={handleDeletePaper}
          onRestorePresets={handleRestorePresets}
          onUploadFile={handleUploadFile}
          onStartTranslation={handleStartTranslation}
          onClearResults={handleClearResults}
          mobileHidden={mobileSection !== 'papers'}
        />

        <CenterWorkspace
          currentTab={currentTab}
          onSelectTab={(tab) => {
            userSwitchedTabRef.current = true;
            setCurrentTab(tab);
          }}
          pipelineStep={pipelineStep}
          isAnalyzing={isAnalyzing}
          analysisError={analysisError}
          onDismissAnalysisError={() => setAnalysisError(null)}
          selectedPaperTitle={selectedPaperTitle}
          state={state}
          matchedRobots={matchedRobots}
          clinicalDoc={clinicalDoc}
          bpDoc={bpDoc}
          docSource={docSource}
          docProviderUsed={docProviderUsed}
          isDocsStale={isDocsStale}
          isRegeneratingDocs={isRegeneratingDocs}
          canUseLLM={canUseLLM}
          onRegenerateDocs={handleRegenerateDocs}
          onUpdateClinicalDoc={setClinicalDoc}
          onUpdateBpDoc={setBpDoc}
          ragReferences={ragReferences}
          paramCitations={paramCitations}
          onStartTranslation={handleStartTranslation}
          onInlineUpdateParam={handleInlineUpdateParam}
          onDownloadDoc={handleDownloadDoc}
          mobileHidden={mobileSection === 'papers'}
        />

        {!isCopilotCollapsed && (
          <RightCopilotSheet
            messages={chatMessages}
            chatInput={chatInput}
            onChangeInput={setChatInput}
            onSendMessage={handleSendMessage}
            isSending={isSendingChat}
            domain={state.domain}
            modelProvider={modelProvider}
            onSelectProvider={setModelProvider}
            systemPrompt={systemPrompt}
            onChangeSystemPrompt={setSystemPrompt}
            onResetSystemPrompt={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            onCollapse={() => setIsCopilotCollapsed(true)}
            embedded
          />
        )}
      </div>

      <MobileBottomNav
        activeSection={activeDrawer === 'copilot' ? 'copilot' : mobileSection}
        onSelectSection={handleMobileSectionSelect}
      />

      <OverlayDrawer
        activeDrawer={activeDrawer}
        onClose={() => {
          setActiveDrawer(null);
          if (mobileSection === 'copilot') setMobileSection('params');
        }}
        selectedPaperId={selectedPaperId}
        selectedPaperTitle={selectedPaperTitle}
        selectedPaperContent={selectedPaperContent}
        state={state}
        ragReferences={ragReferences}
        harmonySynced={harmonySynced}
        isSyncingHarmony={false}
        onSyncHarmony={() => setHarmonySynced(true)}
        onDisconnectHarmony={() => setHarmonySynced(false)}
        messages={chatMessages}
        chatInput={chatInput}
        onChangeInput={setChatInput}
        onSendMessage={handleSendMessage}
        isSendingChat={isSendingChat}
        modelProvider={modelProvider}
        onSelectProvider={setModelProvider}
        systemPrompt={systemPrompt}
        onChangeSystemPrompt={setSystemPrompt}
        onResetSystemPrompt={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
      />
    </div>
  );
}

export default App;
