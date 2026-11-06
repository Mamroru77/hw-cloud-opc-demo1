# 云脉·智慧医疗（鸿蒙端）

> **"华为云杯"2026人工智能OPC应用创新大赛 · 场景五：智慧医疗——"从实验室到临床"的转化医学 Agent**

基于 HarmonyOS NEXT 的智慧医疗科研转化加速平台，提供论文解析、手术机器人/新药/AI 场景匹配、临床方案生成与商业计划输出的一站式移动端工具，充分发挥鸿蒙端侧原生智能与端边云协同能力。

---

## 大赛评分维度对标

| 评分维度（100分） | 本端实现 |
|:---|:---|
| **创新应用**（25分） | 首个面向转化医学的鸿蒙原生OPC应用，开创"论文→临床→商业"全链路移动端方案 |
| **技术架构**（25分） | ArkTS声明式UI + 端侧原生智能 + 端边云协同架构，轻量化OPC独立部署 |
| **功能完备**（25分） | 4大标签页（方案/匹配/知识库/设置）+ 自适应布局（手机/平板）+ Demo离线模式 |
| **商业前景**（25分） | 覆盖器械/制药/AI/术式四大转化医学细分市场，服务苏州工业园区生物医药产业 |

### 华为云码道智能体专项加分（10分）

- **全流程参与**：码道智能体参与从需求拆解、页面搭建、网络层封装到调试上线的全链路研发
- **核心能力运用**：多文件协同生成（页面+组件+工具类）、代码重构优化、静态检查
- **特色能力联动**：鸿蒙ArkTS适配、多模型切换辅助、CodeArts生态联动
- 研发日记详见 `../harmony-web/docs/CodeArts_Agent_DevLog.md`

---

## 技术栈

| 层 | 技术 |
|---|------|
| UI 框架 | ArkTS / ArkUI（声明式） |
| SDK | HarmonyOS NEXT API 12+（targetSdk 6.1.1） |
| 构建工具 | Hvigor（hvigorw） |
| 网络通信 | `@kit.NetworkKit`（HTTP）+ WebSocket |
| 后端 | FastAPI（Python 3.12），共用 `../harmony-web/backend/` |

---

## 项目结构

```
harmony-os/
├── AppScope/                       # 应用级配置与图标
├── entry/                          # 主模块
│   └── src/main/
│       ├── ets/
│       │   ├── entryability/       # 应用入口（Ability启动）
│       │   ├── pages/
│       │   │   ├── Index.ets               # 主页面（Tabs + 抽屉菜单）
│       │   │   ├── components/
│       │   │   │   ├── ChatPanel.ets       # 智能助手聊天面板
│       │   │   │   └── DrawerMenu.ets      # 侧滑抽屉菜单
│       │   │   └── tabs/
│       │   │       ├── PlanTab.ets         # 方案页（工作流/论文/方案生成）
│       │   │       ├── MatchTab.ets        # 机器人匹配页
│       │   │       ├── KnowledgeTab.ets    # 知识库检索页
│       │   │       └── SettingsTab.ets     # 设置页（API配置/CI-CD/模型切换）
│       │   └── utils/
│       │       ├── Types.ets               # 全部类型定义与常量
│       │       ├── HarmonyTypes.ets        # 鸿蒙设备协同类型定义
│       │       ├── HttpUtil.ets            # HTTP请求封装 + Demo数据
│       │       ├── WsUtil.ets              # WebSocket连接管理
│       │       └── NpuSanitizer.ets        # NPU隐私数据脱敏
│       ├── resources/              # 资源文件（颜色/字符串/图片/页面路由）
│       └── module.json5            # 模块清单
├── hvigor/                         # 构建配置
├── build-profile.json5             # 根构建配置
├── oh-package.json5                # 包定义
└── .gitignore
```

---

## 环境要求

- **DevEco Studio** 5.0 或更高版本
- **HarmonyOS SDK** API 12+（纯血鸿蒙 / HarmonyOS NEXT）
- **Node.js** ≥ 18.x
- 真机或模拟器运行 HarmonyOS NEXT 版本

> 不支持 HarmonyOS 4.2 及更早版本（API 9/10），项目使用了 API 12 专属组件。

---

## 新设备环境复现

本项目仓库仅保留源代码与配置文件，不包含可重新生成的依赖包与构建产物（如 `oh_modules/`、`.hvigor/`、`build/`）。在新设备上按以下步骤即可完整复现：

### 1. 恢复依赖

```bash
cd harmony-os
ohpm install       # 根据 oh-package-lock.json5 精确恢复所有 ohpm 依赖
```

### 2. 构建验证

**DevEco Studio：** 打开项目根目录，点击 `Build` → `Build HAP(s)`。

**命令行：**
```bash
hvigorw assembleHap   # 编译 Debug HAP，产物在 entry/build/default/outputs/default/
```

### 3. 连接后端

Web 后端需先在 `../harmony-web/` 下完成环境复现（参考 [Web 端新设备复现](../harmony-web/README.md#新设备环境复现)），然后在本应用设置中填入后端地址。

---

## 快速开始

### 1. 安装依赖

```bash
ohpm install
```

### 2. 构建与运行

**DevEco Studio：** 打开项目根目录，点击 `Run` → 选择目标设备。

**命令行：**

```bash
# Debug HAP（调试用）
hvigorw assembleHap

# Release APP（发布用，需签名）
hvigorw assembleApp
```

产物在 `entry/build/default/outputs/default/`，通过 `hdc install` 安装或拖入模拟器。

### 3. 连接后端

1. 启动 FastAPI 后端（见 `../harmony-web/backend/`）：
   ```bash
   cd ../harmony-web
   # Windows: .venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   # macOS/Linux: .venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```
2. 进入 app **设置** → **API 端点** 填入后端地址（如 `http://192.168.1.100:8000`）
3. 填入 API 密钥，选择模型提供商（盘古/DeepSeek/OpenAI/GLM/Gemini）
4. 点击"保存配置"

---

## Demo 模式

默认开启 Demo 模式，无需后端即可离线体验全部功能：

- 4 个预设论文（器械/制药/AI/外科领域）
- 各领域匹配对应的手术机器人/CDMO/GCP 基地/AI 平台
- 自动生成参数化的临床方案与商业计划模板
- 内置Mock数据覆盖全部分析流程

关闭 Demo 模式：设置 → 关闭"Demo 模式"开关 → 填写 API 密钥 → 保存。

---

## 功能概览

| 标签页 | 功能 | 大赛亮点 |
|--------|------|----------|
| **方案** | 论文上传/预设选择 → 三步工作流（技术理解 → 场景匹配 → 执行输出）→ 临床方案 + 商业计划生成 → 智能助手聊天 | AI深度融合 + OPC全链路 |
| **匹配** | 根据论文参数自动匹配手术机器人 / CDMO 平台 / GCP 基地 / AI 影像系统 | AI多模态感知 + 智能决策 |
| **知识库** | RAG 知识检索，支持关键词搜索，覆盖器械/制药/AI/术式四大领域 | 垂直领域知识赋能 |
| **设置** | API 配置（端点/密钥/模型提供商切换）、CI/CD 面板、模型性能基准、实时同步状态 | 多模型灵活切换 + 码道生态联动 |

---

## 鸿蒙端侧优势

本端充分利用 HarmonyOS NEXT 原生能力，在以下方面形成差异化竞争力：

| 能力 | 实现方式 | 大赛加分项 |
|------|----------|-----------|
| **端侧原生智能** | ArkTS声明式UI + 系统级AI能力调用 | 端边云协同架构加分 |
| **跨终端自适应** | 手机（< 720vp）单列 / 平板（≥ 720vp）左右双栏，`onAreaChange` 实时检测 | 鸿蒙体验加分 |
| **星闪协议适配** | WebSocket模拟星闪近场通信（`WsUtil.ets`），API签名与真实SDK对齐 | 跨终端能力加分 |
| **NPU隐私脱敏** | 前端NPU正则脱敏（患者ID/手机号/身份证号），`NpuSanitizer.ets` | 安全合规 |
| **元服务卡片** | 支持HarmonyOS元服务卡片预览与设备发现 | 鸿蒙生态联动 |

---

## 自适应布局

应用支持手机和平板两种形态：

- **手机（< 720vp）：** 单列纵向滚动布局
- **平板（≥ 720vp）：** 方案页自动切换为左右双栏 —— 左侧为输入操作区，右侧为方案输出区

切换由 `onAreaChange` 实时检测屏幕宽度驱动，无需手动设置。

---

## 相关文档

- 项目整体介绍：[`../README.md`](../README.md)
- Web端文档：[`../harmony-web/README.md`](../harmony-web/README.md)
- 码道智能体研发日记：[`../harmony-web/docs/CodeArts_Agent_DevLog.md`](../harmony-web/docs/CodeArts_Agent_DevLog.md)
- 大赛评分标准：[`../大赛评分标准以及使用华为云码道加分细则.md`](../大赛评分标准以及使用华为云码道加分细则.md)
