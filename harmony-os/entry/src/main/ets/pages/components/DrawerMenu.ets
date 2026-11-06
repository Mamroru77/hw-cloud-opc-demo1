// 抽屉菜单项数据结构
export interface DrawerSection {
  label: string;
  tabIndex: number;
  children?: DrawerItem[];
}

export interface DrawerItem {
  label: string;
  sectionKey: string;
}

@Component
export struct DrawerMenu {
  @Link showDrawer: boolean;
  onNavigate: (tabIndex: number, sectionKey?: string) => void = () => {};

  private sections: DrawerSection[] = [
    {
      label: '方案',
      tabIndex: 0,
      children: [
        { label: '参数提取', sectionKey: 'params' },
        { label: '方案详情', sectionKey: 'detail' },
        { label: '智能助手', sectionKey: 'chat' },
        { label: '临床方案', sectionKey: 'clinical' },
        { label: '商业计划', sectionKey: 'business' }
      ]
    },
    { label: '机器人匹配', tabIndex: 1 },
    {
      label: '知识库与审核',
      tabIndex: 2,
      children: [
        { label: '知识库搜索', sectionKey: 'knowledge' },
        { label: '审核日志', sectionKey: 'audit' }
      ]
    },
    {
      label: '设置',
      tabIndex: 3,
      children: [
        { label: 'API 配置', sectionKey: 'model' },
        { label: 'CI/CD 面板', sectionKey: 'cicd' },
        { label: '开发日志', sectionKey: 'devlog' },
        { label: '性能基准', sectionKey: 'benchmark' }
      ]
    }
  ];

  build() {
    Column() {
      Column() {
        Text('云脉 · 智慧医疗')
          .fontSize(16)
          .fontWeight(600)
          .fontColor('#182431')
        Text('多智能体系统')
          .fontSize(12)
          .fontColor('#999999')
          .margin({ top: 4 })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 20, bottom: 16 })
      .border({ width: { bottom: 1 }, color: '#F0F0F0' })

      List({ space: 0 }) {
        ForEach(this.sections, (section: DrawerSection, sectionIndex: number) => {
          ListItem() {
            Column() {
              Row() {
                Text(section.label)
                  .fontSize(14)
                  .fontWeight(500)
                  .fontColor('#182431')
              }
              .width('100%')
              .padding({ left: 16, right: 16, top: 12, bottom: 12 })
              .onClick(() => {
                this.onNavigate(section.tabIndex);
                this.showDrawer = false;
              })

              if (section.children) {
                Column() {
                  ForEach(section.children, (child: DrawerItem) => {
                    Row() {
                      Text(child.label)
                        .fontSize(13)
                        .fontColor('#666666')
                    }
                    .width('100%')
                    .padding({ left: 32, right: 16, top: 8, bottom: 8 })
                    .onClick(() => {
                      this.onNavigate(section.tabIndex, child.sectionKey);
                      this.showDrawer = false;
                    })
                  })
                }
              }
            }
          }
          if (sectionIndex < this.sections.length - 1) {
            ListItem() {
              Divider()
                .strokeWidth(0.5)
                .color('#F0F0F0')
                .margin({ left: 16, right: 16 })
            }
          }
        })
      }
      .layoutWeight(1)
      .width('100%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFFFFF')
  }
}
