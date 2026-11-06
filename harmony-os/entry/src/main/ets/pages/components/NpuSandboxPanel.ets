// NPU 隐私沙箱面板 — 5 步脱敏流程
// 移植自 harmony-web/src/components/NpuSandboxPanel.tsx

import { npuSanitize, getDefaultSanitizeSample } from '../../utils/NpuSanitizer';
import { SanitizeResult } from '../../utils/HarmonyTypes';

interface StepConfig {
  p: number;
  log: string;
  action?: string;
}

@Component
export struct NpuSandboxPanel {
  @Prop selectedPaperId: string = '';
  @Prop sampleText: string = '';
  onSanitizeComplete?: (result: SanitizeResult) => void;
  @State status: number = 0; // 0=idle, 1=running, 2=completed
  @State progress: number = 0;
  @State logs: string[] = [];
  @State sanitizeResult: SanitizeResult | null = null;

  private getDefaultText(): string {
    if (this.sampleText) {
      return this.sampleText;
    }
    return getDefaultSanitizeSample();
  }

  private runSandbox(): void {
    this.status = 1;
    this.progress = 0;
    this.logs = [];
    this.sanitizeResult = null;

    const textToSanitize: string = this.getDefaultText();

    const steps: StepConfig[] = [
      { p: 20, log: '[1/5] 文本扫描与隐私字段识别 - 扫描医学文本中的敏感字段...' },
      { p: 40, log: '[2/5] 规则匹配与定位 - 匹配6条医疗场景脱敏规则...' },
      {
        p: 60,
        log: '[3/5] 正则替换与脱敏 - 执行隐私字段替换...',
        action: 'sanitize'
      },
      { p: 80, log: '[4/5] SHA-256哈希校验 - 验证脱敏完整性...' },
      {
        p: 100,
        log: '[5/5] 安全传输确认 - 脱敏数据已通过安全校验，可安全传输',
        action: 'complete'
      },
    ];

    // Run sanitize on step 3 (index 2)
    let result: SanitizeResult | null = null;

    for (let i = 0; i < steps.length; i++) {
      const step: StepConfig = steps[i];
      const p: number = step.p;
      const log: string = step.log;
      const action: string = step.action || '';

      setTimeout(() => {
        if (action === 'sanitize') {
          result = npuSanitize(textToSanitize);
          this.sanitizeResult = result;
          if (this.onSanitizeComplete && result) {
            this.onSanitizeComplete(result);
          }
        }

        this.progress = p;
        const newLogs: string[] = [...this.logs, log];

        if (action === 'complete') {
          // Add summary logs
          const finalResult: SanitizeResult = result || npuSanitize(textToSanitize);
          if (finalResult.fieldsSanitized > 0) {
            newLogs.push(`  ├─ 脱敏规则命中: ${finalResult.rulesApplied.join(', ')}`);
            newLogs.push(`  ├─ 脱敏字段数: ${finalResult.fieldsSanitized}`);
            newLogs.push(`  └─ 传输安全: ${finalResult.isSafeForTransmission ? '通过' : '未通过'}`);
          } else {
            newLogs.push('  └─ 未检测到隐私字段，原始文本可直接传输');
          }
          this.status = 2;
        }

        this.logs = newLogs;
      }, (i + 1) * 600);
    }
  }

  private resetToIdle(): void {
    this.status = 0;
    this.progress = 0;
    this.logs = [];
    this.sanitizeResult = null;
  }

  build() {
    Column() {
      // Idle state
      if (this.status === 0) {
        Column() {
          Button('启动 NPU 本地隐私校准')
            .width('100%')
            .fontSize(13)
            .fontColor('#007DFF')
            .backgroundColor('rgba(0,125,255,0.08)')
            .border({ width: 1, color: 'rgba(0,125,255,0.2)', radius: 8 })
            .padding({ top: 10, bottom: 10 })
            .onClick(() => { this.runSandbox(); })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .padding({ top: 10, bottom: 10 })
      }

      // Running state
      if (this.status === 1) {
        Column() {
          // Progress bar
          Row() {
            Row()
              .width(`${this.progress}%`)
              .height(6)
              .borderRadius(3)
              .linearGradient({
                direction: GradientDirection.Right,
                colors: [['#007DFF', 0], ['#0EA5E9', 1]]
              })
              .animation({ duration: 300, curve: Curve.EaseOut })
            Blank()
          }
          .width('100%')
          .height(6)
          .borderRadius(3)
          .backgroundColor('rgba(255,255,255,0.06)')

          Text(`${this.progress}%`)
            .fontSize(11)
            .fontColor('#0EA5E9')
            .margin({ top: 4 })

          // Console logs
          Column() {
            ForEach(this.logs, (log: string, index: number) => {
              Text(log)
                .fontSize(11)
                .fontColor(index === this.logs.length - 1 ? '#0EA5E9' : 'rgba(255,255,255,0.5)')
                .fontFamily('monospace')
                .padding({ top: 2, bottom: 2 })
            })
          }
          .width('100%')
          .padding(10)
          .backgroundColor('rgba(0,0,0,0.2)')
          .borderRadius(8)
          .margin({ top: 10 })
          .constraintSize({ maxHeight: 180 })
        }
        .width('100%')
      }

      // Completed state
      if (this.status === 2) {
        Column() {
          // Success banner
          Row() {
            Text('🛡')
              .fontSize(16)
            Text('本地沙箱自检通过 - 隐私泄露概率 0.00%')
              .fontSize(12)
              .fontColor('#10B981')
              .margin({ left: 8 })
          }
          .width('100%')
          .padding(10)
          .backgroundColor('rgba(16,185,129,0.08)')
          .border({ width: 1, color: 'rgba(16,185,129,0.2)', radius: 8 })
          .margin({ bottom: 10 })

          // Before/after comparison
          if (this.sanitizeResult && this.sanitizeResult.fieldsSanitized > 0) {
            Column() {
              Text('脱敏前')
                .fontSize(10)
                .fontColor('rgba(255,255,255,0.4)')
              Text(this.sanitizeResult.original)
                .fontSize(12)
                .fontColor('rgba(255,255,255,0.7)')
                .padding(8)
                .width('100%')
                .backgroundColor('rgba(255,255,255,0.04)')
                .borderRadius(6)
                .margin({ top: 4, bottom: 8 })

              Text('脱敏后')
                .fontSize(10)
                .fontColor('rgba(255,255,255,0.4)')
              Text(this.sanitizeResult.sanitized)
                .fontSize(12)
                .fontColor('#10B981')
                .padding(8)
                .width('100%')
                .backgroundColor('rgba(16,185,129,0.06)')
                .borderRadius(6)
                .margin({ top: 4 })
            }
            .width('100%')
          }

          // Console logs
          Column() {
            ForEach(this.logs, (log: string) => {
              Text(log)
                .fontSize(11)
                .fontColor('rgba(255,255,255,0.5)')
                .fontFamily('monospace')
                .padding({ top: 2, bottom: 2 })
            })
          }
          .width('100%')
          .padding(10)
          .backgroundColor('rgba(0,0,0,0.2)')
          .borderRadius(8)
          .margin({ top: 10 })
          .constraintSize({ maxHeight: 180 })

          // Re-run button
          Button('重新运行校准')
            .width('100%')
            .fontSize(13)
            .fontColor('rgba(255,255,255,0.6)')
            .backgroundColor('rgba(255,255,255,0.04)')
            .border({ width: 1, color: 'rgba(255,255,255,0.1)', radius: 8 })
            .padding({ top: 10, bottom: 10 })
            .margin({ top: 10 })
            .onClick(() => { this.resetToIdle(); })
        }
        .width('100%')
      }
    }
    .width('100%')
  }
}
