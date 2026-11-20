import { useEffect, useMemo, useRef, useState } from 'react';
import { TopHeaderBar } from './components/TopHeaderBar';
import { LeftPaperRail } from './components/LeftPaperRail';
import { CenterWorkspace } from './components/CenterWorkspace';
import { RightCopilotSheet } from './components/RightCopilotSheet';
import { OverlayDrawer } from './components/OverlayDrawer';
import { MobileBottomNav, type MobileSection } from './components/MobileBottomNav';
import { getProviderMeta } from './utils/providers';
import {
  BACKEND_URL,
  DEFAULT_ROBOTS,
  DEFAULT_STATE,
  DEFAULT_SYSTEM_PROMPT,
  FRONTEND_KNOWLEDGE_BASE,
  PRESET_PAPERS,
  VALID_KEYWORDS,
} from './lib/constants';
import {
  generateParamsForCustomPaper,
  getLocalRobotMatches,
  syncBackendState,
} from './lib/api';
import {
  computeStateDiffs,
  generateBpDoc,
  generateClinicalDoc,
} from './utils/docGenerators';
import { processLocalChatCommand } from './utils/localChatEngine';
import { useModelStore } from './stores/modelStore';
import type {
  AppParams,
  ChatMessage,
  CustomPaper,
  DrawerType,
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
  const [ragReferences, setRagReferences] = useState<RAGReference[]>([]);
  const [runCache, setRunCache] = useState<Record<string, RunCacheEntry>>({});

  // Layout, Drawers & Mobile Navigation
  const [isCopilotCollapsed, setIsCopilotCollapsed] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [mobileSection, setMobileSection] = useState<MobileSection>('params');

  // HarmonyOS Synergy
  const [harmonySynced, setHarmonySynced] = useState(false);
  const [isSyncingHarmony, setIsSyncingHarmony] = useState(false);

  // Copilot Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Refs to prevent tab hijacking (fixes P1-2) and clean up timers
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
    else if (lower.includes('gemini') || lower.startsWith('ai_')) setModelProvider('Google Gemini');
    else if (lower.startsWith('sk-d') || lower.includes('deepseek')) setModelProvider('DeepSeek');
    else if (lower.startsWith('sk-')) setModelProvider('OpenAI');
  }, [apiKey]);

  // Check FastAPI backend health on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/state`)
      .then((res) => {
        if (!res.ok) throw new Error('backend unavailable');
        return res.json();
      })
      .then((data) => {
        if (data && data.domain) setState(data);
        setBackendAvailable(true);
        setIsOnlineMode(true);
      })
      .catch(() => {
        setBackendAvailable(false);
        setIsOnlineMode(false);
      });
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
          ragReferences,
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
    ragReferences,
    harmonySynced,
    selectedPaperId,
  ]);

  // Keep local clinical & BP docs in sync with state whenever stage 3 is active
  useEffect(() => {
    if (pipelineStep !== 3) {
      setClinicalDoc('');
      setBpDoc('');
      return;
    }
    setClinicalDoc(generateClinicalDoc(state));
    setBpDoc(generateBpDoc(state));
  }, [state, pipelineStep]);

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
          ragReferences,
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
      setRagReferences(cached.ragReferences);
      setHarmonySynced(cached.harmonySynced);
    } else {
      setPipelineStep(0);
      setCurrentTab('params');
      setState(paperParams);
      setMatchedRobots(getLocalRobotMatches(paperParams.domain, paperParams.target_department));
      setClinicalDoc('');
      setBpDoc('');
      setRagReferences([]);
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

  const handleUploadFile = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    const isText = file.name.endsWith('.txt') || file.name.endsWith('.md');

    reader.onload = async (e) => {
      const textContent = isText ? (e.target?.result as string) || '' : '';
      const title = file.name.replace(/\.[^/.]+$/, '');
      setIsUploading(true);

      try {
        const res = await fetch(`${BACKEND_URL}/analyze-paper`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: textContent.substring(0, 4000),
            api_key: isOnlineMode ? apiKey || null : null,
            provider: isOnlineMode ? modelProvider : null,
          }),
        });
        const data = await res.json();
        setIsUploading(false);

        if (data.status === 'warning' || !data.is_valid) {
          setUploadError(`文件校验未通过：${data.reason || '不属于转化医学相关文献'}`);
          return;
        }

        const verifiedParams: AppParams = data.state;
        const newPaper: CustomPaper = {
          id: 'custom-' + Date.now(),
          title,
          isCustom: true,
          content: textContent,
          params: verifiedParams,
        };
        setCustomPapers((prev) => [...prev, newPaper]);
        handleSelectPaper(newPaper.id, verifiedParams);
      } catch {
        setIsUploading(false);
        const textToCheck = (file.name + ' ' + textContent).toLowerCase();
        const hasKeyword = VALID_KEYWORDS.some((kw) => textToCheck.includes(kw));

        if (!hasKeyword) {
          setUploadError('本地规则校验未通过：文档未包含转化医学、临床或生医工程核心术语，已拒绝导入。');
          return;
        }

        const localParams = generateParamsForCustomPaper(file.name, textContent);
        const newPaper: CustomPaper = {
          id: 'custom-' + Date.now(),
          title,
          isCustom: true,
          content: textContent,
          params: localParams,
        };
        setCustomPapers((prev) => [...prev, newPaper]);
        handleSelectPaper(newPaper.id, localParams);
      }
    };

    if (isText) reader.readAsText(file);
    else reader.readAsArrayBuffer(file.slice(0, 1000));
  };

  const handleClearResults = () => {
    if (isAnalyzing) return;
    clearPipelineTimers();
    setPipelineStep(0);
    setCurrentTab('params');
    setAnalysisError(null);
    setClinicalDoc('');
    setBpDoc('');
    setRagReferences([]);
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
      try {
        const res = await fetch(`${BACKEND_URL}/analyze-paper`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: paperTitle,
            content: paperContent,
            api_key: apiKey || null,
            provider: modelProvider || null,
          }),
        });
        const data = await res.json();
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
      } catch {
        setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
      }
    } else {
      setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
    }

    const t1 = setTimeout(async () => {
      setPipelineStep(2);
      // Only auto-advance if user hasn't manually clicked a tab (fixes P1-2)
      if (!userSwitchedTabRef.current) setCurrentTab('matching');

      if (isOnlineMode && backendAvailable) {
        try {
          const res = await fetch(
            `${BACKEND_URL}/match-scenarios?domain=${encodeURIComponent(nextState.domain)}&wavelength=${encodeURIComponent(
              String(nextState.excitation_wavelength)
            )}&department=${encodeURIComponent(nextState.target_department)}`
          );
          const data = await res.json();
          if (data?.matches) setMatchedRobots(data.matches);
        } catch {
          setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
        }
      } else {
        setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
      }

      const t2 = setTimeout(async () => {
        setPipelineStep(3);
        // Stay on params after complete if user didn't switch so they immediately see their primary dashboard, or show docs when clicking tab
        if (!userSwitchedTabRef.current) setCurrentTab('params');

        if (isOnlineMode && backendAvailable) {
          try {
            const res = await fetch(`${BACKEND_URL}/generate-docs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey || null,
                provider: modelProvider || null,
                state: nextState,
              }),
            });
            const data = await res.json();
            if (data?.clinical_trial_protocol) setClinicalDoc(data.clinical_trial_protocol);
            if (data?.business_plan) setBpDoc(data.business_plan);
          } catch {
            // local useEffect already populates clinicalDoc & bpDoc
          }
        }
        setIsAnalyzing(false);
      }, 1100);
      pipelineTimersRef.current.push(t2);
    }, 1100);
    pipelineTimersRef.current.push(t1);
  };

  // Inline click-to-edit on MetricTile cards (implements P2-2 & Figma A4 editing state)
  const handleInlineUpdateParam = (key: keyof AppParams, value: number | string, label: string) => {
    const prevState = state;
    const nextState: AppParams = { ...state, [key]: value };

    // Keep emission wavelength coupled when excitation is edited in devices domain
    if (key === 'excitation_wavelength' && typeof value === 'number') {
      nextState.emission_wavelength = value + 30;
    }

    const diffs = computeStateDiffs(prevState, nextState);
    setState(nextState);
    setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));

    if (isOnlineMode && backendAvailable) {
      syncBackendState(nextState);
    }

    if (diffs.length > 0) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `已同步就地编辑的「${label}」，PK 曲线、场景权重与文档已实时重算：`,
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
      const hasKey = apiKey ? `已配置 (${apiKey.substring(0, 6)}...)` : '未配置（本地规则引擎可用）';
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `当前激活模型路由：**${meta.label}**（底座 \`${meta.modelName}\`），API Key 状态：\`${hasKey}\`。您可以随时在顶部栏或上方图标栏一键切换供应商。`,
            timestamp: formatNowTime(),
            provider: modelProvider,
          },
        ]);
        setIsSendingChat(false);
      }, 240);
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
            history: chatMessages.map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
          }),
        });
        const data = await res.json();

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
          setRagReferences(FRONTEND_KNOWLEDGE_BASE[data.current_state.domain || 'devices']);
          try {
            const matchRes = await fetch(
              `${BACKEND_URL}/match-scenarios?domain=${encodeURIComponent(
                data.current_state.domain
              )}&wavelength=${encodeURIComponent(
                String(data.current_state.excitation_wavelength)
              )}&department=${encodeURIComponent(data.current_state.target_department)}`
            );
            const matchData = await matchRes.json();
            if (matchData?.matches) setMatchedRobots(matchData.matches);
          } catch {
            setMatchedRobots(
              getLocalRobotMatches(data.current_state.domain, data.current_state.target_department)
            );
          }
        }

        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: data.reply || '已完成参数微调与文档同步。',
            timestamp: formatNowTime(),
            provider: modelProvider,
            diffs,
          },
        ]);
        setIsSendingChat(false);
        return;
      } catch {
        // Gracefully fall through to local rule engine if request fails
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
        setRagReferences(FRONTEND_KNOWLEDGE_BASE[nextState.domain || 'devices']);
        setMatchedRobots(getLocalRobotMatches(nextState.domain, nextState.target_department));
      }
      setIsSendingChat(false);
    }, 450);
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
          ragReferences={ragReferences}
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
        state={state}
        ragReferences={ragReferences}
        harmonySynced={harmonySynced}
        isSyncingHarmony={isSyncingHarmony}
        onSyncHarmony={() => {
          setIsSyncingHarmony(true);
          setTimeout(() => {
            setIsSyncingHarmony(false);
            setHarmonySynced(true);
          }, 900);
        }}
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
