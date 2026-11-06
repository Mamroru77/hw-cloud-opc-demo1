// 鸿蒙端云双向协同 — 星闪分布式总线 + NPU 脱敏沙箱 抽屉面板
// 移植自 harmony-web/src/components/HarmonyDrawer.tsx

import { HttpUtil } from '../../utils/HttpUtil';
import { npuSanitize } from '../../utils/NpuSanitizer';
import {
  HarmonyDevice,
  SanitizeResult,
  ConnectionPhase,
  MOCK_HARMONY_DEVICES
} from '../../utils/HarmonyTypes';
import { AppParams, RAGReference } from '../../utils/Types';
import { HarmonyWidget } from './HarmonyWidget';
import { NpuSandboxPanel } from './NpuSandboxPanel';

@Component
export struct HarmonyDrawer {
  @Prop isOpen: boolean = false;
  onClose: () => void = () => {};
  @Prop paperTitle: string = '';
  @Prop domain: string = 'devices';
  @Prop targetDepartment: string = '';
  @Prop ragCount: number = 0;
  @Link harmonySynced: boolean;
  @Link isSyncingHarmony: boolean;
  onSyncHarmony: () => void = () => {};
  onDisconnectHarmony: () => void = () => {};
  onPushData: (deviceId: string, data: object) => void = () => {};
  @State connectionPhase: ConnectionPhase = 'idle';
  @State selectedDevice: HarmonyDevice | null = null;
  @State phaseLogs: string[] = [];
  @State sanitizeResult: SanitizeResult | null = null;

  private addLog(msg: string): void {
    this.phaseLogs = [...this.phaseLogs, msg];
  }

  private domainLabel(): string {
    if (this.domain === 'drugs') return '创新药物';
    if (this.domain === 'ai') return '医疗 SaMD';
    if (this.domain === 'surgical') return '改良术式';
    return '荧光探针';
  }

  private ragScore(): number {
    if (this.ragCount > 0) {
      const score: number = 60 + this.ragCount * 10;
      return score > 95 ? 95 : score;
    }
    return 0;
  }

  private paramCount(): number {
    return 6; // 4 domains all have ~6 key params
  }

  get syncStatus(): string {
    if (this.connectionPhase === 'completed') return 'synced';
    const connecting: boolean = this.connectionPhase === 'discovering' ||
      this.connectionPhase === 'pairing' ||
      this.connectionPhase === 'establishing' ||
      this.connectionPhase === 'sanitizing' ||
      this.connectionPhase === 'pushing';
    if (connecting) return 'syncing';
    return 'offline';
  }

  private isConnecting(): boolean {
    return this.connectionPhase === 'discovering' ||
      this.connectionPhase === 'pairing' ||
      this.connectionPhase === 'establishing' ||
      this.connectionPhase === 'sanitizing' ||
      this.connectionPhase === 'pushing';
  }

  private phaseLabel(): string {
    switch (this.connectionPhase) {
      case 'discovering': return '发现';
      case 'pairing': return '配对';
      case 'establishing': return '建连';
      case 'sanitizing': return '脱敏';
      case 'pushing': return '推流';
      default: return '';
    }
  }

  private async handleStarLinkSync(): Promise<void> {
    this.connectionPhase = 'discovering';
    this.phaseLogs = [];
    this.addLog('[1/5] 星闪设备发现中...');

    try {
      // Discover devices via HTTP (demo mode returns mock)
      const devices: HarmonyDevice[] = await HttpUtil.harmonyDiscover();
      this.addLog(`发现 ${devices.length} 台鸿蒙设备`);

      const targetDevice: HarmonyDevice = devices[0];
      this.selectedDevice = targetDevice;

      // Pair
      this.connectionPhase = 'pairing';
      this.addLog(`[2/5] 正在配对设备: ${targetDevice.deviceName}...`);
      await this.delay(800);
      targetDevice.connectionStatus = 'pairing';
      this.addLog(`设备配对成功: ${targetDevice.deviceName}`);

      // Establish channel
      this.connectionPhase = 'establishing';
      this.addLog('[3/5] 建立星闪通道...');
      await this.delay(600);
      targetDevice.connectionStatus = 'connected';
      this.addLog('星闪通道已建立');

      // NPU sanitize
      this.connectionPhase = 'sanitizing';
      this.addLog('[4/5] 执行NPU端侧脱敏...');

      const dataStr: string = JSON.stringify({
        domain: this.domain,
        target_department: this.targetDepartment,
        paper_title: this.paperTitle,
        rag_count: this.ragCount,
      });

      const result: SanitizeResult = npuSanitize(dataStr);
      this.sanitizeResult = result;
      this.addLog(`脱敏完成: ${result.fieldsSanitized} 字段已替换`);

      // Push data
      this.connectionPhase = 'pushing';
      this.addLog('[5/5] 推流数据至 ' + targetDevice.deviceName + '...');
      await this.delay(400);

      interface PushPayload { sanitized: string; }
      const pushPayload: PushPayload = { sanitized: result.sanitized };
      this.onPushData(targetDevice.deviceId, pushPayload);
      this.addLog('数据已推流至 ' + targetDevice.deviceName);

      // Complete
      this.connectionPhase = 'completed';
      this.harmonySynced = true;
      this.isSyncingHarmony = false;
      this.onSyncHarmony();
    } catch (e) {
      this.addLog('连接异常: ' + JSON.stringify(e));
      this.connectionPhase = 'idle';
      this.isSyncingHarmony = false;
    }
  }

  private handleDisconnect(): void {
    if (this.selectedDevice) {
      this.selectedDevice.connectionStatus = 'disconnected';
    }
    this.connectionPhase = 'idle';
    this.selectedDevice = null;
    this.phaseLogs = [];
    this.sanitizeResult = null;
    this.harmonySynced = false;
    this.isSyncingHarmony = false;
    this.onDisconnectHarmony();
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      setTimeout(() => { resolve(); }, ms);
    });
  }

  build() {
    Column() {
      if (this.isOpen) {
        Stack() {
          // Backdrop
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0,0,0,0.4)')
        .onClick(() => { this.onClose(); })

      // Drawer panel
      Column() {
        // Header
        Row() {
          Row() {
            Text('⟐')
              .fontSize(20)
              .fontColor('#0EA5E9')
            Column() {
              Text('鸿蒙端云双向协同')
                .fontSize(16)
                .fontColor('#182431')
                .fontWeight(FontWeight.Bold)
              Text('Distributed StarLink & NPU Sandbox')
                .fontSize(10)
                .fontColor('#999999')
            }
            .margin({ left: 10 })
          }

          Blank()

          Button('✕')
            .fontSize(18)
            .fontColor('#999999')
            .backgroundColor(Color.Transparent)
            .onClick(() => { this.onClose(); })
        }
        .width('100%')
        .padding({ left: 20, right: 20, top: 20, bottom: 12 })

        Divider().color('#E5E5E5')

        // Scrollable body
        Scroll() {
          Column() {
            // ---- Section A: StarFlash Distributed Bus ----
            Column() {
              // Header row
              Row() {
                Text('星闪分布式总线')
                  .fontSize(12)
                  .fontColor('#007DFF')
                  .backgroundColor('rgba(0,125,255,0.08)')
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .borderRadius(4)

                Blank()

                Row() {
                  Circle({ width: 6, height: 6 })
                    .fill(this.connectionPhase === 'completed' ? '#10B981' : '#999999')
                  Text(this.connectionPhase === 'completed' ? '已绑定投屏' : 'NearLink 就绪')
                    .fontSize(10)
                    .fontColor(this.connectionPhase === 'completed' ? '#10B981' : '#999999')
                    .margin({ left: 4 })
                }
              }
              .width('100%')
              .margin({ bottom: 10 })

              // Disclaimer
              Row() {
                Text(this.connectionPhase === 'completed' ? '◉' : '○')
                  .fontSize(12)
                  .fontColor(this.connectionPhase === 'completed' ? '#0EA5E9' : '#999999')
                Text('当前为WebSocket模拟星闪通信')
                  .fontSize(10)
                  .fontColor('#999999')
                  .fontStyle(FontStyle.Italic)
                  .margin({ left: 4 })
              }
              .margin({ bottom: 8 })

              Text('ArkUI 智能分布式元服务卡片')
                .fontSize(13)
                .fontWeight(FontWeight.Medium)
                .fontColor('#182431')
                .margin({ bottom: 4 })

              Text('一键将当前提取的论文关键指标及可视化 PK/ROC 曲线，实时推流并渲染至附近 HarmonyOS 设备（平板、智慧屏或 PC 端侧服务中心）。')
                .fontSize(11)
                .fontColor('#666666')
                .lineHeight(18)
                .margin({ bottom: 14 })

              // Widget preview
              Column() {
                Row() {
                  Text('云脉 ArkUI')
                    .fontSize(11)
                    .fontColor('#007DFF')
                  Blank()
                  Text(this.selectedDevice?.deviceName || 'MatePad Pro')
                    .fontSize(10)
                    .fontColor('#999999')
                }
                .width('100%')
                .padding({ left: 12, right: 12, top: 8, bottom: 8 })
                .borderRadius({ topLeft: 8, topRight: 8 })
                .backgroundColor('rgba(0,125,255,0.06)')
                .border({ width: 1, color: 'rgba(0,125,255,0.15)' })

                // Widget body
                Column() {
                  Text(this.paperTitle || '学术文献')
                    .fontSize(12)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#0EA5E9')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                    .margin({ bottom: 8 })

                  Row() {
                    Column() {
                      Text('细分领域')
                        .fontSize(8)
                        .fontColor('#999999')
                      Text(this.domainLabel())
                        .fontSize(11)
                        .fontColor('#182431')
                        .fontWeight(FontWeight.Medium)
                        .margin({ top: 2 })
                    }
                    .width('25%')

                    Column() {
                      Text('目标科室')
                        .fontSize(8)
                        .fontColor('#999999')
                      Text(this.targetDepartment || '全科室')
                        .fontSize(11)
                        .fontColor('#182431')
                        .margin({ top: 2 })
                    }
                    .width('25%')

                    Column() {
                      Text('校准凭据数')
                        .fontSize(8)
                        .fontColor('#999999')
                      Text(`${this.ragCount} 条`)
                        .fontSize(11)
                        .fontColor('#182431')
                        .margin({ top: 2 })
                    }
                    .width('25%')

                    Column() {
                      Text('提取参数')
                        .fontSize(8)
                        .fontColor('#999999')
                      Text(`${this.paramCount()} 项`)
                        .fontSize(11)
                        .fontColor('#182431')
                        .margin({ top: 2 })
                    }
                    .width('25%')
                  }
                  .width('100%')
                }
                .width('100%')
                .padding({ left: 12, right: 12, top: 10, bottom: 10 })
                .backgroundColor('rgba(255,255,255,0.6)')
                .border({ width: 1, color: 'rgba(0,125,255,0.1)' })
                .borderRadius({ bottomLeft: 8, bottomRight: 8 })
              }
              .margin({ bottom: 12 })

              // HarmonyWidget
              Text('鸿蒙服务卡片实时预览')
                .fontSize(11)
                .fontWeight(FontWeight.Medium)
                .fontColor('#666666')
                .margin({ bottom: 6 })

              HarmonyWidget({
                paperTitle: this.paperTitle,
                paramCount: this.paramCount(),
                ragScore: this.ragScore(),
                syncStatus: this.syncStatus,
                domain: this.domain,
                targetDepartment: this.targetDepartment
              })

              // Phase logs
              if (this.phaseLogs.length > 0) {
                Column() {
                  ForEach(this.phaseLogs, (log: string) => {
                    Text(log)
                      .fontSize(11)
                      .fontColor('rgba(255,255,255,0.5)')
                      .fontFamily('monospace')
                      .padding({ top: 2, bottom: 2 })
                  })
                }
                .width('100%')
                .padding(10)
                .backgroundColor('rgba(0,0,0,0.85)')
                .borderRadius(8)
                .constraintSize({ maxHeight: 120 })
                .margin({ bottom: 14 })
              }

              // Buttons
              Row() {
                Button(this.isConnecting()
                  ? `星闪总线同步中(${this.phaseLabel()}...)`
                  : (this.connectionPhase === 'completed' ? '更新多端推流' : '星闪一键推流'))
                  .layoutWeight(1)
                  .fontSize(13)
                  .fontColor(Color.White)
                  .backgroundColor(this.isConnecting() ? 'rgba(0,125,255,0.5)' : '#007DFF')
                  .borderRadius(8)
                  .padding({ top: 12, bottom: 12 })
                  .enabled(!this.isConnecting())
                  .onClick(() => {
                    this.isSyncingHarmony = true;
                    this.handleStarLinkSync();
                  })

                if (this.connectionPhase === 'completed') {
                  Blank().width(10)
                  Button('断开协同')
                    .fontSize(13)
                    .fontColor('#EF4444')
                    .backgroundColor('rgba(239,68,68,0.06)')
                    .border({ width: 1, color: 'rgba(239,68,68,0.2)', radius: 8 })
                    .padding({ top: 12, bottom: 12, left: 16, right: 16 })
                    .onClick(() => { this.handleDisconnect(); })
                }
              }
              .width('100%')
            }
            .width('100%')
            .padding(16)
            .backgroundColor('#F8FAFC')
            .borderRadius(12)
            .border({ width: 1, color: 'rgba(0,125,255,0.08)' })
            .margin({ bottom: 16 })

            // ---- Section B: NPU Sandbox ----
            Column() {
              Row() {
                Text('ArkCompiler NPU 沙箱')
                  .fontSize(12)
                  .fontColor('#10B981')
                  .backgroundColor('rgba(16,185,129,0.08)')
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .borderRadius(4)

                Blank()

                Row() {
                  Text('⚙')
                    .fontSize(10)
                  Text('NPU 隐私保护')
                    .fontSize(10)
                    .fontColor('#10B981')
                    .margin({ left: 4 })
                }
              }
              .width('100%')
              .margin({ bottom: 10 })

              Text('本地端侧 3B 大模型隐私脱敏')
                .fontSize(13)
                .fontWeight(FontWeight.Medium)
                .fontColor('#182431')
                .margin({ bottom: 4 })

              Text('调用设备端侧麒麟处理器内置的 NPU 神经处理单元，在本地对上传的 PDF/MD 临床数据及患者病例进行本地脱敏（替换受试者 ID、过滤隐私及医院铭牌），保证核心资产不出沙箱。')
                .fontSize(11)
                .fontColor('#666666')
                .lineHeight(18)
                .margin({ bottom: 16 })

              NpuSandboxPanel({
                selectedPaperId: this.paperTitle,
                onSanitizeComplete: (result: SanitizeResult) => {
                  this.sanitizeResult = result;
                }
              })
            }
            .width('100%')
            .padding(16)
            .backgroundColor('rgba(241,243,245,0.5)')
            .borderRadius(16)
          }
          .width('100%')
          .padding({ left: 16, right: 16, top: 4, bottom: 30 })
        }
        .layoutWeight(1)
        .scrollable(ScrollDirection.Vertical)
        .scrollBar(BarState.Off)
      }
      .width('85%')
      .height('100%')
      .backgroundColor(Color.White)
      .borderRadius({ topLeft: 24, bottomLeft: 24 })
      .shadow({ radius: 40, color: 'rgba(0,0,0,0.15)', offsetY: 0 })
      .align(Alignment.End)
        }
        .width('100%')
        .height('100%')
      }
    }
  }
}
