# 云脉 — 智慧医疗转化医学多智能体工作站

> **"华为云杯"2026人工智能OPC应用创新大赛 · 场景五：智慧医疗——"从实验室到临床"的转化医学 Agent**

---

## 项目定位

基于多智能体协同机制的端到端转化医学工作站，打通"学术论文 → 物理/药理/算法参数提取 → 临床场景适配 → 商业方案生成"全链路。覆盖四大转化医学细分领域：

| 领域 | 代号 | 典型场景 |
|------|------|----------|
| 医疗器械与成像分子 | `devices` | 荧光探针、造影剂、CT/MRI设备 |
| 创新药物与生物治疗 | `drugs` | 靶向小分子、抗体药、基因/细胞治疗 |
| 医疗AI与智能诊断 | `ai` | 医学影像分割、AI辅助筛查(SaMD) |
| 创新临床术式与疗法 | `surgical` | 腹腔镜/胸腔镜微创改良术式 |

---

## 核心能力矩阵（对标大赛5大技术要求）

### 5.1 码道平台特色能力联动
- `pipeline.yaml` CI/CD流水线配置（代码检查 → 单元测试 → 构建 → CCE部署）
- `checkrule.yaml` 安全检查规则（密钥泄露/NPU脱敏合规）
- DevLog研发日志服务 + 实时流水线状态监控面板
- Insight质量报告Tab（ECharts图表展示代码质量趋势）

### 5.2 CodeArts生态联动
- Docker化部署方案（`Dockerfile.frontend` + `Dockerfile.backend` + `docker-compose.yml`）
- Nginx反向代理配置，前后端统一入口
- 代码推送至CodeArts Repo，流水线自动触发
- CCE云容器引擎部署阶段配置

### 5.3 私有知识库与企业规范对齐
- ChromaDB向量数据库持久化存储（`chroma_data/`）
- RAG检索增强：向量搜索 + 关键字降级双模
- 知识库审核流程（上传 → 待审批 → 通过/拒绝）
- 审计日志完整记录
- 华为云知识湖适配器（降级至本地字典）
- 前端：KnowledgeManager拖拽上传 + RAGReferencePanel相似度评分

### 5.4 鸿蒙系统适配
- INearLinkAdapter接口 + WebSocket模拟星闪协议层（API签名与真实SDK对齐，未来可零修改替换）
- 后端WebSocket服务（`harmony_ws_service.py`）
- NPU正则脱敏（前后端双重：患者ID/手机号/身份证号）
- NpuSandboxPanel可视化沙箱面板
- HarmonyDrawer组件（设备发现/协同/数据传输）
- HarmonyWidget卡片预览
- 响应式CSS布局 + HarmonyOS UA检测
- 断点续传localStorage缓存

### 5.5 多模型切换能力
- BaseLLMAdapter基类 + 5大模型适配器（盘古/DeepSeek/OpenAI/GLM/Gemini）
- **盘古真实API适配器**（`is_proxy=False`，直连华为云，非DeepSeek转发）
- ModelRouterService降级链（pangu → deepseek → openai → glm → gemini）
- 前端ModelSelector + Token监控 + ModelBenchmarkPanel（ECharts图表）

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
ver3_antigravity_CodeArts/
├── backend/                        # FastAPI 后端
│   ├── main.py                     # 应用入口 + 路由注册
│   ├── requirements.txt            # Python 依赖
│   ├── adapters/                   # LLM适配器层
│   │   ├── base_llm_adapter.py     #   抽象基类
│   │   ├── pangu_adapter.py        #   盘古真实API (is_proxy=False)
│   │   ├── glm_adapter.py          #   GLM-5.0
│   │   ├── deepseek_adapter.py     #   DeepSeek-V3
│   │   ├── openai_adapter.py       #   GPT-4o
│   │   └── gemini_adapter.py       #   Gemini Pro
│   ├── infra/                      # 基础设施
│   │   ├── chroma_client.py        #   ChromaDB向量库封装
│   │   ├── knowledge_base.py       #   硬编码知识库(降级用)
│   │   └── ws_server.py            #   WebSocket服务
│   ├── models/                     # 数据模型
│   │   ├── schemas.py              #   会话状态Schema
│   │   ├── llm_models.py           #   LLM请求/响应模型
│   │   ├── pipeline_status.py      #   流水线状态
│   │   ├── model_benchmark.py      #   模型性能基准
│   │   └── audit_log.py            #   审计日志
│   ├── routers/                    # API路由
│   │   ├── state.py                #   会话状态管理
│   │   ├── analyze.py              #   论文解析
│   │   ├── scenarios.py            #   临床场景匹配
│   │   ├── chat.py                 #   医算子对话
│   │   ├── docs.py                 #   文档生成
│   │   ├── knowledge.py            #   知识库CRUD+审核
│   │   ├── harmony.py              #   鸿蒙设备协同
│   │   ├── cicd.py                 #   CI/CD流水线
│   │   └── models.py               #   模型管理
│   ├── services/                   # 业务服务
│   │   ├── analyze_service.py      #   论文解析+领域分类
│   │   ├── chat_service.py         #   对话上下文组装
│   │   ├── knowledge_service.py    #   知识库+审核
│   │   ├── rag_service.py          #   RAG向量检索+降级
│   │   ├── model_router_service.py #   模型降级链
│   │   ├── devlog_service.py       #   研发日志
│   │   ├── cicd_service.py         #   CI/CD服务
│   │   ├── harmony_ws_service.py   #   鸿蒙WebSocket
│   │   ├── npu_sanitizer_service.py#   NPU脱敏
│   │   └── doc_generator.py        #   文档模板引擎
│   ├── scripts/
│   │   └── init_knowledge.py       #   知识库初始化脚本
│   └── tests/                      # pytest测试 (27 tests)
│       ├── conftest.py             #   测试配置 + ChromaDB mock
│       ├── test_analyze.py         #   论文解析测试
│       ├── test_scenarios.py       #   场景匹配测试
│       ├── test_knowledge.py       #   知识库测试
│       ├── test_harmony.py         #   鸿蒙适配测试
│       ├── test_cicd.py            #   CI/CD测试
│       ├── test_models.py          #   模型路由测试
│       └── test_state.py           #   状态管理测试
├── src/                            # React 19 + TypeScript 前端
│   ├── App.tsx                     # 主应用
│   ├── App.css                     # 全局样式 + 响应式断点
│   ├── main.tsx                    # 入口 (HarmonyOS UA检测)
│   ├── components/                 # UI组件
│   │   ├── ModelSelector.tsx       #   模型选择器
│   │   ├── ModelBenchmarkPanel.tsx #   模型性能面板 (ECharts)
│   │   ├── KnowledgeManager.tsx    #   知识库管理 (拖拽上传)
│   │   ├── RAGReferencePanel.tsx   #   RAG引用面板 (相似度)
│   │   ├── NpuSandboxPanel.tsx     #   NPU沙箱面板
│   │   ├── HarmonyDrawer.tsx       #   鸿蒙设备抽屉
│   │   ├── HarmonyWidget.tsx       #   鸿蒙卡片预览
│   │   ├── CICDStatusPanel.tsx     #   CI/CD状态面板
│   │   └── PipelineStatusWidget.tsx#   流水线状态组件
│   ├── hooks/                      # 自定义Hooks
│   │   ├── useWebSocket.ts         #   WebSocket连接
│   │   ├── useModelRouter.ts       #   模型路由
│   │   └── useVectorSearch.ts      #   向量搜索
│   ├── stores/                     # Zustand状态管理
│   │   ├── modelStore.ts           #   模型状态
│   │   ├── knowledgeStore.ts       #   知识库状态
│   │   └── harmonyStore.ts         #   鸿蒙状态
│   └── lib/                        # 工具库
│       ├── types.ts                #   类型定义
│       ├── constants.ts            #   常量
│       ├── api.ts                  #   API客户端
│       ├── wsNearLinkSim.ts        #   星闪协议模拟
│       └── npuSanitizer.ts         #   NPU脱敏
├── docker/                         # 部署配置
│   ├── Dockerfile.frontend         # 前端Nginx容器
│   ├── Dockerfile.backend          # 后端Python容器
│   ├── docker-compose.yml          # 本地编排
│   ├── nginx.conf                  # Nginx配置
│   ├── pipeline.yaml               # CI/CD流水线
│   └── checkrule.yaml              # 安全检查规则
├── docs/                           # 项目文档
│   ├── CodeArts_Agent_DevLog.md    # 码道智能体研发日记 (大赛加分项)
│   ├── implementation_plan.md      # 实现计划
│   ├── task.md                     # 任务定义
│   └── walkthrough.md              # 演练指南
├── .agents/                        # CodeArts智能体规格文档
│   ├── spec.md                     # 技术规格 (5大方向评估)
│   ├── requirements.md             # EARS格式需求 (27条)
│   ├── design.md                   # 技术设计
│   ├── tasks.md                    # 编码任务规划 (50个)
│   └── AGENTS.md                   # 智能体协议
├── public/                         # 静态资源
├── index.html                      # Vite入口
├── package.json                    # 前端依赖
├── vite.config.ts                  # 构建配置
└── tsconfig.json                   # TypeScript配置
```

---

## 快速启动

### 环境要求
- Python 3.12+ & Node.js 18+
- 推荐使用虚拟环境

### 1. 启动后端

```bash
# 创建虚拟环境 (推荐 Python 3.12)
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # Linux/macOS

# 安装依赖
pip install -r backend/requirements.txt

# 初始化知识库 (可选，首次运行)
python backend/scripts/init_knowledge.py

# 启动服务
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### 2. 启动前端

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173/`

### 3. Docker部署 (可选)

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
# 激活虚拟环境后
python -m pytest backend/tests/ -v
# 27 tests, all passed
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19, TypeScript, Vite 8, Zustand, ECharts |
| 后端 | FastAPI, Python 3.12, ChromaDB, sentence-transformers |
| 部署 | Docker, Nginx, CodeArts Pipeline |
| 知识库 | ChromaDB (向量) + 硬编码字典 (降级) |
| 鸿蒙适配 | WebSocket模拟星闪, NPU正则脱敏 |
| LLM | 盘古/DeepSeek/OpenAI/GLM-5/Gemini 多模型降级链 |

---

## 大赛加分项

- **码道智能体研发日记**: [`docs/CodeArts_Agent_DevLog.md`](docs/CodeArts_Agent_DevLog.md) — 详细记录智能体协同开发过程、9个技术Debug案例、4.5倍提效量化分析
- **规格驱动开发**: `.agents/` 目录下完整的 spec → requirements → design → tasks 文档链路
