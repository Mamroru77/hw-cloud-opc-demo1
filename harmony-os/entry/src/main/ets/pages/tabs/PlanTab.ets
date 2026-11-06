import { AppParams, ChatMessage, PRESET_PAPERS, PresetPaper } from '../../utils/Types';
import { ChatPanel } from '../components/ChatPanel';

@Component
export struct PlanTab {
  @Link appParams: AppParams;
  @Link chatMessages: ChatMessage[];
  @Link inputMessage: string;
  @Link clinicalPlanDoc: string;
  @Link businessPlanDoc: string;
  @Prop wsConnected: boolean = false;
  @Prop pipelineStep: number = 0;
  @Prop isAnalyzing: boolean = false;
  @Prop isTablet: boolean = false;
  onSendMessage: () => void = () => {};
  onQuickReply: (text: string) => void = () => {};
  onSelectPresetPaper: (index: number) => void = () => {};
  onUploadPaper: () => void = () => {};
  onRunPipeline: () => void = () => {};
  onDownloadDoc: (docType: string) => void = () => {};
  @State isRefreshing: boolean = false;
  onRefreshPlan: () => void = () => {};

  build() {
    Refresh({ refreshing: $$this.isRefreshing }) {
    Scroll() {
      if (this.isTablet) {
        Row() {
          Column({ space: 16 }) {
            this.buildWorkflowCard()
            this.buildPaperUploadCard()
            this.buildPresetPapersCard()
            this.buildPaperParamsCard()
            ChatPanel({
              chatMessages: this.chatMessages,
              inputMessage: this.inputMessage,
              wsConnected: this.wsConnected,
              onInputChange: (value: string) => { this.inputMessage = value; },
              onSend: () => { this.onSendMessage(); },
              onQuickReply: (text: string) => { this.onQuickReply(text); }
            })
          }
          .layoutWeight(1)
          .padding({ top: 16, left: 16, right: 8, bottom: 48 })

          Column({ space: 16 }) {
            this.buildPlanSummaryCard()
            this.buildClinicalPlanCard()
            this.buildBusinessPlanCard()
          }
          .layoutWeight(1)
          .padding({ top: 16, left: 8, right: 16, bottom: 48 })
        }
        .alignItems(VerticalAlign.Top)
      } else {
        Column({ space: 16 }) {
          this.buildWorkflowCard()
          this.buildPaperUploadCard()
          this.buildPresetPapersCard()
          this.buildPaperParamsCard()
          ChatPanel({
            chatMessages: this.chatMessages,
            inputMessage: this.inputMessage,
            wsConnected: this.wsConnected,
            onInputChange: (value: string) => { this.inputMessage = value; },
            onSend: () => { this.onSendMessage(); },
            onQuickReply: (text: string) => { this.onQuickReply(text); }
          })
          this.buildPlanSummaryCard()
          this.buildClinicalPlanCard()
          this.buildBusinessPlanCard()
        }
        .width('100%')
        .padding({ top: 16, left: 16, right: 16, bottom: 48 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F1F3F5')
    }
    .onRefreshing(() => {
      this.isRefreshing = true;
      this.onRefreshPlan();
      setTimeout(() => { this.isRefreshing = false; }, 1000);
    })
  }

  @Builder buildStepItem(step: number, label: string) {
    Column() {
      Row() {
        Text((step + 1).toString())
          .fontSize(14)
          .fontWeight(this.pipelineStep >= step ? 600 : 400)
          .fontColor('#FFFFFF')
      }
      .width(28)
      .height(28)
      .borderRadius(14)
      .backgroundColor(this.pipelineStep >= step ? '#007DFF' : '#CCCCCC')
      .justifyContent(FlexAlign.Center)

      Text(label)
        .fontSize(11)
        .fontColor(this.pipelineStep >= step ? '#007DFF' : '#999999')
        .margin({ top: 4 })
    }
    .alignItems(HorizontalAlign.Center)
  }

  @Builder buildStepConnector(step: number) {
    Row()
      .width(24)
      .height(2)
      .backgroundColor(this.pipelineStep > step ? '#007DFF' : '#E0E0E0')
      .margin({ top: -12 })
  }

  @Builder buildParamChip(label: string, value: string) {
    Column() {
      Text(label)
        .fontSize(10)
        .fontColor('#999999')
      Text(value)
        .fontSize(13)
        .fontColor('#333333')
        .margin({ top: 2 })
        .maxLines(1)
    }
    .padding({ top: 8, bottom: 8, left: 12, right: 12 })
    .borderRadius(8)
    .backgroundColor('#F8F9FA')
    .layoutWeight(1)
  }

  @Builder buildWorkflowCard() {
    Column() {
      Row() {
        Text('工作流')
          .fontSize(18)
          .fontWeight(600)
          .fontColor('#182431')
          .layoutWeight(1)
        Button('执行')
          .fontSize(13)
          .height(32)
          .padding({ left: 16, right: 16 })
          .backgroundColor(this.isAnalyzing ? '#CCCCCC' : '#007DFF')
          .fontColor(Color.White)
          .borderRadius(16)
          .enabled(!this.isAnalyzing)
          .onClick(() => { this.onRunPipeline(); })
      }
      .width('100%')
      .margin({ bottom: 14 })

      Row({ space: 0 }) {
        this.buildStepItem(0, '技术理解')
        this.buildStepConnector(0)
        this.buildStepItem(1, '场景匹配')
        this.buildStepConnector(1)
        this.buildStepItem(2, '执行输出')
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }

  @Builder buildPaperUploadCard() {
    Column() {
      Text('论文上传')
        .fontSize(18)
        .fontWeight(600)
        .fontColor('#182431')
        .margin({ bottom: 12 })

      Column() {
        Text('点击选择论文文件 (PDF/MD/TXT)')
          .fontSize(14)
          .fontColor('#007DFF')
          .margin({ bottom: 4 })
        Text('上传后将自动提取论文参数')
          .fontSize(12)
          .fontColor('#999999')
      }
      .width('100%')
      .padding({ top: 20, bottom: 20 })
      .border({ width: 2, color: '#E0E0E0', style: BorderStyle.Dashed })
      .borderRadius(8)
      .onClick(() => { this.onUploadPaper(); })

      if (this.isAnalyzing) {
        Row() {
          LoadingProgress()
            .width(16)
            .height(16)
            .color('#007DFF')
          Text('正在分析论文...')
            .fontSize(14)
            .fontColor('#666666')
            .margin({ left: 8 })
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .margin({ top: 12 })
      }
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }

  @Builder buildPresetPapersCard() {
    Column() {
      Text('预设论文')
        .fontSize(18)
        .fontWeight(600)
        .fontColor('#182431')
        .margin({ bottom: 12 })

      List({ space: 8 }) {
        ForEach(PRESET_PAPERS, (paper: PresetPaper, index: number) => {
          ListItem() {
            Column() {
              Row() {
                Text(paper.title)
                  .fontSize(14)
                  .fontColor('#333333')
                  .fontWeight(500)
                  .layoutWeight(1)
              }
              .width('100%')
              Row() {
                Text(paper.domain + ' · ' + paper.year.toString())
                  .fontSize(12)
                  .fontColor('#999999')
                Blank()
                Text(paper.recommend)
                  .fontSize(12)
                  .fontColor('#10B981')
              }
              .width('100%')
              .margin({ top: 4 })
            }
            .width('100%')
            .padding(12)
            .borderRadius(8)
            .backgroundColor(this.appParams.paper_title === paper.title ? '#F0F7FF' : '#F8F9FA')
            .onClick(() => { this.onSelectPresetPaper(index); })
          }
        }, (paper: PresetPaper, index: number) => paper.id)
      }
      .width('100%')
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }

  @Builder buildPaperParamsCard() {
    Column() {
      Row() {
        Text('论文参数')
          .fontSize(18)
          .fontWeight(600)
          .fontColor('#182431')
        Text('  ·  提取自论文')
          .fontSize(12)
          .fontColor('#999999')
      }
      .margin({ bottom: 14 })

      Column({ space: 10 }) {
        Text('基本信息')
          .fontSize(14)
          .fontColor('#999999')
          .fontWeight(500)
          .margin({ bottom: 2 })

        TextInput({ text: this.appParams.paper_title, placeholder: '论文标题' })
          .width('100%')
          .height(44)
          .borderRadius(8)
          .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
          .fontSize(13)
          .onChange((v: string) => { this.appParams.paper_title = v; })

        Row({ space: 8 }) {
          TextInput({ text: this.appParams.domain, placeholder: '领域（devices/drugs/ai/surgical）' })
            .layoutWeight(1)
            .height(44)
            .borderRadius(8)
            .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
            .fontSize(13)
            .onChange((v: string) => { this.appParams.domain = v; })
          TextInput({ text: this.appParams.target_department, placeholder: '目标科室' })
            .layoutWeight(1)
            .height(44)
            .borderRadius(8)
            .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
            .fontSize(13)
            .onChange((v: string) => { this.appParams.target_department = v; })
        }
        .width('100%')
      }

      Divider()
        .strokeWidth(0.5)
        .color('#F0F0F0')
        .margin({ top: 14, bottom: 14 })

      Column({ space: 10 }) {
        Text('临床信息')
          .fontSize(14)
          .fontColor('#999999')
          .fontWeight(500)
          .margin({ bottom: 2 })

        Row({ space: 8 }) {
          TextInput({ text: this.appParams.target, placeholder: '靶点' })
            .layoutWeight(1)
            .height(44)
            .borderRadius(8)
            .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
            .fontSize(13)
            .onChange((v: string) => { this.appParams.target = v; })
          TextInput({ text: this.appParams.indication, placeholder: '适应症' })
            .layoutWeight(1)
            .height(44)
            .borderRadius(8)
            .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
            .fontSize(13)
            .onChange((v: string) => { this.appParams.indication = v; })
        }
        .width('100%')

        Row({ space: 8 }) {
          TextInput({ text: this.appParams.primary_endpoint, placeholder: '主要终点' })
            .layoutWeight(1)
            .height(44)
            .borderRadius(8)
            .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
            .fontSize(13)
            .onChange((v: string) => { this.appParams.primary_endpoint = v; })
          TextInput({ text: this.appParams.safety_endpoint, placeholder: '安全性终点' })
            .layoutWeight(1)
            .height(44)
            .borderRadius(8)
            .placeholderColor('#B0B0B0').placeholderFont({ size: 12 })
            .fontSize(13)
            .onChange((v: string) => { this.appParams.safety_endpoint = v; })
        }
        .width('100%')
      }
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }

  @Builder buildPlanSummaryCard() {
    Column() {
      Text('方案摘要')
        .fontSize(18)
        .fontWeight(600)
        .fontColor('#182431')
        .margin({ bottom: 12 })

      if (this.appParams.paper_title) {
        Text(this.appParams.paper_title)
          .fontSize(15)
          .fontColor('#333333')
          .fontWeight(500)
          .margin({ bottom: 10 })
        Row({ space: 12 }) {
          this.buildParamChip('领域', this.appParams.domain)
          this.buildParamChip('科室', this.appParams.target_department)
        }
        .margin({ bottom: 8 })
        Row({ space: 12 }) {
          this.buildParamChip('靶点', this.appParams.target || '-')
          this.buildParamChip('适应症', this.appParams.indication || '-')
        }
        .margin({ bottom: 8 })
        Row({ space: 12 }) {
          this.buildParamChip('终点', this.appParams.primary_endpoint || '-')
          this.buildParamChip('安全性', this.appParams.safety_endpoint || '-')
        }
      } else {
        Column() {
          Text('暂无方案')
            .fontSize(14)
            .fontColor('#CCCCCC')
          Text('请选择预设论文或上传论文')
            .fontSize(12)
            .fontColor('#E0E0E0')
            .margin({ top: 8 })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .padding({ top: 20, bottom: 20 })
      }
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }

  @Builder buildClinicalPlanCard() {
    Column() {
      Row() {
        Text('临床方案')
          .fontSize(18)
          .fontWeight(600)
          .fontColor('#182431')
          .layoutWeight(1)
        if (this.clinicalPlanDoc) {
          Button('导出')
            .fontSize(12)
            .height(28)
            .backgroundColor('#007DFF')
            .fontColor('#FFFFFF')
            .onClick(() => { this.onDownloadDoc('clinical'); })
        }
      }
      .width('100%')
      .margin({ bottom: 12 })

      if (this.clinicalPlanDoc) {
        Text(this.clinicalPlanDoc)
          .fontSize(13)
          .fontColor('#333333')
          .lineHeight(20)
          .width('100%')
      } else {
        Column() {
          Text('暂无临床方案')
            .fontSize(14)
            .fontColor('#CCCCCC')
          Text('请先执行工作流')
            .fontSize(12)
            .fontColor('#E0E0E0')
            .margin({ top: 8 })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .padding({ top: 20, bottom: 20 })
      }
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }

  @Builder buildBusinessPlanCard() {
    Column() {
      Row() {
        Text('商业计划')
          .fontSize(18)
          .fontWeight(600)
          .fontColor('#182431')
          .layoutWeight(1)
        if (this.businessPlanDoc) {
          Button('导出')
            .fontSize(12)
            .height(28)
            .backgroundColor('#007DFF')
            .fontColor('#FFFFFF')
            .onClick(() => { this.onDownloadDoc('business'); })
        }
      }
      .width('100%')
      .margin({ bottom: 12 })

      if (this.businessPlanDoc) {
        Text(this.businessPlanDoc)
          .fontSize(13)
          .fontColor('#333333')
          .lineHeight(20)
          .width('100%')
      } else {
        Column() {
          Text('暂无商业计划')
            .fontSize(14)
            .fontColor('#CCCCCC')
          Text('请先执行工作流')
            .fontSize(12)
            .fontColor('#E0E0E0')
            .margin({ top: 8 })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .padding({ top: 20, bottom: 20 })
      }
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }
}
