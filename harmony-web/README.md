# 云脉 — 智慧医疗转化医学多智能体工作站（Web端）

> **"华为云杯"2026人工智能OPC应用创新大赛 · 场景五：智慧医疗——"从实验室到临床"的转化医学 Agent**
>
> 基于多智能体协同机制的端到端转化医学工作站，打通"学术论文 → 物理/药理/算法参数提取 → 临床场景适配 → 商业方案生成"全链路。
>
> **姊妹项目：** [云脉·智慧医疗（鸿蒙端）](../harmony-os/README.md) —— HarmonyOS NEXT 原生移动端应用。

---

## 大赛评分维度对标

### 基础评分（100分）

| 评分维度 | 分值 | 本端实现要点 |
|:---|:---:|:---|
| **创新应用** | 25 | 首个转化医学多智能体工作站，开创"论文→临床→商业"OPC全链路；四大细分领域（器械/制药/AI/术式）差异化方案 |
| **技术架构** | 25 | React 19 + FastAPI (SSE 流式) + 5模型降级链 + SQLite WAL + ChromaDB/TF-IDF 混合检索 + Docker容器化；轻量化自包含 OPC 架构支持一人独立开发部署运维 |
| **功能完备** | 25 | 11个API路由模块(33 REST/SSE端点) + 18个前端组件 + 3个Zustand Store + 39项后端测试全部通过；Arc × Craft UI；原文溯源、Function Calling、`.docx`/`.pdf` 导出与 JWT/RBAC |
| **商业前景** | 25 | 精准服务苏州工业园区生物医药/医疗器械/AI诊断产业；明确的投资回报路径与市场推广可行性 |

### 华为云码道智能体专项加分（10分）

| 加分维度 | 本端实现 |
|:---|:---|
| **全流程参与度** | 码道智能体参与从需求拆解（`.agents/requirements.md` 27条EARS需求）→ 规格设计（`.agents/spec.md`）→ 编码实现（50个任务）→ 测试验证 → 部署上线的全链路 |
| **核心能力运用** | 代码检索、多文件协同生成（前后端8+组件/9+路由）、单元测试自动生成、代码重构优化、静态检查（`.oxlintrc.json`） |
| **特色能力联动** | CodeArts Pipeline（`pipeline.yaml` + `checkrule.yaml`）、私有知识库对齐（ChromaDB + 审核流程）、鸿蒙适配（星闪模拟/NPU脱敏）、多模型切换（5大适配器） |
| **合理性与效率提升** | 9个技术Debug案例记录于 `docs/CodeArts_Agent_DevLog.md`，量化分析4.5倍研发提效 |

> 详细研发过程记录：[`docs/CodeArts_Agent_DevLog.md`](docs/CodeArts_Agent_DevLog.md)

---

## 项目定位

覆盖四大转化医学细分领域：

| 领域 | 代号 | 典型场景 |
|------|------|----------|
| 医疗器械与成像分子 | `devices` | 荧光探针、造影剂、CT/MRI设备 |
| 创新药物与生物治疗 | `drugs` | 靶向小分子、抗体药、基因/细胞治疗 |
| 医疗AI与智能诊断 | `ai` | 医学影像分割、AI辅助筛查(SaMD) |
| 创新临床术式与疗法 | `surgical` | 腹腔镜/胸腔镜微创改良术式 |

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19 + Vite 8)              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Model    │ │Knowledge │ │Harmony   │ │CICD      │ │NPU     │ │
│  │Selector │ │Manager   │ │Drawer    │ │Status    │ │Sandbox │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │           │            │             │            │       │
│  ┌────┴───────────┴────────────┴─────────────┴────────────┴────┐ │
│  │              Zustand Stores (harmony/model/knowledge)        │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │ HTTP/WebSocket                       │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                   Backend (FastAPI + Python 3.12)               │
│  ┌────────────┐ ┌─────────┴─┐ ┌──────────┐ ┌────────────────┐ │
│  │ LLM        │ │Knowledge  │ │ Harmony  │ │ CICD           │ │
│  │ Adapters   │ │ Service   │ │ WS Svc   │ │ Service        │ │
│  │(盘古/DS/   │ │(ChromaDB+ │ │(星闪模拟)│ │(Pipeline+      │ │
│  │ OAI/GLM/   │ │ RAG+降级) │ │          │ │ DevLog+Insight)│ │
│  │ Gemini)    │ │           │ │          │ │                │ │
│  └─────┬──────┘ └─────┬─────┘ └─────┬────┘ └───────┬────────┘ │
│        │              │             │              │           │
│  ┌─────┴──────────────┴─────────────┴──────────────┴────────┐ │
│  │              Model Router (降级链 + Provider识别)          │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 项目结构

```
harmony-web/
├── backend/                        # FastAPI 后端（Python 3.12）
│   ├── main.py                     #   应用入口 + 路由注册
│   ├── requirements.txt            #   Python 依赖
│   ├── adapters/                   #   LLM适配器层（5大模型）
│   │   ├── base_llm_adapter.py     #     抽象基类
│   │   ├── pangu_adapter.py        #     盘古真实API (is_proxy=False)
│   │   ├── glm_adapter.py          #     GLM-5.0
│   │   ├── deepseek_adapter.py     #     DeepSeek-V3
│   │   ├── openai_adapter.py       #     GPT-4o
│   │   └── gemini_adapter.py       #     Gemini Pro
│   ├── infra/                      #   基础设施（5个模块）
│   │   ├── chroma_client.py        #     ChromaDB向量库封装（支持 CHROMA_PERSIST_DIR）
│   │   ├── db.py                   #     SQLite WAL 8表持久化与用户/法规种子初始化
│   │   ├── knowledge_base.py       #     24条权威医学法规基准库（四领域各6条）
│   │   ├── pdf_parser.py           #     PDF分页/表格解析、参考文献剥离与扫描件检测
│   │   └── ws_server.py            #     WebSocket服务
│   ├── models/                     #   数据模型（5个Schema文件）
│   ├── routers/                    #   API路由（11个模块，33 REST/SSE端点）
│   │   ├── state.py                #     会话状态管理（SQLite持久化）
│   │   ├── papers.py               #     自定义论文与历史成果持久化
│   │   ├── analyze.py              #     论文解析+领域分类+原文溯源(param_citations)
│   │   ├── scenarios.py            #     临床场景匹配
│   │   ├── chat.py                 #     医算子对话与 /stream SSE 流式调参
│   │   ├── docs.py                 #     文档生成、/stream SSE 流式与 .docx OpenXML 导出
│   │   ├── knowledge.py            #     知识库CRUD+RBAC人工审核流程
│   │   ├── auth.py                 #     HS256 JWT 签发与角色切换 (/api/auth/*)
│   │   ├── harmony.py              #     鸿蒙设备协同
│   │   ├── cicd.py                 #     CI/CD流水线
│   │   └── models.py               #     模型管理与密钥状态检测
│   ├── services/                   #   业务服务（12个模块）
│   │   ├── analyze_service.py      #     论文解析+领域分类+页码/原句溯源
│   │   ├── auth_service.py         #     HS256 JWT 鉴权与 RBAC 校验
│   │   ├── chat_service.py         #     对话上下文组装+<state_patch> Function Calling
│   │   ├── knowledge_service.py    #     知识库管理+章节层级继承切片+审计日志
│   │   ├── rag_service.py          #     RAG混合检索+医学术语重排(Medical Reranker)
│   │   ├── model_router_service.py #     模型降级链（同步 + SSE 流式首包探测降级）
│   │   ├── devlog_service.py       #     研发日志
│   │   ├── cicd_service.py         #     CI/CD服务
│   │   ├── harmony_ws_service.py   #     鸿蒙WebSocket
│   │   ├── npu_sanitizer_service.py#     NPU脱敏
│   │   ├── doc_generator.py        #     统一临床/商业文档模板引擎
│   │   └── doc_exporter.py         #     纯标准库 ECMA-376 OpenXML .docx 生成器
│   ├── scripts/
│   │   └── init_knowledge.py       #     知识库初始化脚本
│   └── tests/                      #   后端单元与集成测试 (10个模块 · 39 tests)
├── src/                            # React 19 + TypeScript 6 前端
│   ├── App.tsx                     #   工作台状态编排与 SSE 流式驱动
│   ├── main.tsx                    #   入口 (HarmonyOS UA检测)
│   ├── components/                 #   18个模块化UI组件
│   │   ├── TopHeaderBar.tsx        #     顶部导航、5模型Popover与抽屉入口
│   │   ├── LeftPaperRail.tsx       #     左侧论文队列、上传校验与主CTA
│   │   ├── CenterWorkspace.tsx     #     三Tab核心工作区与流水线进度
│   │   ├── ParamsTab.tsx           #     PK/ROC图表、可编辑参数卡与原文溯源抽屉
│   │   ├── MatchingTab.tsx         #     Top-3场景匹配卡片与五维雷达图
│   │   ├── DocsTab.tsx             #     双栏文档在线编辑及 .docx/.pdf/.md 导出
│   │   ├── RightCopilotSheet.tsx   #     医算子流式对话与参数Diff回执
│   │   ├── KnowledgeManager.tsx    #     RBAC角色切换、24法规统计与重排检索
│   │   ├── CICDStatusPanel.tsx     #     CI/CD状态与质量报告面板
│   │   └── ...                     #     OverlayDrawer / HarmonyDrawer / NpuSandboxPanel 等
│   ├── styles/                     #   Arc × Craft 设计令牌 (tokens.css) 与工作区样式
│   ├── utils/                      #   5个工具模块（含 docExporters / localChatEngine 等）
│   ├── hooks/                      #   自定义Hooks（3个）
│   ├── stores/                     #   Zustand状态管理（3个Store）
│   └── lib/                        #   工具库（5个模块：api/constants/types 等）
├── docker/                         # 部署配置
│   ├── Dockerfile.frontend         #   前端Nginx容器
│   ├── Dockerfile.backend          #   后端Python容器
│   ├── docker-compose.yml          #   本地编排
│   ├── nginx.conf                  #   Nginx反向代理
│   ├── pipeline.yaml               #   CI/CD流水线定义
│   └── checkrule.yaml              #   安全检查规则
├── docs/                           # 项目文档
│   ├── CodeArts_Agent_DevLog.md    #   码道智能体研发日记 (大赛加分)
│   ├── implementation_plan.md      #   实现计划
│   ├── task.md                     #   任务定义
│   └── walkthrough.md              #   演练指南
├── .agents/                        # CodeArts智能体规格文档
│   ├── spec.md                     #   技术规格
│   ├── requirements.md             #   EARS格式需求 (27条)
│   ├── design.md                   #   技术设计
│   ├── tasks.md                    #   编码任务 (50个)
│   └── AGENTS.md                   #   智能体协议
├── public/                         # 静态资源
├── index.html                      # Vite入口
├── package.json                    # 前端依赖
├── vite.config.ts                  # 构建配置
└── tsconfig.json                   # TypeScript配置
```

---

## 新设备环境复现

本项目仓库仅保留源代码与配置文件（约 70 MB），不包含可重新生成的依赖包与构建产物（如 `node_modules/`、`.venv/`）。在新设备上按以下步骤即可完整复现：

### 1. 恢复前端依赖

```bash
cd harmony-web
npm install        # 根据 package-lock.json 精确恢复所有 npm 依赖
npx vite build     # 验证构建成功
```

### 2. 恢复后端依赖

```bash
cd harmony-web
# Windows
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
# macOS/Linux
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt

# 验证后端可正常导入
.venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); from main import app; print('FastAPI app imported OK')"
```

### 3. 验证测试通过

```bash
# Windows
.venv\Scripts\python.exe -m pytest backend/tests/ -v
# macOS/Linux
.venv/bin/python -m pytest backend/tests/ -v
```

---

## 快速启动

### 环境要求
- **Python 3.12**（必须3.12，3.14的numpy/pydantic-core C扩展不兼容）
- Node.js 18+

> **重要**：系统PATH中`python`可能指向3.14，必须使用版本选择器（Windows: `py -3.12`，macOS/Linux: `python3.12`）创建虚拟环境。

### 1. 启动后端

```bash
# 用 Python 3.12 显式创建虚拟环境
# Windows
py -3.12 -m venv .venv
# macOS/Linux
python3.12 -m venv .venv

# 激活虚拟环境
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 安装依赖（必须用 .venv 内的 pip）
# Windows
.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
# macOS/Linux
.venv/bin/python -m pip install -r backend/requirements.txt

# 初始化知识库（可选，首次运行）
# Windows
.venv\Scripts\python.exe backend/scripts/init_knowledge.py
# macOS/Linux
.venv/bin/python backend/scripts/init_knowledge.py

# 启动服务
# Windows
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
# macOS/Linux
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

或者直接双击 `start-backend.bat` 一键启动。

### 2. 启动前端

```bash
# 安装依赖（必须加 --include=dev，否则不会安装 vite 等开发依赖）
npm install --include=dev

# 启动开发服务器
npx vite
```

浏览器打开 `http://localhost:5173/`

或者直接双击 `start-frontend.bat` 一键启动。

### 3. Docker部署（可选）

```bash
cd docker
docker-compose up --build
```

---

## UI视觉体系

采用 **Glassmorphic + Neumorphic** 混合美学：
- 无菌冰灰主色调 (`#eef2f6`)
- 高斯模糊玻璃面板 + 悬浮拟物阴影
- 四大领域自适应ECharts图表（PK代谢曲线/ROC诊断曲线/学习曲线/雷达图）

---

## 双模降级系统

| 模式 | 条件 | 行为 |
|------|------|------|
| Demo (Mock) | 后端不可达 / 无API Key | 前端内置高保真Mock状态机，数学算法公式渲染 |
| 大模型联调 | 后端运行 + API Key | 全链路LLM推理：论文解析 → 参数提取 → 文档生成 |

RAG服务同样支持降级：ChromaDB不可用时自动退回关键字检索。

---

## 测试

```bash
# Windows
.venv\Scripts\python.exe -m pytest backend/tests/ -v
# macOS/Linux
.venv/bin/python -m pytest backend/tests/ -v
# 39 tests (across 10 modules), all passed
# 前端静态检查（0 warnings, 0 errors）
npm run lint
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19, TypeScript 6, Vite 8, Zustand 5, ECharts 6, Framer Motion |
| 后端 | FastAPI (SSE 流式), Python 3.12, pypdf (分页/表格/去参考文献), OpenXML `.docx` 生成 |
| 持久化与鉴权 | SQLite WAL (8 张表), HS256 JWT + RBAC 双角色权限控制 |
| 部署 | Docker Compose (命名数据卷), Nginx (SSE 反代), CodeArts Pipeline, CCE |
| 知识库 | ChromaDB + SQLite TF-IDF 混合检索, 24 条权威法规, 层级切片 + 医学术语重排 |
| 鸿蒙适配 | WebSocket模拟星闪, NPU正则脱敏, UA检测 |
| LLM | 盘古/DeepSeek/OpenAI/GLM-5/Gemini 五模型降级链 + `<state_patch>` Function Calling |

---

## 相关文档

- 项目整体介绍：[`../README.md`](../README.md)
- 鸿蒙端文档：[`../harmony-os/README.md`](../harmony-os/README.md)
- 码道智能体研发日记：[`docs/CodeArts_Agent_DevLog.md`](docs/CodeArts_Agent_DevLog.md)
- 实现计划：[`docs/implementation_plan.md`](docs/implementation_plan.md)
- 智能体规格：[`.agents/spec.md`](.agents/spec.md)
- 大赛评分标准：[`../大赛评分标准以及使用华为云码道加分细则.md`](../大赛评分标准以及使用华为云码道加分细则.md)
