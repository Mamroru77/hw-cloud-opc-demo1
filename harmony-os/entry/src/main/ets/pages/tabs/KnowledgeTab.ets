import { RAGReference, AuditLogEntry } from '../../utils/Types';

@Component
export struct KnowledgeTab {
  @Link ragReferences: RAGReference[];
  @Link auditLogs: AuditLogEntry[];
  @Prop knowledgeQuery: string = '';
  onQueryChange: (v: string) => void = () => {};
  onSearch: () => void = () => {};
  @State isRefreshing: boolean = false;

  build() {
    Refresh({ refreshing: $$this.isRefreshing }) {
    Scroll() {
      Column({ space: 16 }) {
        // Knowledge search card
        Column() {
          Row({ space: 8 }) {
            TextInput({ text: this.knowledgeQuery, placeholder: '搜索知识库...' })
              .layoutWeight(1)
              .height(44)
              .borderRadius(8)
              .onChange((v: string) => { this.onQueryChange(v); })
              .onSubmit(() => { this.onSearch(); })
            Button('搜索')
              .height(44)
              .padding({ left: 16, right: 16 })
              .borderRadius(8)
              .backgroundColor('#007DFF')
              .fontColor('#FFFFFF')
              .fontSize(14)
              .onClick(() => { this.onSearch(); })
          }
          .width('100%')
          .margin({ bottom: 12 })

          if (this.ragReferences.length === 0) {
            Text('暂无搜索结果')
              .fontSize(14)
              .fontColor('#CCCCCC')
              .width('100%')
              .textAlign(TextAlign.Center)
              .padding({ top: 20, bottom: 20 })
          } else {
            List({ space: 8 }) {
              ForEach(this.ragReferences, (ref: RAGReference, index: number) => {
                ListItem() {
                  Column() {
                    Text('[' + ref.source + '] ' + ref.title)
                      .fontSize(14)
                      .fontColor('#333333')
                      .fontWeight(500)
                    Text(ref.content)
                      .fontSize(12)
                      .fontColor('#666666')
                      .margin({ top: 4 })
                      .maxLines(3)
                  }
                  .width('100%')
                  .padding(12)
                  .borderRadius(8)
                  .backgroundColor('#FFFFFF')
                }
              }, (ref: RAGReference, index: number) => `${index}`)
            }
            .width('100%')
          }
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // Audit log card
        Column() {
          Row() {
            Text('审核日志')
              .fontSize(18)
              .fontWeight(600)
              .fontColor('#182431')
            if (this.auditLogs.length > 0) {
              Badge({
                value: this.auditLogs.length.toString(),
                style: { badgeSize: 16, badgeColor: '#007DFF' }
              })
              .margin({ left: 8 })
            }
          }
          .margin({ bottom: 12 })

          if (this.auditLogs.length === 0) {
            Text('暂无审核日志')
              .fontSize(14)
              .fontColor('#CCCCCC')
              .width('100%')
              .textAlign(TextAlign.Center)
              .padding({ top: 20, bottom: 20 })
          } else {
            List({ space: 8 }) {
              ForEach(this.auditLogs, (log: AuditLogEntry, index: number) => {
                ListItem() {
                  Row() {
                    Text(log.action)
                      .fontSize(14)
                      .fontColor('#333333')
                      .layoutWeight(1)
                    Text(log.timestamp)
                      .fontSize(12)
                      .fontColor('#999999')
                  }
                  .width('100%')
                  .padding(12)
                  .borderRadius(8)
                  .backgroundColor('#FFFFFF')
                }
              }, (log: AuditLogEntry, index: number) => `${index}`)
            }
            .width('100%')
          }
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
      this.onSearch();
      setTimeout(() => { this.isRefreshing = false; }, 1000);
    })
  }
}
