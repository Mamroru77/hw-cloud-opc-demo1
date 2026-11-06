# 云脉·智慧医疗｜转化医学 AI 工作站

> 以 **27 项结构化参数**为核心，将医学论文解析、成果落地匹配与临床/商业方案生成串联为可交互的工作流。

面向临床研究者、医疗创新团队与成果转化场景的轻量级原型项目，采用 **Web 工作站 + HarmonyOS 移动端**的仓库结构。本 README 重点介绍已有技术文档覆盖的 **Web 端**实现；移动端详见 [HarmonyOS README](harmony-os/README.md)。

**项目背景：**“华为云杯”2026 人工智能 OPC 应用创新大赛 · 智慧医疗方向。

## 核心工作流

```text
论文 PDF / 文本
    ↓
① 识别领域并提取技术参数（27 字段 SessionState）
    ↓
② 匹配 Top 3 转化落地场景（含兼容度评分）
    ↓
③ 生成临床研究方案 + 商业计划书（Markdown）
```

贯穿流程的 **「医算子」AI 顾问**支持自然语言调整科室、融资额及领域参数，并将变更写回统一状态，供后续匹配和文档生成使用。

| 领域 | 标识 | 典型参数或场景 |
| --- | --- | --- |
| 医疗器械 | `devices` | 激发/发射波长、半衰期、手术导航设备 |
| 创新药物 | `drugs` | 靶点、适应症、剂量限制性毒性、CDMO/GCP |
| 医疗 AI | `ai` | 影像模态、AUC、推理延迟、PACS 接入 |
| 临床术式 | `surgical` | 解剖部位、核心器械、学习曲线、实训基地 |

## 核心能力

- **论文解析与参数化：**支持大模型抽取与本地关键词规则两条路径，统一映射至 27 字段状态。
- **领域场景匹配：**按医疗器械、药物、医疗 AI、临床术式采用不同规则，返回 Top 3 候选及评分。
- **文档生成：**输出临床方案和商业计划书；无可用模型时回退到四领域共 8 套本地模板。
- **知识增强：**ChromaDB 向量检索、关键词降级、知识文档上传审核及审计日志。
- **模型与可用性：**提供盘古、DeepSeek、OpenAI、GLM、Gemini 适配器及失败降级；支持无 API Key 的 Demo 模式，前端在后端不可达时也可使用本地 Mock 继续演示。
- **工程集成：**CodeArts 流水线状态/质量面板、Docker Compose、设备协同 WebSocket 模拟及正则脱敏沙箱。

## 技术架构

```text
Web UI（React 19 · TypeScript 6 · Vite 8 · Zustand · ECharts）
                       │ HTTP / WebSocket
                       ▼
FastAPI（9 个路由模块 · 22 个 API 端点）
  ├── SessionState：27 字段，驱动业务流程
  ├── LLM Adapters：5 模型路由与降级
  ├── RAG：ChromaDB → 关键词检索
  ├── Services：论文解析 / 场景匹配 / 文档生成 / 医算子
  └── Integrations：CodeArts / Harmony 模拟 / 脱敏
```

**设计要点：**核心参数状态贯穿解析、匹配、生成及对话；模型、检索和文档生成均有本地兜底路径。Web 后端为单体 FastAPI 应用，便于本地启动与单人维护，不应理解为已实现多用户隔离的生产级微服务。

## 快速开始

### 本地开发

环境：Python 3.12、Node.js（满足 Vite 8 的版本要求）和 npm。

```bash
git clone https://github.com/Mamroru77/hw-cloud-opc-demo1.git
cd hw-cloud-opc-demo1/harmony-web

# 终端 1：启动后端
python -m venv .venv
source .venv/bin/activate   # macOS/Linux；Windows 改用 .venv\Scripts\activate
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

```bash
# 终端 2：在 harmony-web/ 下启动前端
npm install --include=dev
npm run dev
```

- Web 页面：<http://localhost:5173>
- API 文档：<http://127.0.0.1:8000/docs>
- 无 API Key 可体验 Demo；在界面中配置支持的模型 Key 后可进行实际模型联调。
- Windows 也可使用 `harmony-web/start-backend.bat` 和 `start-frontend.bat`。

### Docker Compose

```bash
cd harmony-web/docker
docker compose up --build
```

默认映射：前端 `http://localhost:3000`，后端 `http://localhost:8000`。**当前前端 API 地址仍使用本机 `127.0.0.1:8000`；远程访问或正式容器部署前需调整 API 地址/反向代理配置。**

### 测试与构建

在 `harmony-web/` 目录执行：

```bash
python -m pytest backend/tests/ -v
npm run lint
npm run build
```

后端包含 27 个 pytest 用例，覆盖解析、场景匹配、状态、知识库、模型路由及集成接口。

## 项目目录

```text
.
├── harmony-web/
│   ├── src/            # React 前端、组件、Hooks、状态
│   ├── backend/        # FastAPI 路由、服务、模型适配器、测试
│   ├── docker/         # Compose、Dockerfile、流水线配置
│   └── docs/           # 研发文档
└── harmony-os/         # HarmonyOS 移动端工程
```

详细实现与配置参见 [Web 端说明](harmony-web/README.md)、[HarmonyOS 端说明](harmony-os/README.md) 和 [CodeArts 研发日志](harmony-web/docs/CodeArts_Agent_DevLog.md)。

## 当前边界

- **单用户原型：**后端使用进程级全局状态；知识待审队列与部分审计记录保存在内存中，尚不支持可靠的多用户会话隔离和持久化。
- **演示功能与真实能力有区别：**设备发现/星闪通道为模拟实现；“NPU 脱敏”目前是正则规则处理，不能视作已接入真实 NPU 或完整的医疗数据匿名化方案。
- **生产部署仍需加固：**包括接口鉴权、HTTPS、CORS 收紧、容器通信地址及部分模型适配器配置。请勿直接用于承载真实患者敏感数据。
- **非临床决策工具：**生成的临床方案和商业计划书仅供研究及成果转化讨论，具体剂量、样本量、法规依据和财务假设须由专业人员核验，不能直接用于伦理申报或临床决策。
