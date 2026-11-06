import { RobotMatch } from '../../utils/Types';

@Component
export struct MatchTab {
  @Link robotMatches: RobotMatch[];
  @State isRefreshing: boolean = false;
  onRefreshMatch: () => void = () => {};

  build() {
    Column() {
      if (this.robotMatches.length === 0) {
        Column() {
          Text('暂无匹配数据')
            .fontSize(16)
            .fontColor('#CCCCCC')
          Text('请先执行分析')
            .fontSize(14)
            .fontColor('#E0E0E0')
            .margin({ top: 8 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $$this.isRefreshing }) {
        List({ space: 12 }) {
          ForEach(this.robotMatches, (match: RobotMatch, index: number) => {
            ListItem() {
              Row() {
                Column() {
                  Text(match.name)
                    .fontSize(16)
                    .fontWeight(500)
                    .fontColor('#333333')
                  Text('厂商: ' + match.manufacturer)
                    .fontSize(14)
                    .fontColor('#666666')
                    .margin({ top: 4 })
                  Row({ space: 4 }) {
                    Rating({ rating: match.compatibility_score / 20, indicator: true })
                      .stars(5)
                      .stepSize(0.5)
                    Text(match.compatibility_score + '%')
                      .fontSize(14)
                      .fontColor('#10B981')
                  }
                  .margin({ top: 2 })
                }
                .layoutWeight(1)

                Column() {
                  Text(match.description)
                    .fontSize(12)
                    .fontColor('#999999')
                    .maxLines(2)
                }
                .width('40%')
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor('#FFFFFF')
            }
          }, (match: RobotMatch, index: number) => match.id || `${index}`)
        }
        .width('100%')
        .layoutWeight(1)
        }
        .onRefreshing(() => {
          this.isRefreshing = true;
          this.onRefreshMatch();
          setTimeout(() => { this.isRefreshing = false; }, 1000);
        })
      }
    }
    .width('100%')
    .height('100%')
    .padding({ top: 16, left: 16, right: 16, bottom: 48 })
    .backgroundColor('#F1F3F5')
  }
}
