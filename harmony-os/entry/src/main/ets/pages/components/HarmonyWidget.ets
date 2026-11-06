// 鸿蒙服务卡片预览组件
// 移植自 harmony-web/src/components/HarmonyWidget.tsx

@Component
export struct HarmonyWidget {
  @Prop paperTitle: string = '';
  @Prop paramCount: number = 0;
  @Prop ragScore: number = 0;
  @Prop syncStatus: string = 'offline'; // 'synced' | 'offline' | 'syncing'
  @Prop domain: string = 'devices';
  @Prop targetDepartment: string = '';

  private domainLabel(): string {
    if (this.domain === 'drugs') return '创新药物';
    if (this.domain === 'ai') return '医疗 SaMD';
    if (this.domain === 'surgical') return '改良术式';
    return '荧光探针';
  }

  private ragColor(): string {
    if (this.ragScore >= 80) return '#10B981';
    if (this.ragScore >= 60) return '#F59E0B';
    return '#EF4444';
  }

  private syncColor(): string {
    if (this.syncStatus === 'synced') return '#0EA5E9';
    if (this.syncStatus === 'syncing') return '#F59E0B';
    return 'rgba(255,255,255,0.4)';
  }

  private syncLabel(): string {
    if (this.syncStatus === 'synced') return '已同步';
    if (this.syncStatus === 'syncing') return '同步中';
    return '离线';
  }

  private syncIcon(): string {
    if (this.syncStatus === 'synced') return '◉';
    if (this.syncStatus === 'syncing') return '◎';
    return '○';
  }

  build() {
    Column() {
      // Top gradient bar
      Row()
        .width('100%')
        .height(4)
        .borderRadius({ topLeft: 12, topRight: 12 })
        .linearGradient({
          direction: GradientDirection.Right,
          colors: [['#007DFF', 0], ['#0EA5E9', 1]]
        })

      // Header: brand + sync status
      Row() {
        // Brand
        Row() {
          Text('云')
            .width(24)
            .height(24)
            .borderRadius(6)
            .backgroundColor('#007DFF')
            .fontColor(Color.White)
            .fontSize(14)
            .textAlign(TextAlign.Center)
          Text('云脉 ArkUI 服务卡片')
            .fontSize(12)
            .fontColor('rgba(255,255,255,0.6)')
            .margin({ left: 8 })
        }

        Blank()

        // Sync status
        Row() {
          Text(this.syncIcon())
            .fontSize(12)
            .fontColor(this.syncColor())
          Text(this.syncLabel())
            .fontSize(10)
            .fontColor(this.syncColor())
            .margin({ left: 4 })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12 })

      // Title
      Text(this.paperTitle || '学术文献')
        .fontSize(14)
        .fontColor(Color.White)
        .fontWeight(FontWeight.Medium)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .padding({ left: 16, right: 16, top: 12 })

      // 4-cell grid
      Row() {
        Column() {
          Text('细分领域')
            .fontSize(9)
            .fontColor('rgba(255,255,255,0.4)')
          Text(this.domainLabel())
            .fontSize(13)
            .fontColor('#0EA5E9')
            .fontWeight(FontWeight.Medium)
            .margin({ top: 4 })
        }
        .width('25%')

        Column() {
          Text('目标科室')
            .fontSize(9)
            .fontColor('rgba(255,255,255,0.4)')
          Text(this.targetDepartment || '-')
            .fontSize(13)
            .fontColor(Color.White)
            .margin({ top: 4 })
        }
        .width('25%')

        Column() {
          Text('提取参数')
            .fontSize(9)
            .fontColor('rgba(255,255,255,0.4)')
          Text(`${this.paramCount} 项`)
            .fontSize(13)
            .fontColor(Color.White)
            .margin({ top: 4 })
        }
        .width('25%')

        Column() {
          Text('RAG 合规评分')
            .fontSize(9)
            .fontColor('rgba(255,255,255,0.4)')
          Text(`${this.ragScore}%`)
            .fontSize(13)
            .fontColor(this.ragColor())
            .fontWeight(FontWeight.Medium)
            .margin({ top: 4 })
        }
        .width('25%')
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })

      // Footer
      Row() {
        Text('🛡')
          .fontSize(10)
        Text('NPU 端侧隐私脱敏保护已启用')
          .fontSize(10)
          .fontColor('rgba(255,255,255,0.4)')
          .margin({ left: 4 })
      }
      .padding({ left: 16, right: 16, top: 16, bottom: 12 })
    }
    .width('100%')
    .borderRadius(12)
    .backgroundColor('rgba(30,30,40,0.85)')
    .backdropBlur(20)
    .border({ width: 1, color: 'rgba(255,255,255,0.1)' })
    .margin({ bottom: 16 })
  }
}
