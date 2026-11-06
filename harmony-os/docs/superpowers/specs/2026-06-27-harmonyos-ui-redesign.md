# HarmonyOS UI 重构设计文档

**日期**: 2026-06-27
**目标设备**: 手机为主 (phone-first)
**设计原则**: 严格遵循 HarmonyOS 官方开发文档规范

---

## 1. 问题诊断

当前 `Index.ets` (675行单文件) 存在以下问题:

| 问题 | 描述 |
|------|------|
| 三栏硬编码布局 | PlanTab 使用 25%/50%/25% 固定宽度，手机上完全不可用 |
| 过多Tab | 7个Tab挤在水平滚动栏中，用户难以定位 |
| 字体过小 | 正文14fp、时间戳10fp，信息密度过高 |
| 间距过紧 | 卡片间距8-12vp，视觉拥挤 |
| 无响应式适配 | 声明了phone+tablet但全为固定尺寸 |
| 单文件架构 | 所有UI和逻辑混在一个文件，难以维护 |

---

## 2. 导航架构

### 2.1 底部Tab导航 (4项)

| Tab | 内容 |
|-----|------|
| 方案 | 参数提取 + 方案详情 + 智能助手 + 临床方案 + 商业计划 |
| 匹配 | 机器人匹配列表 |
| 知识库 | 知识库搜索 + 审核日志 |
| 设置 | AI模型选择 + CI/CD + 开发日志 + 性能基准 |

### 2.2 侧边抽屉导航

- 基于 HarmonyOS 原生 `SideBarContainer` (Overlay模式)
- 触发方式: 标题栏菜单按钮 / 左边缘手势滑出
- 抽屉内展示全部页面入口的层级树，点击跳转并自动关闭
- 抽屉宽度: 70%屏幕宽度
- `autoHide: true` 点击遮罩自动关闭

---

## 3. 排版系统

### 3.1 字体层级 (fp)

| 层级 | 大小 | 用途 |
|------|------|------|
| 大标题 | 22fp | 页面主标题 |
| 标题 | 18fp | 区块标题 |
| 正文 | 16fp | 卡片内容、列表项 |
| 辅助文字 | 14fp | 描述、标签 |
| 说明文字 | 12fp | 时间戳、次要信息 |

### 3.2 间距系统 (vp)

| 用途 | 值 |
|------|-----|
| 页面边距 | 16vp |
| 卡片内边距 | 16vp |
| 区块间距 | 20vp |
| 列表项间距 | 12vp |
| 元素内间距 | 8vp |
| 卡片圆角 | 12vp |
| 触摸目标最小 | 48vp |

### 3.3 颜色

使用 HarmonyOS 系统标准色值:

- 主色: `#007DFF`
- 成功色: `#10B981`
- 标题色: `#182431`
- 正文色: `#333333`
- 辅助色: `#666666`
- 背景色: `#F1F3F5`
- 卡片背景: `#FFFFFF`
- 分隔线: `#E0E0E0`

---

## 4. 布局方案

### 4.1 方案Tab (原三栏并排 → 纵向卡片滚动)

```
┌──────────────────────────┐
│ 标题栏 (☰ 云脉·智慧医疗)    │
├──────────────────────────┤
│ 卡片: 论文参数提取          │
│  [领域]                   │
│  [论文标题] [目标科室]      │
│  [靶点]    [适应症]        │
├──────────────────────────┤
│ 卡片: 方案详情             │
│  论文标题 / 靶点 / 适应症   │
├──────────────────────────┤
│ 卡片: 智能助手             │
│  ●在线 对话消息列表         │
│  [输入消息...] [发送]      │
├──────────────────────────┤
│ 卡片: 临床方案             │
│  RichText 文档内容         │
├──────────────────────────┤
│ 卡片: 商业计划             │
│  RichText 文档内容         │
└──────────────────────────┘
```

- 各卡片使用 `Column({ space: 12 })` 包裹在 `Scroll` 中
- 参数输入改为两列网格布局 (宽屏参数并排)
- 聊天面板作为页面内嵌卡片

### 4.2 匹配Tab

- 机器人列表，每项卡片展示: 名称、厂商、兼容评分、描述
- 空状态提示 "暂无匹配数据，请先执行分析"

### 4.3 知识库Tab

- 顶部: 搜索框 + 搜索按钮
- 搜索结果列表 (来源、标题、内容摘要)
- 下方: 审核日志列表
- 两区块纵向堆叠

### 4.4 设置Tab

- 纵向滚动卡片分组:
  - AI模型选择器 (Select组件)
  - CI/CD流水线列表
  - 开发日志列表
  - 模型性能基准列表
  - Widget状态卡片 (含浮层开关)

---

## 5. 代码架构

### 5.1 文件拆分

```
pages/
  Index.ets                      (~70行) 导航壳
  tabs/
    PlanTab.ets                  (~180行) 方案页
    MatchTab.ets                 (~50行)  匹配页
    KnowledgeTab.ets             (~90行)  知识库页
    SettingsTab.ets              (~120行) 设置页
  components/
    DrawerMenu.ets               (~50行)  侧边栏菜单
    ChatPanel.ets                (~70行)  聊天面板
    InfoCard.ets                 (~30行)  通用信息卡片
utils/
    Types.ets                    (不变)   类型定义
    HttpUtil.ets                 (不变)   HTTP工具
    WsUtil.ets                   (不变)   WebSocket工具
```

### 5.2 状态管理

- Index.ets 持有全局状态 (`@State`)
- 各Tab通过 `@Prop` / `@Link` 接收子状态
- WebSocket 和 HTTP 工具类保持不变
- 抽屉开关状态: `showDrawer`

### 5.3 组件通信

```
Index.ets (全局状态所有者)
  ├── SideBarContainer
  │   ├── DrawerMenu (@Link showDrawer, onJump回调)
  │   └── Tabs
  │       ├── PlanTab (@Link appParams, chatMessages, ...)
  │       ├── MatchTab (@Link robotMatches)
  │       ├── KnowledgeTab (@Link ragReferences, auditLogs)
  │       └── SettingsTab (@Link benchmarkData, cicdPipelines, devLogs, ...)
```

---

## 6. 关键技术点

### 6.1 SideBarContainer 使用

```typescript
SideBarContainer(SideBarContainerType.Overlay) {
  DrawerMenu({ onJump: (tab, section) => { ... } })
  Column() { /* Tabs */ }
}
.sideBarWidth('70%')
.showSideBar(this.showDrawer)
.autoHide(true)
```

### 6.2 底部Tab

使用 `Tabs` 组件，`barPosition: BarPosition.End`，`vertical: false`

### 6.3 滚动容器

- 静态内容区使用 `Scroll` + `Column({ space: 12 })` 确保纵向滚动间距
- 动态列表(聊天消息、机器人列表、审核日志等)使用 `List` + `ListItem` 以获得虚拟滚动性能
- 聊天消息列表使用 `List` + `ForEach`，消息项使用 `ListItem`

### 6.4 空状态处理

所有列表/内容区在无数据时显示居中的空状态提示文字

---

## 7. 不涉及改动

- `utils/Types.ets` — 类型定义不变
- `utils/HttpUtil.ets` — HTTP工具不变
- `utils/WsUtil.ets` — WebSocket工具不变
- `EntryAbility.ets` — 入口不变
- `module.json5` — 模块配置不变 (已声明phone+tablet)
- 资源文件 (color.json, string.json) — 按需小幅调整
