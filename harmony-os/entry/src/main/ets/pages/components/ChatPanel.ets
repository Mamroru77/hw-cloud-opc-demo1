import { ChatMessage } from '../../utils/Types';

const SUGGESTIONS: string[] = [
  '帮我分析这篇论文',
  '修改靶点为 EGFR',
  '生成临床方案',
  '匹配合适的机器人',
  '当前方案的不足'
];

@Component
export struct ChatPanel {
  @Link chatMessages: ChatMessage[];
  @Prop inputMessage: string = '';
  @Prop wsConnected: boolean = false;
  onInputChange: (value: string) => void = () => {};
  onSend: () => void = () => {};
  onQuickReply: (text: string) => void = () => {};

  private getMessageId(msg: ChatMessage, index: number): string {
    return `${msg.sender}_${index}_${msg.text.substring(0, 20)}`;
  }

  build() {
    Column() {
      Row() {
        Text('智能助手')
          .fontSize(18)
          .fontWeight(600)
          .fontColor('#182431')
        Badge({
          value: this.wsConnected ? '在线' : '离线',
          style: {
            badgeColor: this.wsConnected ? '#10B981' : '#FF4444',
            badgeSize: 14
          }
        })
        .margin({ left: 8 })
      }
      .margin({ bottom: 12 })

      if (this.chatMessages.length === 0) {
        Column() {
          Text('暂无对话')
            .fontSize(14)
            .fontColor('#CCCCCC')
          Text('发送消息开始交流')
            .fontSize(12)
            .fontColor('#E0E0E0')
            .margin({ top: 8 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 6 }) {
          ForEach(this.chatMessages, (msg: ChatMessage, index: number) => {
            ListItem() {
              Row() {
                Text(msg.sender === 'user' ? '我' : (msg.modelName || 'AI'))
                  .fontSize(12)
                  .fontColor(msg.sender === 'user' ? '#007DFF' : '#10B981')
                  .fontWeight(600)
                  .constraintSize({ minWidth: 36 })
                Text(msg.text)
                  .fontSize(14)
                  .fontColor('#333333')
                  .layoutWeight(1)
              }
              .width('100%')
              .padding(10)
              .borderRadius(8)
              .backgroundColor(msg.sender === 'user' ? '#F0F7FF' : '#F0FFF4')
            }
          }, (msg: ChatMessage, index: number) => this.getMessageId(msg, index))
        }
        .layoutWeight(1)
        .width('100%')
      }

      // Suggestion chips
      Row({ space: 6 }) {
        Scroll() {
          Row({ space: 6 }) {
            ForEach(SUGGESTIONS, (suggestion: string, index: number) => {
              Text(suggestion)
                .fontSize(11)
                .fontColor('#007DFF')
                .padding({ left: 10, right: 10, top: 6, bottom: 6 })
                .border({ width: 1, color: '#007DFF', style: BorderStyle.Solid })
                .borderRadius(14)
                .onClick(() => {
                  this.onQuickReply(suggestion);
                })
            })
          }
        }
        .scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Off)
      }
      .width('100%')
      .margin({ top: 8 })

      Row({ space: 8 }) {
        TextInput({ text: this.inputMessage, placeholder: '输入消息...' })
          .layoutWeight(1)
          .height(40)
          .borderRadius(20)
          .onChange((value: string) => {
            this.onInputChange(value);
          })
          .onSubmit(() => {
            this.onSend();
          })
        Button('发送')
          .height(40)
          .padding({ left: 16, right: 16 })
          .borderRadius(20)
          .backgroundColor('#007DFF')
          .fontColor('#FFFFFF')
          .fontSize(14)
          .enabled(this.wsConnected)
          .onClick(() => {
            this.onSend();
          })
      }
      .width('100%')
      .margin({ top: 8 })
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }
}
