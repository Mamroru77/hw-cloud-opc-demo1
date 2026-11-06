import { BenchmarkEntry, CICDPipeline, DevLogEntry, ApiConfig, MODEL_PROVIDERS } from '../../utils/Types';

@Component
export struct SettingsTab {
  @Link benchmarkData: BenchmarkEntry[];
  @Link cicdPipelines: CICDPipeline[];
  @Link devLogs: DevLogEntry[];
  @Link apiConfig: ApiConfig;
  @Link showOverlay: boolean;
  @Prop ragReferenceCount: number = 0;
  onSaveApiConfig: () => void = () => {};
  @State isRefreshing: boolean = false;
  @State savedFeedback: boolean = false;
  @State selectedProviderIndex: number = 0;

  aboutToAppear(): void {
    const idx = MODEL_PROVIDERS.indexOf(this.apiConfig.provider);
    this.selectedProviderIndex = idx >= 0 ? idx : 0;
  }

  build() {
    Refresh({ refreshing: $$this.isRefreshing }) {
      Scroll() {
      Column({ space: 16 }) {
        // API Configuration
        Column() {
          Text('API 配置')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          TextInput({ placeholder: 'API 端点 (如 http://192.168.1.101:8000)', text: this.apiConfig.endpoint })
            .fontSize(13)
            .margin({ bottom: 10 })
            .onChange((value: string) => {
              this.apiConfig.endpoint = value;
            })

          Text('模型提供商')
            .fontSize(14)
            .fontColor('#666666')
            .margin({ bottom: 8 })

          Select([{ value: 'OpenAI' }, { value: 'DeepSeek' }, { value: '通义千问' }, { value: '文心一言' }, { value: '智谱GLM' }, { value: 'Moonshot' }])
            .selected(this.selectedProviderIndex)
            .value(this.apiConfig.provider)
            .width('100%')
            .margin({ bottom: 10 })
            .onSelect((index: number, value?: string) => {
              this.selectedProviderIndex = index;
              if (value) {
                this.apiConfig.provider = value;
              }
            })

          Row() {
            Text('Demo 模式 (离线演示)')
              .fontSize(13)
              .fontColor('#333333')
              .layoutWeight(1)
            Toggle({ type: ToggleType.Switch, isOn: this.apiConfig.demoMode })
              .onChange((isOn: boolean) => {
                this.apiConfig.demoMode = isOn;
              })
          }
          .width('100%')
          .margin({ bottom: 12 })

          TextInput({ placeholder: 'API 密钥', text: this.apiConfig.apiKey })
            .fontSize(13)
            .type(InputType.Password)
            .margin({ bottom: 12 })
            .onChange((value: string) => {
              this.apiConfig.apiKey = value;
            })

          Row() {
            Circle({ width: 8, height: 8 })
              .fill(this.savedFeedback ? '#10B981' : (this.apiConfig.apiKey ? '#10B981' : '#CCCCCC'))
            Text(this.savedFeedback ? '保存成功' : (this.apiConfig.apiKey ? '已配置' : '未配置'))
              .fontSize(12)
              .fontColor(this.savedFeedback ? '#10B981' : (this.apiConfig.apiKey ? '#10B981' : '#999999'))
              .margin({ left: 6 })
            Blank()
            Button('保存配置')
              .fontSize(14)
              .onClick(() => {
                this.onSaveApiConfig();
                this.savedFeedback = true;
                setTimeout(() => { this.savedFeedback = false; }, 2000);
              })
          }
          .width('100%')
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // CI/CD Panel
        Column() {
          Text('CI/CD 面板')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          if (this.cicdPipelines.length === 0) {
            Text('暂无 CI/CD 流水线')
              .fontSize(14)
              .fontColor('#CCCCCC')
              .width('100%')
              .textAlign(TextAlign.Center)
              .padding({ top: 16, bottom: 16 })
          } else {
            List({ space: 8 }) {
              ForEach(this.cicdPipelines, (pipeline: CICDPipeline, index: number) => {
                ListItem() {
                  Column() {
                    Row() {
                      Text(pipeline.name)
                        .fontSize(14)
                        .fontColor('#333333')
                        .fontWeight(500)
                        .layoutWeight(1)
                      Text(pipeline.status)
                        .fontSize(12)
                        .fontColor(pipeline.status === 'success' ? '#10B981' : '#FF4D4F')
                    }
                    .width('100%')
                    Text(pipeline.stage)
                      .fontSize(12)
                      .fontColor('#999999')
                      .margin({ top: 4 })
                  }
                  .width('100%')
                  .padding(12)
                  .borderRadius(8)
                  .backgroundColor('#F8F9FA')
                }
              }, (pipeline: CICDPipeline, index: number) => `${index}`)
            }
            .width('100%')
          }
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // Dev Logs
        Column() {
          Text('开发日志')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          if (this.devLogs.length === 0) {
            Text('暂无开发日志')
              .fontSize(14)
              .fontColor('#CCCCCC')
              .width('100%')
              .textAlign(TextAlign.Center)
              .padding({ top: 16, bottom: 16 })
          } else {
            List({ space: 8 }) {
              ForEach(this.devLogs, (log: DevLogEntry, index: number) => {
                ListItem() {
                  Column() {
                    Text(log.title)
                      .fontSize(14)
                      .fontColor('#333333')
                      .fontWeight(500)
                    Text(log.content)
                      .fontSize(12)
                      .fontColor('#666666')
                      .margin({ top: 4 })
                      .maxLines(2)
                    Text(log.timestamp)
                      .fontSize(12)
                      .fontColor('#999999')
                      .margin({ top: 2 })
                  }
                  .width('100%')
                  .padding(12)
                  .borderRadius(8)
                  .backgroundColor('#F8F9FA')
                }
              }, (log: DevLogEntry, index: number) => `${index}`)
            }
            .width('100%')
          }
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // Benchmark
        Column() {
          Text('模型性能基准')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          if (this.benchmarkData.length === 0) {
            Text('暂无基准数据')
              .fontSize(14)
              .fontColor('#CCCCCC')
              .width('100%')
              .textAlign(TextAlign.Center)
              .padding({ top: 16, bottom: 16 })
          } else {
            List({ space: 8 }) {
              ForEach(this.benchmarkData, (entry: BenchmarkEntry, index: number) => {
                ListItem() {
                  Row() {
                    Text(entry.model_name)
                      .fontSize(14)
                      .fontColor('#333333')
                      .layoutWeight(1)
                    Text(entry.avg_latency_ms + 'ms')
                      .fontSize(12)
                      .fontColor('#666666')
                    Text(entry.accuracy_score + '%')
                      .fontSize(12)
                      .fontColor('#10B981')
                      .margin({ left: 8 })
                  }
                  .width('100%')
                  .padding(12)
                  .borderRadius(8)
                  .backgroundColor('#F8F9FA')
                }
              }, (entry: BenchmarkEntry, index: number) => `${index}`)
            }
            .width('100%')
          }
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // Widget status card
        Column() {
          Text('实时同步状态')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          Row() {
            Column() {
              Text('模型状态')
                .fontSize(12)
                .fontColor('#666666')
              Text('已连接')
                .fontSize(18)
                .fontColor('#10B981')
                .fontWeight(600)
                .margin({ top: 4 })
            }
            .layoutWeight(1)

            Column() {
              Text('知识库条目')
                .fontSize(12)
                .fontColor('#666666')
              Text(this.ragReferenceCount + '条')
                .fontSize(18)
                .fontColor('#007DFF')
                .fontWeight(600)
                .margin({ top: 4 })
            }
            .layoutWeight(1)
          }
          .width('100%')
          .padding(16)

          Row() {
            Text('浮层显示')
              .fontSize(14)
              .fontColor('#333333')
            Blank()
            Toggle({ type: ToggleType.Switch, isOn: this.showOverlay })
              .onChange((isOn: boolean) => { this.showOverlay = isOn; })
          }
          .width('100%')
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)
      }
      .width('100%')
      .padding({ top: 16, left: 16, right: 16, bottom: 48 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F1F3F5')
    }
    .onRefreshing(() => {
      this.isRefreshing = true;
      setTimeout(() => { this.isRefreshing = false; }, 1000);
    })
  }
}
