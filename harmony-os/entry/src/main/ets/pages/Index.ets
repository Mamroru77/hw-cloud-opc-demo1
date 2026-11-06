import { AppParams, ChatMessage, RobotMatch, RAGReference, BenchmarkEntry, AuditLogEntry, DevLogEntry, CICDPipeline, ApiConfig, PRESET_PAPERS, PaperAnalysisResult, SyncStateBody, RunCacheEntry, createDefaultAppParams, createDefaultApiConfig } from '../utils/Types';
import { HttpUtil, HttpError } from '../utils/HttpUtil';
import { WsUtil } from '../utils/WsUtil';
import { HarmonyWsMessage, SanitizeResult } from '../utils/HarmonyTypes';
import { picker } from '@kit.CoreFileKit';
import { fileIo } from '@kit.CoreFileKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { promptAction } from '@kit.ArkUI';
import { DrawerMenu } from './components/DrawerMenu';
import { HarmonyDrawer } from './components/HarmonyDrawer';
import { PlanTab } from './tabs/PlanTab';
import { MatchTab } from './tabs/MatchTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { SettingsTab } from './tabs/SettingsTab';

interface RunCache {
  state: AppParams;
  matchedRobots: RobotMatch[];
  clinicalDoc: string;
  bpDoc: string;
  harmonySynced: boolean;
}

@Entry
@Component
struct Index {
  @State currentTabIndex: number = 0;
  @State appParams: AppParams = createDefaultAppParams();
  @State chatMessages: ChatMessage[] = [];
  @State clinicalPlanDoc: string = '';
  @State businessPlanDoc: string = '';
  @State inputMessage: string = '';
  @State isLoading: boolean = false;
  @State errorMessage: string = '';
  @State wsConnectionState: string = 'disconnected';
  @State robotMatches: RobotMatch[] = [];
  @State ragReferences: RAGReference[] = [];
  @State benchmarkData: BenchmarkEntry[] = [];
  @State auditLogs: AuditLogEntry[] = [];
  @State devLogs: DevLogEntry[] = [];
  @State cicdPipelines: CICDPipeline[] = [];
  @State knowledgeQuery: string = '';
  @State apiConfig: ApiConfig = createDefaultApiConfig();
  @State showDrawer: boolean = false;
  @State showOverlay: boolean = false;
  @State pipelineStep: number = 0;
  @State isAnalyzing: boolean = false;
  @State isTablet: boolean = false;
  @State harmonySynced: boolean = false;
  @State isSyncingHarmony: boolean = false;
  @State showHarmonyDrawer: boolean = false;
  @State harmonyConnectionPhase: string = 'idle';
  private wsUtil: WsUtil = new WsUtil();

  async aboutToAppear(): Promise<void> {
    HttpUtil.setDemoMode(this.apiConfig.demoMode);
    HttpUtil.setBaseUrl(this.apiConfig.endpoint);
    WsUtil.configure({ baseUrl: this.apiConfig.endpoint });
    await this.loadInitialState();
    this.setupWebSocket();
  }

  private async loadInitialState(): Promise<void> {
    if (this.apiConfig.demoMode || !this.apiConfig.apiKey) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const state = await HttpUtil.get<AppParams>('/api/state');
      this.appParams = state;
    } catch (err) {
      this.errorMessage = '加载状态失败，请检查网络连接';
      if (err instanceof HttpError) {
        console.error('Failed to fetch state:', `Status ${err.code}: ${err.message}`);
      } else {
        console.error('Failed to fetch state:', JSON.stringify(err));
      }
    } finally {
      this.isLoading = false;
    }
  }

  private setupWebSocket(): void {
    this.wsUtil.onStateChange((state: string) => {
      this.wsConnectionState = state;
    });
    this.wsUtil.connect(
      (data: string) => {
        try {
          const msg: ChatMessage = JSON.parse(data) as ChatMessage;
          this.chatMessages = [...this.chatMessages, msg];
        } catch (err) {
          console.error('Failed to parse message:', JSON.stringify(err));
        }
      },
      (err: BusinessError) => {
        console.error('WebSocket error:', JSON.stringify(err));
      },
      (harmonyMsg: HarmonyWsMessage) => {
        // Handle harmony-specific WebSocket messages
        console.info('Harmony WS message:', JSON.stringify(harmonyMsg));
        if (harmonyMsg.type === 'data_received' && harmonyMsg.payload) {
          console.info('Data received from device:', harmonyMsg.deviceId);
        }
      }
    );
  }

  aboutToDisappear(): void {
    this.wsUtil.close();
    // Sync state to backend before closing
    const runCache: RunCache = {
      state: this.appParams,
      matchedRobots: this.robotMatches,
      clinicalDoc: this.clinicalPlanDoc,
      bpDoc: this.businessPlanDoc,
      harmonySynced: this.harmonySynced
    };
    HttpUtil.syncState(runCache);
  }

  private sendMessage(): void {
    if (!this.inputMessage.trim()) {
      return;
    }
    const message = this.inputMessage.trim();
    this.wsUtil.send(message);
    this.chatMessages = [...this.chatMessages, { sender: 'user', text: message }];
    this.inputMessage = '';
  }

  private handleNavigate(tabIndex: number, sectionKey?: string): void {
    this.currentTabIndex = tabIndex;
  }

  private saveApiConfig(): void {
    HttpUtil.setBaseUrl(this.apiConfig.endpoint);
    HttpUtil.setApiKey(this.apiConfig.apiKey);
    HttpUtil.setApiProvider(this.apiConfig.provider);
    HttpUtil.setDemoMode(this.apiConfig.demoMode);
    WsUtil.configure({ baseUrl: this.apiConfig.endpoint });
    WsUtil.setApiKey(this.apiConfig.apiKey);
    this.wsUtil.reconnect();
  }

  private async refreshPlan(): Promise<void> {
    await this.loadInitialState();
  }

  private async refreshMatch(): Promise<void> {
    try {
      this.robotMatches = await HttpUtil.matchScenarios(this.appParams);
    } catch (err) {
      console.error('Match refresh failed:', JSON.stringify(err));
    }
  }

  private selectPresetPaper(index: number): void {
    if (index >= 0 && index < PRESET_PAPERS.length) {
      this.appParams = PRESET_PAPERS[index].params;
      this.pipelineStep = 0;
      this.clinicalPlanDoc = '';
      this.businessPlanDoc = '';
      HttpUtil.syncState(this.appParams);
    }
  }

  private uploadPaper(): void {
    const documentSelectOptions = new picker.DocumentSelectOptions();
    documentSelectOptions.maxSelectNumber = 1;
    const documentViewPicker = new picker.DocumentViewPicker();
    documentViewPicker.select(documentSelectOptions).then((uris: string[]) => {
      if (uris.length > 0) {
        this.analyzeFile(uris[0]);
      }
    }).catch((err: BusinessError) => {
      console.error('File picker error:', JSON.stringify(err));
    });
  }

  private async analyzeFile(uri: string): Promise<void> {
    this.isAnalyzing = true;
    try {
      const content = fileIo.readTextSync(uri);
      const fileName = uri.substring(uri.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, '');
      const result = await HttpUtil.analyzePaper(fileName, content);
      if (result.state) {
        this.appParams = result.state;
        this.pipelineStep = 1;
      }
      if (result.rag_references) {
        this.ragReferences = result.rag_references;
      }
      if (result.status === 'warning') {
        this.errorMessage = result.reason || '论文验证未通过';
      }
    } catch (err) {
      console.error('Paper analysis failed:', JSON.stringify(err));
      this.errorMessage = '论文分析失败，请重试';
    } finally {
      this.isAnalyzing = false;
    }
  }

  private async runPipeline(): Promise<void> {
    if (!this.appParams.paper_title) {
      this.errorMessage = '请先选择或上传论文';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    try {
      // Step 1: Match scenarios
      this.pipelineStep = 1;
      console.info('runPipeline: step 1 - matchScenarios, endpoint=' + this.apiConfig.endpoint);
      this.robotMatches = await HttpUtil.matchScenarios(this.appParams);

      // Step 2: Generate docs
      this.pipelineStep = 2;
      console.info('runPipeline: step 2 - generateDocs');
      const docs = await HttpUtil.generateDocs(this.appParams);
      this.clinicalPlanDoc = docs.clinicalDoc;
      this.businessPlanDoc = docs.bpDoc;

      // Sync state to backend
      console.info('runPipeline: step 3 - syncState');
      await HttpUtil.syncState(this.appParams);
      this.pipelineStep = 3;
      promptAction.openToast({ message: '执行成功', duration: 2000 });
    } catch (err) {
      const errMsg = JSON.stringify(err);
      console.error('Pipeline failed at step ' + this.pipelineStep + ':', errMsg);
      let detail = `步骤${this.pipelineStep + 1}失败: `;
      if (err instanceof HttpError) {
        detail += `${err.message}`;
      } else if (err instanceof Error) {
        detail += err.message;
      } else {
        detail += '工作流执行失败';
      }
      if (detail.includes('connect') || detail.includes('timeout') || detail.includes('Network')) {
        detail += '，请检查后端服务是否启动及API端点: ' + this.apiConfig.endpoint;
      }
      this.errorMessage = detail;
    } finally {
      this.isLoading = false;
    }
  }

  private async downloadDoc(docType: string): Promise<void> {
    // Use system share/save dialog
    const content = docType === 'clinical' ? this.clinicalPlanDoc : this.businessPlanDoc;
    if (!content) {
      return;
    }
    try {
      const fileName = docType === 'clinical' ? '临床方案.md' : '商业计划.md';
      // Write to app cache and open with system viewer
      const context = this.getUIContext().getHostContext()!;
      const filePath = context.cacheDir + '/' + fileName;
      const file = fileIo.openSync(filePath, fileIo.OpenMode.CREATE | fileIo.OpenMode.WRITE_ONLY);
      fileIo.writeSync(file.fd, content);
      fileIo.closeSync(file);
      console.info('Document saved to: ' + filePath);
      this.errorMessage = fileName + ' 已保存';
    } catch (err) {
      console.error('Save document failed:', JSON.stringify(err));
    }
  }

  private async searchKnowledge(): Promise<void> {
    try {
      const refs = await HttpUtil.get<RAGReference[]>(`/api/knowledge/search?query=${this.knowledgeQuery}`);
      this.ragReferences = refs;
    } catch (err) {
      console.error('Knowledge search failed:', JSON.stringify(err));
    }
  }

  private handleSyncHarmony(): void {
    this.harmonySynced = true;
    this.isSyncingHarmony = false;
  }

  private handleDisconnectHarmony(): void {
    this.harmonySynced = false;
    this.isSyncingHarmony = false;
  }

  private handleHarmonyPushData(deviceId: string, data: object): void {
    interface HarmonyPushMessage { type: string; device_id: string; payload: object; }
    const pushMsg: HarmonyPushMessage = {
      type: 'send_data',
      device_id: deviceId,
      payload: data
    };
    this.wsUtil.sendJson(pushMsg);
  }

  private getTopBarTitle(): string {
    switch (this.currentTabIndex) {
      case 0: return '云脉·智慧医疗';
      case 1: return '机器人匹配';
      case 2: return '知识库';
      case 3: return '设置';
      default: return '云脉';
    }
  }

  @Builder PlanTabPill() {
    Column() {
      Text('方案')
        .fontSize(14)
        .fontWeight(this.currentTabIndex === 0 ? FontWeight.Medium : FontWeight.Normal)
        .fontColor(this.currentTabIndex === 0 ? Color.White : '#999999')
        .padding({ left: 14, right: 14, top: 6, bottom: 6 })
        .borderRadius(16)
        .backgroundColor(this.currentTabIndex === 0 ? '#007DFF' : Color.Transparent)
        .animation({ duration: 200, curve: Curve.EaseInOut })
    }
    .padding({ bottom: 34 })
  }

  @Builder MatchTabPill() {
    Column() {
      Text('匹配')
        .fontSize(14)
        .fontWeight(this.currentTabIndex === 1 ? FontWeight.Medium : FontWeight.Normal)
        .fontColor(this.currentTabIndex === 1 ? Color.White : '#999999')
        .padding({ left: 14, right: 14, top: 6, bottom: 6 })
        .borderRadius(16)
        .backgroundColor(this.currentTabIndex === 1 ? '#007DFF' : Color.Transparent)
        .animation({ duration: 200, curve: Curve.EaseInOut })
    }
    .padding({ bottom: 34 })
  }

  @Builder KnowledgeTabPill() {
    Column() {
      Text('知识库')
        .fontSize(14)
        .fontWeight(this.currentTabIndex === 2 ? FontWeight.Medium : FontWeight.Normal)
        .fontColor(this.currentTabIndex === 2 ? Color.White : '#999999')
        .padding({ left: 14, right: 14, top: 6, bottom: 6 })
        .borderRadius(16)
        .backgroundColor(this.currentTabIndex === 2 ? '#007DFF' : Color.Transparent)
        .animation({ duration: 200, curve: Curve.EaseInOut })
    }
    .padding({ bottom: 34 })
  }

  @Builder SettingsTabPill() {
    Column() {
      Text('设置')
        .fontSize(14)
        .fontWeight(this.currentTabIndex === 3 ? FontWeight.Medium : FontWeight.Normal)
        .fontColor(this.currentTabIndex === 3 ? Color.White : '#999999')
        .padding({ left: 14, right: 14, top: 6, bottom: 6 })
        .borderRadius(16)
        .backgroundColor(this.currentTabIndex === 3 ? '#007DFF' : Color.Transparent)
        .animation({ duration: 200, curve: Curve.EaseInOut })
    }
    .padding({ bottom: 34 })
  }

  build() {
    Stack() {
    SideBarContainer(SideBarContainerType.Overlay) {
      DrawerMenu({
        showDrawer: this.showDrawer,
        onNavigate: (tabIndex: number, sectionKey?: string) => {
          this.handleNavigate(tabIndex, sectionKey);
        }
      })

      Column() {
        // Unified top bar
        Row() {
          Text(this.getTopBarTitle())
            .fontSize(17)
            .fontWeight(600)
            .fontColor('#182431')
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({ left: 16, right: 16, top: 8, bottom: 8 })
        .margin({ top: 44 })
        .backgroundColor('#F1F3F5')

        if (this.errorMessage) {
          Row() {
            Text('错误: ' + this.errorMessage)
              .fontSize(14)
              .fontColor('#FFFFFF')
            Blank()
            Button('关闭')
              .fontSize(14)
              .backgroundColor(Color.Transparent)
              .fontColor('#FFFFFF')
              .onClick(() => { this.errorMessage = ''; })
          }
          .width('100%')
          .padding({ left: 12, right: 12, top: 8, bottom: 8 })
          .backgroundColor('#FF4444')
        }

        if (this.isLoading) {
          Row() {
            Progress({ value: 0, type: ProgressType.Linear })
              .width(120)
              .color('#007DFF')
            Text('加载中...')
              .fontSize(14)
              .fontColor('#666666')
              .margin({ left: 8 })
          }
          .width('100%')
          .padding(8)
          .justifyContent(FlexAlign.Center)
        }

        Tabs({ barPosition: BarPosition.End, index: this.currentTabIndex }) {
          TabContent() {
            PlanTab({
              appParams: this.appParams,
              chatMessages: this.chatMessages,
              inputMessage: this.inputMessage,
              clinicalPlanDoc: this.clinicalPlanDoc,
              businessPlanDoc: this.businessPlanDoc,
              wsConnected: this.wsConnectionState === 'connected',
              pipelineStep: this.pipelineStep,
              isAnalyzing: this.isAnalyzing,
              isTablet: this.isTablet,
              onSendMessage: () => { this.sendMessage(); },
              onQuickReply: (text: string) => {
                this.inputMessage = text;
                this.sendMessage();
              },
              onSelectPresetPaper: (index: number) => { this.selectPresetPaper(index); },
              onUploadPaper: () => { this.uploadPaper(); },
              onRunPipeline: () => { this.runPipeline(); },
              onDownloadDoc: (docType: string) => { this.downloadDoc(docType); },
              onRefreshPlan: () => { this.refreshPlan(); }
            })
          }
          .tabBar(this.PlanTabPill)

          TabContent() {
            MatchTab({
              robotMatches: this.robotMatches,
              onRefreshMatch: () => { this.refreshMatch(); }
            })
          }
          .tabBar(this.MatchTabPill)

          TabContent() {
            KnowledgeTab({
              ragReferences: this.ragReferences,
              auditLogs: this.auditLogs,
              knowledgeQuery: this.knowledgeQuery,
              onQueryChange: (v: string) => { this.knowledgeQuery = v; },
              onSearch: () => { this.searchKnowledge(); }
            })
          }
          .tabBar(this.KnowledgeTabPill)

          TabContent() {
            SettingsTab({
              benchmarkData: this.benchmarkData,
              cicdPipelines: this.cicdPipelines,
              devLogs: this.devLogs,
              apiConfig: $apiConfig,
              showOverlay: $showOverlay,
              ragReferenceCount: this.ragReferences.length,
              onSaveApiConfig: () => { this.saveApiConfig(); }
            })
          }
          .tabBar(this.SettingsTabPill)
        }
        .vertical(false)
        .barBackgroundColor(Color.Transparent)
        .animationDuration(300)
        .onChange((index: number) => {
          this.currentTabIndex = index;
        })
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#F1F3F5')
      .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
      .onAreaChange((oldValue: Area, newValue: Area) => {
        const widthVp = newValue.width as number;
        this.isTablet = widthVp >= 720;
      })
    }
    .sideBarWidth('70%')
    .showSideBar(this.showDrawer)
    .autoHide(true)
    .onChange((isBarShow: boolean) => {
      this.showDrawer = isBarShow;
    })

      // FAB — 鸿蒙协同入口
      if (!this.showHarmonyDrawer) {
        Button() {
          Text('⟐')
            .fontSize(24)
            .fontColor(Color.White)
        }
        .width(56)
        .height(56)
        .borderRadius(28)
        .backgroundColor('#007DFF')
        .shadow({ radius: 12, color: 'rgba(0,125,255,0.35)', offsetY: 4 })
        .position({ right: 20, bottom: 80 })
        .onClick(() => {
          this.showHarmonyDrawer = true;
        })
      }

      // HarmonyDrawer overlay
      if (this.showHarmonyDrawer) {
        HarmonyDrawer({
          isOpen: this.showHarmonyDrawer,
          onClose: () => { this.showHarmonyDrawer = false; },
          paperTitle: this.appParams.paper_title,
          domain: this.appParams.domain,
          targetDepartment: this.appParams.target_department,
          ragCount: this.ragReferences.length,
          harmonySynced: $harmonySynced,
          isSyncingHarmony: $isSyncingHarmony,
          onSyncHarmony: () => { this.handleSyncHarmony(); },
          onDisconnectHarmony: () => { this.handleDisconnectHarmony(); },
          onPushData: (deviceId: string, data: object) => {
            this.handleHarmonyPushData(deviceId, data);
          }
        })
      }
    }
  }
}
