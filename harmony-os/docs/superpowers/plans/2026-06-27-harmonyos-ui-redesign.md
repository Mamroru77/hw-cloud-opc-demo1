# HarmonyOS UI 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 675 行单文件 Index.ets 重构为手机优先的组件化架构，底部4Tab + 侧边抽屉导航，规范字体和间距系统。

**Architecture:** Index.ets 作为导航壳持有全部全局状态，通过 @Link 传递给各 Tab 子组件。SideBarContainer 包裹整个应用提供抽屉导航，Tabs 在底部提供主要页面切换。

**Tech Stack:** HarmonyOS ArkTS, ArkUI 声明式框架, SideBarContainer, Tabs, List, Scroll

---

### Task 1: 创建目录结构

**Files:**
- Create: `entry/src/main/ets/pages/tabs/` (目录)
- Create: `entry/src/main/ets/pages/components/` (目录)

- [ ] **Step 1: 创建 tabs 和 components 子目录**

```bash
mkdir -p entry/src/main/ets/pages/tabs entry/src/main/ets/pages/components
```

运行后确认 `pages/tabs/` 和 `pages/components/` 目录已创建。

---

### Task 2: 创建 DrawerMenu 组件

**Files:**
- Create: `entry/src/main/ets/pages/components/DrawerMenu.ets`

- [ ] **Step 1: 写入 DrawerMenu.ets**

```typescript
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
        { label: 'AI 模型选择', sectionKey: 'model' },
        { label: 'CI/CD 面板', sectionKey: 'cicd' },
        { label: '开发日志', sectionKey: 'devlog' },
        { label: '性能基准', sectionKey: 'benchmark' }
      ]
    }
  ];

  build() {
    Column() {
      // 抽屉头部
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

      // 菜单列表
      List({ space: 0 }) {
        ForEach(this.sections, (section: DrawerSection, sectionIndex: number) => {
          ListItem() {
            Column() {
              // 父级菜单项
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

              // 子菜单项
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
```

---

### Task 3: 创建 ChatPanel 组件

**Files:**
- Create: `entry/src/main/ets/pages/components/ChatPanel.ets`

- [ ] **Step 1: 写入 ChatPanel.ets**

```typescript
import { ChatMessage } from '../../utils/Types';

@Component
export struct ChatPanel {
  @Link chatMessages: ChatMessage[];
  @Prop inputMessage: string = '';
  @Prop wsConnected: boolean = false;
  onInputChange: (value: string) => void = () => {};
  onSend: () => void = () => {};

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
        Circle()
          .width(8)
          .height(8)
          .fill(this.wsConnected ? '#10B981' : '#FF4444')
          .margin({ left: 8 })
        Text(this.wsConnected ? '在线' : '离线')
          .fontSize(11)
          .fontColor(this.wsConnected ? '#10B981' : '#FF4444')
          .margin({ left: 4 })
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
                Text(msg.sender === 'user' ? '我' : 'AI')
                  .fontSize(12)
                  .fontColor(msg.sender === 'user' ? '#007DFF' : '#10B981')
                  .fontWeight(600)
                  .width(36)
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
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
  }
}
```

---

### Task 4: 创建 PlanTab 组件

**Files:**
- Create: `entry/src/main/ets/pages/tabs/PlanTab.ets`

- [ ] **Step 1: 写入 PlanTab.ets**

```typescript
import { AppParams, ChatMessage } from '../../utils/Types';
import { ChatPanel } from '../components/ChatPanel';

@Component
export struct PlanTab {
  @Link appParams: AppParams;
  @Link chatMessages: ChatMessage[];
  @Link inputMessage: string;
  @Link clinicalPlanDoc: string;
  @Link businessPlanDoc: string;
  @Prop wsConnected: boolean = false;
  onSendMessage: () => void = () => {};

  build() {
    Scroll() {
      Column({ space: 16 }) {
        // 卡片: 论文参数提取
        Column() {
          Text('论文参数提取')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          TextInput({ text: this.appParams.domain, placeholder: '领域' })
            .width('100%')
            .height(44)
            .borderRadius(8)
            .onChange((v: string) => { this.appParams.domain = v; })

          Row({ space: 8 }) {
            TextInput({ text: this.appParams.paper_title, placeholder: '论文标题' })
              .layoutWeight(1)
              .height(44)
              .borderRadius(8)
              .onChange((v: string) => { this.appParams.paper_title = v; })
            TextInput({ text: this.appParams.target_department, placeholder: '目标科室' })
              .layoutWeight(1)
              .height(44)
              .borderRadius(8)
              .onChange((v: string) => { this.appParams.target_department = v; })
          }
          .width('100%')
          .margin({ top: 8 })

          Row({ space: 8 }) {
            TextInput({ text: this.appParams.target, placeholder: '靶点' })
              .layoutWeight(1)
              .height(44)
              .borderRadius(8)
              .onChange((v: string) => { this.appParams.target = v; })
            TextInput({ text: this.appParams.indication, placeholder: '适应症' })
              .layoutWeight(1)
              .height(44)
              .borderRadius(8)
              .onChange((v: string) => { this.appParams.indication = v; })
          }
          .width('100%')
          .margin({ top: 8 })
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // 卡片: 方案详情
        Column() {
          Text('方案详情')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          if (this.appParams.paper_title) {
            Text(this.appParams.paper_title)
              .fontSize(16)
              .fontColor('#333333')
              .margin({ bottom: 8 })
            Text('靶点: ' + (this.appParams.target || '-'))
              .fontSize(14)
              .fontColor('#666666')
              .margin({ bottom: 4 })
            Text('适应症: ' + (this.appParams.indication || '-'))
              .fontSize(14)
              .fontColor('#666666')
          } else {
            Column() {
              Text('暂无方案')
                .fontSize(14)
                .fontColor('#CCCCCC')
              Text('请先填写参数后执行分析')
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

        // 卡片: 智能助手
        ChatPanel({
          chatMessages: this.chatMessages,
          inputMessage: this.inputMessage,
          wsConnected: this.wsConnected,
          onInputChange: (value: string) => { this.inputMessage = value; },
          onSend: () => { this.onSendMessage(); }
        })

        // 卡片: 临床方案
        Column() {
          Text('临床方案')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          if (this.clinicalPlanDoc) {
            RichText(this.clinicalPlanDoc).width('100%')
          } else {
            Column() {
              Text('暂无临床方案')
                .fontSize(14)
                .fontColor('#CCCCCC')
              Text('请先执行分析以生成方案')
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

        // 卡片: 商业计划
        Column() {
          Text('商业计划')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          if (this.businessPlanDoc) {
            RichText(this.businessPlanDoc).width('100%')
          } else {
            Column() {
              Text('暂无商业计划')
                .fontSize(14)
                .fontColor('#CCCCCC')
              Text('请先执行分析以生成计划')
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
      .width('100%')
      .padding(16)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F1F3F5')
  }
}
```

---

### Task 5: 创建 MatchTab 组件

**Files:**
- Create: `entry/src/main/ets/pages/tabs/MatchTab.ets`

- [ ] **Step 1: 写入 MatchTab.ets**

```typescript
import { RobotMatch } from '../../utils/Types';

@Component
export struct MatchTab {
  @Link robotMatches: RobotMatch[];

  build() {
    Column() {
      Text('机器人匹配')
        .fontSize(22)
        .fontWeight(600)
        .fontColor('#182431')
        .margin({ bottom: 16 })

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
                  Text('兼容评分: ' + match.compatibility_score + '%')
                    .fontSize(14)
                    .fontColor('#10B981')
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
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#F1F3F5')
  }
}
```

---

### Task 6: 创建 KnowledgeTab 组件

**Files:**
- Create: `entry/src/main/ets/pages/tabs/KnowledgeTab.ets`

- [ ] **Step 1: 写入 KnowledgeTab.ets**

```typescript
import { RAGReference, AuditLogEntry } from '../../utils/Types';

@Component
export struct KnowledgeTab {
  @Link ragReferences: RAGReference[];
  @Link auditLogs: AuditLogEntry[];
  @Prop knowledgeQuery: string = '';
  onQueryChange: (v: string) => void = () => {};
  onSearch: () => void = () => {};

  build() {
    Scroll() {
      Column({ space: 16 }) {
        // 知识库搜索
        Column() {
          Text('知识库')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

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

        // 审核日志
        Column() {
          Text('审核日志')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
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
      .padding(16)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F1F3F5')
  }
}
```

---

### Task 7: 创建 SettingsTab 组件

**Files:**
- Create: `entry/src/main/ets/pages/tabs/SettingsTab.ets`

- [ ] **Step 1: 写入 SettingsTab.ets**

```typescript
import { BenchmarkEntry, CICDPipeline, DevLogEntry } from '../../utils/Types';

@Component
export struct SettingsTab {
  @Link benchmarkData: BenchmarkEntry[];
  @Link cicdPipelines: CICDPipeline[];
  @Link devLogs: DevLogEntry[];
  @Link selectedProviderIndex: number;
  @Link showOverlay: boolean;
  @Prop ragReferenceCount: number = 0;

  build() {
    Scroll() {
      Column({ space: 16 }) {
        // AI模型选择器
        Column() {
          Text('AI 模型选择')
            .fontSize(18)
            .fontWeight(600)
            .fontColor('#182431')
            .margin({ bottom: 12 })

          Select([
            { value: '盘古大模型 (pangu)' },
            { value: 'DeepSeek-V3 (deepseek)' },
            { value: 'GPT-4o (openai)' },
            { value: 'GLM-4 (glm)' },
            { value: 'Gemini Pro (gemini)' }
          ])
            .selected(this.selectedProviderIndex)
            .value('选择模型')
            .font({ size: 16 })
            .fontColor('#182431')
            .selectedOptionFont({ size: 16 })
            .optionFont({ size: 16 })
            .onSelect((index: number) => {
              this.selectedProviderIndex = index;
            })
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)

        // CI/CD 面板
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

        // 开发日志
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

        // 模型性能基准
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

        // Widget状态卡片
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

          Button(this.showOverlay ? '隐藏浮层' : '显示浮层')
            .onClick(() => { this.showOverlay = !this.showOverlay; })
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)
      }
      .width('100%')
      .padding(16)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F1F3F5')
  }
}
```

---

### Task 8: 重写 Index.ets 导航壳

**Files:**
- Modify: `entry/src/main/ets/pages/Index.ets` (完全重写)

- [ ] **Step 1: 重写 Index.ets**

```typescript
import { AppParams, ChatMessage, RobotMatch, RAGReference, BenchmarkEntry, AuditLogEntry, DevLogEntry, CICDPipeline, createDefaultAppParams } from '../utils/Types';
import { HttpUtil, HttpError } from '../utils/HttpUtil';
import { WsUtil } from '../utils/WsUtil';
import { DrawerMenu } from './components/DrawerMenu';
import { PlanTab } from './tabs/PlanTab';
import { MatchTab } from './tabs/MatchTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { SettingsTab } from './tabs/SettingsTab';

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
  @State selectedProviderIndex: number = 0;
  @State showDrawer: boolean = false;
  @State showOverlay: boolean = false;
  private wsUtil: WsUtil = new WsUtil();

  async aboutToAppear(): Promise<void> {
    await this.loadInitialState();
    this.setupWebSocket();
  }

  private async loadInitialState(): Promise<void> {
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
      (err) => {
        console.error('WebSocket error:', JSON.stringify(err));
      }
    );
  }

  aboutToDisappear(): void {
    this.wsUtil.close();
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
    // sectionKey 预留: 后续可扩展滚动到Tab内指定区块
  }

  private async searchKnowledge(): Promise<void> {
    try {
      const refs = await HttpUtil.get<RAGReference[]>(`/api/knowledge/search?query=${this.knowledgeQuery}`);
      this.ragReferences = refs;
    } catch (err) {
      console.error('Knowledge search failed:', JSON.stringify(err));
    }
  }

  build() {
    SideBarContainer(SideBarContainerType.Overlay) {
      DrawerMenu({
        showDrawer: this.showDrawer,
        onNavigate: (tabIndex: number, sectionKey?: string) => {
          this.handleNavigate(tabIndex, sectionKey);
        }
      })

      Column() {
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
            LoadingProgress()
              .width(24)
              .height(24)
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
              onSendMessage: () => { this.sendMessage(); }
            })
          }
          .tabBar('方案')

          TabContent() {
            MatchTab({ robotMatches: this.robotMatches })
          }
          .tabBar('匹配')

          TabContent() {
            KnowledgeTab({
              ragReferences: this.ragReferences,
              auditLogs: this.auditLogs,
              knowledgeQuery: this.knowledgeQuery,
              onQueryChange: (v: string) => { this.knowledgeQuery = v; },
              onSearch: () => { this.searchKnowledge(); }
            })
          }
          .tabBar('知识库')

          TabContent() {
            SettingsTab({
              benchmarkData: this.benchmarkData,
              cicdPipelines: this.cicdPipelines,
              devLogs: this.devLogs,
              selectedProviderIndex: this.selectedProviderIndex,
              showOverlay: this.showOverlay,
              ragReferenceCount: this.ragReferences.length
            })
          }
          .tabBar('设置')
        }
        .vertical(false)
        .animationDuration(300)
        .onChange((index: number) => {
          this.currentTabIndex = index;
        })
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#F1F3F5')
    }
    .sideBarWidth('70%')
    .showSideBar(this.showDrawer)
    .autoHide(true)
    .onChange((isBarShow: boolean) => {
      this.showDrawer = isBarShow;
    })
  }
}
```

---

### Task 9: 验证项目结构

- [ ] **Step 1: 确认所有文件存在**

```bash
find entry/src/main/ets/pages -type f -name "*.ets" | sort
```

Expected output:
```
entry/src/main/ets/pages/Index.ets
entry/src/main/ets/pages/tabs/PlanTab.ets
entry/src/main/ets/pages/tabs/MatchTab.ets
entry/src/main/ets/pages/tabs/KnowledgeTab.ets
entry/src/main/ets/pages/tabs/SettingsTab.ets
entry/src/main/ets/pages/components/DrawerMenu.ets
entry/src/main/ets/pages/components/ChatPanel.ets
```

- [ ] **Step 2: 确认 main_pages.json 指向 Index**

Read: `entry/src/main/resources/base/profile/main_pages.json`
确认内容为 `{ "src": ["pages/Index"] }` (无需修改)

- [ ] **Step 3: 确认 utils 文件不变**

```bash
find entry/src/main/ets/utils -type f -name "*.ets" | sort
```

Expected:
```
entry/src/main/ets/utils/HttpUtil.ets
entry/src/main/ets/utils/Types.ets
entry/src/main/ets/utils/WsUtil.ets
```

- [ ] **Step 4: 清理等待页面文件，关闭视觉伴侣服务器**

```bash
rm -rf .superpowers/brainstorm/
```

---

### 改动总结

| 操作 | 文件 |
|------|------|
| 重写 | `pages/Index.ets` (675行 → ~170行) |
| 新建 | `pages/tabs/PlanTab.ets` |
| 新建 | `pages/tabs/MatchTab.ets` |
| 新建 | `pages/tabs/KnowledgeTab.ets` |
| 新建 | `pages/tabs/SettingsTab.ets` |
| 新建 | `pages/components/DrawerMenu.ets` |
| 新建 | `pages/components/ChatPanel.ets` |
| 不变 | `utils/Types.ets`, `utils/HttpUtil.ets`, `utils/WsUtil.ets` |
| 不变 | `EntryAbility.ets`, `module.json5`, 资源文件 |
