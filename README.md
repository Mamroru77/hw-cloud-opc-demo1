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
| **技术架构** | 25 | React 19 + FastAPI 微服务 + 5模型降级链 + ChromaDB向量库 + Docker容器化；端边云协同鸿蒙适配；轻量化OPC架构支持一人独立开发部署运维 |
| **功能完备** | 25 | 9个API路由模块 + 8个前端组件 + 3个Zustand Store + 27项pytest测试全部通过；Glassmorphic+Neumorphic专业级UI；双模降级（Demo/大模型联调） |
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
│   ├── infra/                      #   基础设施
│   │   ├── chroma_client.py        #     ChromaDB向量库封装
│   │   ├── knowledge_base.py       #     硬编码知识库(降级用)
│   │   └── ws_server.py            #     WebSocket服务
│   ├── models/                     #   数据模型（5个Schema文件）
│   ├── routers/                    #   API路由（9个模块）
│   │   ├── state.py                #     会话状态管理
│   │   ├── analyze.py              #     论文解析+领域分类
│   │   ├── scenarios.py            #     临床场景匹配
│   │   ├── chat.py                 #     医算子对话
│   │   ├── docs.py                 #     文档生成
│   │   ├── knowledge.py            #     知识库CRUD+审核
│   │   ├── harmony.py              #     鸿蒙设备协同
│   │   ├── cicd.py                 #     CI/CD流水线
│   │   └── models.py               #     模型管理
│   ├── services/                   #   业务服务（10个模块）
│   │   ├── analyze_service.py      #     论文解析+领域分类
│   │   ├── chat_service.py         #     对话上下文组装
│   │   ├── knowledge_service.py    #     知识库+审核流程
│   │   ├── rag_service.py          #     RAG向量检索+降级
│   │   ├── model_router_service.py #     模型降级链
│   │   ├── devlog_service.py       #     研发日志
│   │   ├── cicd_service.py         #     CI/CD服务
│   │   ├── harmony_ws_service.py   #     鸿蒙WebSocket
│   │   ├── npu_sanitizer_service.py#     NPU脱敏
│   │   └── doc_generator.py        #     文档模板引擎
│   ├── scripts/
│   │   └── init_knowledge.py       #     知识库初始化脚本
│   └── tests/                      #   pytest测试 (27 tests)
├── src/                            # React 19 + TypeScript 前端
│   ├── App.tsx                     #   主应用（内置CustomEChart）
│   ├── App.css                     #   全局样式 + 响应式断点
│   ├── main.tsx                    #   入口 (HarmonyOS UA检测)
│   ├── components/                 #   8个UI组件
│   │   ├── ModelSelector.tsx       #     模型选择器（5模型切换）
│   │   ├── KnowledgeManager.tsx    #     知识库管理（拖拽上传）
│   │   ├── RAGReferencePanel.tsx   #     RAG引用面板（相似度评分）
│   │   ├── NpuSandboxPanel.tsx     #     NPU沙箱面板
│   │   ├── HarmonyDrawer.tsx       #     鸿蒙设备抽屉
│   │   ├── HarmonyWidget.tsx       #     鸿蒙卡片预览
│   │   ├── CICDStatusPanel.tsx     #     CI/CD状态面板
│   │   └── PipelineStatusWidget.tsx#     流水线状态组件
│   ├── hooks/                      #   自定义Hooks（3个）
│   ├── stores/                     #   Zustand状态管理（3个Store）
│   └── lib/                        #   工具库（6个模块）
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
# 27 tests, all passed
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19, TypeScript 6, Vite 8, Zustand 5, ECharts 6, Framer Motion |
| 后端 | FastAPI, Python 3.12, ChromaDB, sentence-transformers |
| 部署 | Docker, Nginx, CodeArts Pipeline, CCE |
| 知识库 | ChromaDB (向量) + 硬编码字典 (降级) |
| 鸿蒙适配 | WebSocket模拟星闪, NPU正则脱敏, UA检测 |
| LLM | 盘古/DeepSeek/OpenAI/GLM-5/Gemini 多模型降级链 |

---

## 相关文档

- 项目整体介绍：[`../README.md`](../README.md)
- 鸿蒙端文档：[`../harmony-os/README.md`](../harmony-os/README.md)
- 码道智能体研发日记：[`docs/CodeArts_Agent_DevLog.md`](docs/CodeArts_Agent_DevLog.md)
- 实现计划：[`docs/implementation_plan.md`](docs/implementation_plan.md)
- 智能体规格：[`.agents/spec.md`](.agents/spec.md)
- 大赛评分标准：[`../大赛评分标准以及使用华为云码道加分细则.md`](../大赛评分标准以及使用华为云码道加分细则.md)
