# OPC 转化医学 Agent 系统 — 五大技术要求改进编码任务规划

> **文档版本**: v1.0  
> **生成日期**: 2026-06-25  
> **文档类型**: 编码任务规划  
> **基于设计**: `.agents/design.md` v1.0  
> **基于需求**: `.agents/requirements.md` v1.0（27条EARS格式需求）  
> **总体策略**: 阶段0→阶段1→阶段2→阶段3→阶段4→阶段5，P0优先，依赖关系明确  

---

## 0. 阶段0：基础准备（前置依赖，2-3小时）

### TASK-0-01：初始化Git仓库
- **关联需求**: REQ-5.2-01（前置条件）
- **任务描述**: 在项目根目录初始化Git仓库，创建`.gitignore`配置文件，排除node_modules、__pycache__、.env、dist、*.pyc、chroma_data等，完成初始提交
- **涉及文件**:
  - 新增: `.gitignore`
- **验收标准**:
  - `git status`显示干净的工作树
  - `.gitignore`正确排除node_modules、dist、__pycache__、.env、chroma_data
  - `git log`可见初始提交记录
- **依赖任务**: 无
- **预估复杂度**: 低

### TASK-0-02：后端模块目录结构拆分
- **关联需求**: 全局（架构改进前提）
- **任务描述**: 创建`backend/routers/`、`backend/services/`、`backend/adapters/`、`backend/infra/`、`backend/models/`目录结构，将`main.py`中的路由逻辑拆分至routers模块，业务逻辑拆分至services模块，LLM调用拆分至adapters模块，数据模型拆分至models模块
- **涉及文件**:
  - 新增: `backend/routers/__init__.py`
  - 新增: `backend/services/__init__.py`
  - 新增: `backend/adapters/__init__.py`
  - 新增: `backend/infra/__init__.py`
  - 新增: `backend/models/__init__.py`
  - 修改: `backend/main.py`（精简至启动+路由注册，~200行）
- **验收标准**:
  - `python -m uvicorn backend.main:app`可正常启动
  - 原有API端点（`/api/analyze`、`/api/chat`等）功能不变
  - 目录结构符合design.md中1.2.2节定义的改进后结构
- **依赖任务**: TASK-0-01
- **预估复杂度**: 高

### TASK-0-03：前端组件目录结构拆分
- **关联需求**: 全局（架构改进前提）
- **任务描述**: 创建`src/components/`、`src/hooks/`、`src/lib/`、`src/stores/`目录，从`App.tsx`（2750行）拆出核心子组件（NpuSandboxPanel、HarmonyDrawer、ModelSelector等），创建hooks和lib目录骨架
- **涉及文件**:
  - 新增: `src/components/`（目录骨架）
  - 新增: `src/hooks/`（目录骨架）
  - 新增: `src/lib/`（目录骨架）
  - 新增: `src/stores/`（目录骨架）
  - 修改: `src/App.tsx`（精简至~800行，先做骨架拆分，具体组件改造在各阶段完成）
- **验收标准**:
  - `npm run dev`前端正常启动
  - 原有UI功能不退化
  - 新目录结构就绪，各阶段可逐步迁入具体组件
- **依赖任务**: TASK-0-01
- **预估复杂度**: 高

### TASK-0-04：安装新增Python依赖
- **关联需求**: REQ-5.3-01、REQ-5.4-01、REQ-5.5-01
- **任务描述**: 更新`backend/requirements.txt`，安装chromadb、sentence-transformers、pypdf2、websockets、httpx、python-multipart、pytest等新增依赖
- **涉及文件**:
  - 修改: `backend/requirements.txt`
- **验收标准**:
  - `pip install -r backend/requirements.txt`全部成功
  - 关键包可正常import：`import chromadb`、`import httpx`
- **依赖任务**: 无
- **预估复杂度**: 低

### TASK-0-05：安装新增npm依赖
- **关联需求**: 全局状态管理
- **任务描述**: 安装zustand状态管理库，用于前端模块化状态管理
- **涉及文件**:
  - 修改: `package.json`
- **验收标准**:
  - `npm install`成功
  - `import { create } from 'zustand'`正常工作
- **依赖任务**: 无
- **预估复杂度**: 低

---

## 1. 阶段1：多模型切换能力（5.5 — 最高优先级P0，10-12小时）

### TASK-5.5-01：模型适配器基类实现
- **关联需求**: REQ-5.5-01、REQ-5.5-06
- **任务描述**: 实现`BaseLLMAdapter`抽象基类和`LLMResponse`数据模型，定义统一的chat()、validate_api_key()接口，支持is_proxy标识和fallback_provider_id降级指向
- **涉及文件**:
  - 新增: `backend/adapters/base_llm_adapter.py`
  - 新增: `backend/models/schemas.py`（LLMResponse、LLMException模型）
- **验收标准**:
  - `BaseLLMAdapter`定义了`chat()`和`validate_api_key()`抽象方法
  - `LLMResponse`包含content、model_name、provider_id、input_tokens、output_tokens、latency_ms、is_degraded、degraded_from字段
  - `LLMException`包含provider_id、status_code、message字段
- **依赖任务**: TASK-0-02
- **预估复杂度**: 中

### TASK-5.5-02：华为盘古真实API适配器
- **关联需求**: REQ-5.5-01 [P0]
- **任务描述**: 实现`PanguAdapter`，调用华为云盘古大模型真实API端点（ModelArts推理服务），支持双认证模式（IAM AK/SK签名 + 简易API Key），消除代理转发至DeepSeek的虚假接入
- **涉及文件**:
  - 新增: `backend/adapters/pangu_adapter.py`
- **验收标准**:
  - `PanguAdapter.provider_id = "pangu"`，`is_proxy = False`
  - API端点为华为云ModelArts域名（非api.deepseek.com）
  - 支持`hw-`前缀API Key和Bearer Token两种认证方式
  - API调用失败时抛出`LLMException`（由降级链处理）
  - 返回`LLMResponse`包含真实Token统计和延迟数据
- **依赖任务**: TASK-5.5-01
- **预估复杂度**: 高

### TASK-5.5-03：GLM-5.0适配器实现
- **关联需求**: REQ-5.5-05 [P1]
- **任务描述**: 实现`GLMAdapter`，调用智谱AI GLM-5.0 API（open.bigmodel.cn），使用OpenAI兼容接口协议，无需额外SDK
- **涉及文件**:
  - 新增: `backend/adapters/glm_adapter.py`
- **验收标准**:
  - `GLMAdapter.provider_id = "glm"`，`is_proxy = False`
  - API端点为`https://open.bigmodel.cn/api/paas/v4/chat/completions`
  - 使用OpenAI兼容协议（Authorization: Bearer + messages格式）
  - API Key前缀验证支持`zhipu`/`glm`前缀
  - 返回`LLMResponse`包含Token统计和延迟数据
- **依赖任务**: TASK-5.5-01
- **预估复杂度**: 中

### TASK-5.5-04：重构现有模型适配器（DeepSeek/OpenAI/Gemini）
- **关联需求**: REQ-5.5-01、REQ-5.5-06
- **任务描述**: 将`main.py`中的`call_llm_api`函数拆分重构为`DeepSeekAdapter`、`OpenAIAdapter`、`GeminiAdapter`三个独立适配器类，均继承`BaseLLMAdapter`，统一接口签名
- **涉及文件**:
  - 新增: `backend/adapters/deepseek_adapter.py`
  - 新增: `backend/adapters/openai_adapter.py`
  - 新增: `backend/adapters/gemini_adapter.py`
  - 修改: `backend/main.py`（删除call_llm_api函数）
- **验收标准**:
  - 三个适配器均继承`BaseLLMAdapter`
  - 原有DeepSeek/OpenAI/Gemini调用功能不退化
  - `main.py`中不再有直接的LLM API调用代码
  - 各适配器正确设置`is_proxy`标识
- **依赖任务**: TASK-5.5-01、TASK-0-02
- **预估复杂度**: 中

### TASK-5.5-05：模型路由与降级链服务
- **关联需求**: REQ-5.5-06 [P0]
- **任务描述**: 实现`ModelRouterService`，管理所有模型适配器，实现降级优先级链（盘古→DeepSeek→OpenAI→GLM→Gemini），API调用失败时自动降级至备选模型，降级时在响应中标记is_degraded和degraded_from
- **涉及文件**:
  - 新增: `backend/services/model_router_service.py`
- **验收标准**:
  - 降级链优先级：pangu → deepseek → openai → glm → gemini
  - 指定模型调用失败时自动降级，<5秒内切换完成
  - 降级响应中`is_degraded=True`，`degraded_from`标记原始模型
  - 所有模型均不可用时抛出`AllModelsUnavailableException`
  - 降级事件记录至后端日志
- **依赖任务**: TASK-5.5-02、TASK-5.5-03、TASK-5.5-04
- **预估复杂度**: 高

### TASK-5.5-06：模型管理后端路由
- **关联需求**: REQ-5.5-02、REQ-5.5-05
- **任务描述**: 实现`models.py`路由模块，提供模型信息查询（`/api/models/info`）、模型列表（`/api/models/list`）端点，将路由注册至main.py，原有analyze/chat路由改为调用ModelRouterService
- **涉及文件**:
  - 新增: `backend/routers/models.py`
  - 新增: `backend/routers/analyze.py`（从main.py拆出）
  - 新增: `backend/routers/chat.py`（从main.py拆出）
  - 修改: `backend/main.py`（注册新路由）
- **验收标准**:
  - `GET /api/models/info?provider=pangu`返回盘古真实模型信息（display_name、model_id、api_endpoint、is_proxy）
  - `GET /api/models/list`返回5个供应商完整列表
  - analyze/chat路由通过ModelRouterService调用模型，功能不退化
  - 代理转发的模型在响应中is_proxy=true并标注proxy_target
- **依赖任务**: TASK-5.5-05、TASK-0-02
- **预估复杂度**: 中

### TASK-5.5-07：前端模型状态管理Store
- **关联需求**: REQ-5.5-03 [P0]
- **任务描述**: 使用zustand创建`modelStore`，管理当前模型供应商、chatHistory对话历史、extractedParams提取参数、generatedDocs生成文档、ragReferences参考凭据，模型切换时仅更新currentProvider保留全部历史状态
- **涉及文件**:
  - 新增: `src/stores/modelStore.ts`
- **验收标准**:
  - `switchModel()`仅更新`currentProvider`，chatHistory/extractedParams/generatedDocs/ragReferences保持不变
  - 新模型推理请求自动携带完整chatHistory
  - 切换操作本身≤500ms
- **依赖任务**: TASK-0-03、TASK-0-05
- **预估复杂度**: 中

### TASK-5.5-08：前端模型选择器组件改造
- **关联需求**: REQ-5.5-02 [P0]、REQ-5.5-05
- **任务描述**: 从App.tsx拆出并改造`ModelSelector.tsx`组件，展示真实模型名称/版本号，代理转发标注"代理转发"标识，新增GLM-5.0选项和API Key前缀自动检测
- **涉及文件**:
  - 新增: `src/components/ModelSelector.tsx`
  - 修改: `src/App.tsx`（引用新组件替换内联代码）
- **验收标准**:
  - 模型选择器显示"当前模型：[供应商名] [模型版本号]"
  - 代理转发模型追加"（代理转发：实际调用XXX）"标识
  - 新增"GLM-5.0 (智谱AI)"选项
  - API Key输入时自动检测前缀（sk-d/zhipu/hw-/sk-/ai_）提示供应商匹配
  - 模型信息与后端`/api/models/info`返回数据100%一致
- **依赖任务**: TASK-5.5-06、TASK-5.5-07
- **预估复杂度**: 中

### TASK-5.5-09：前端降级通知与上下文保留
- **关联需求**: REQ-5.5-03 [P0]、REQ-5.5-06 [P0]
- **任务描述**: 前端检测LLMResponse中的is_degraded标记，展示降级通知（"⚠️ 模型降级提示：XXX模型不可用，已自动切换至YYY模型"），禁止静默降级；模型切换时保留对话历史和系统状态
- **涉及文件**:
  - 修改: `src/components/ModelSelector.tsx`（降级通知UI）
  - 修改: `src/stores/modelStore.ts`（上下文保留逻辑）
  - 修改: `src/App.tsx`（降级提示Toast/Alert）
- **验收标准**:
  - 后端返回`is_degraded=true`时，前端弹出明确降级通知
  - 通知包含原始模型名和降级目标模型名
  - 不得出现静默降级（用户必须知晓实际使用的模型）
  - 模型切换后对话历史完整保留，可继续上下文推理
- **依赖任务**: TASK-5.5-07、TASK-5.5-08
- **预估复杂度**: 中

---

## 2. 阶段2：私有知识库（5.3 — P0核心，14-16小时）

### TASK-5.3-01：ChromaDB客户端封装
- **关联需求**: REQ-5.3-01、REQ-5.3-02
- **任务描述**: 封装`ChromaClient`，提供初始化连接、创建collection、添加文档（含embeddings）、查询（向量相似度检索）、删除文档等基础操作，支持本地持久化存储（chroma_data/目录）
- **涉及文件**:
  - 新增: `backend/infra/chroma_client.py`
- **验收标准**:
  - ChromaDB数据持久化至`chroma_data/`目录
  - 支持按domain创建不同collection
  - `add_documents()`支持批量写入documents+embeddings+metadatas
  - `query()`支持向量相似度检索并返回distances
  - ChromaDB不可用时抛出异常（由上层降级处理）
- **依赖任务**: TASK-0-04
- **预估复杂度**: 中

### TASK-5.3-02：知识库初始化脚本 — 硬编码数据灌入ChromaDB
- **关联需求**: REQ-5.3-01（前置）
- **任务描述**: 将现有`KNOWLEDGE_BASE`字典中的8条法规条目自动灌入ChromaDB，执行文本分块（300-500字/块）、bge-large-zh向量化、入库，作为知识库的初始化种子数据
- **涉及文件**:
  - 新增: `backend/scripts/init_knowledge.py`
  - 修改: `backend/main.py`（删除硬编码KNOWLEDGE_BASE字典）
- **验收标准**:
  - 8条法规条目成功灌入ChromaDB
  - 每条条目包含embedding_vector、source、title、content、domain元数据
  - 初始化脚本可重复执行（幂等性）
  - 原有硬编码KNOWLEDGE_BASE字典已从main.py移除
- **依赖任务**: TASK-5.3-01
- **预估复杂度**: 中

### TASK-5.3-03：知识库CRUD服务
- **关联需求**: REQ-5.3-01 [P0]
- **任务描述**: 实现`KnowledgeService`，支持文档上传→解析（PDF/MD/TXT）→语义分块（300-500字/块，overlap=50）→bge-large-zh向量化→ChromaDB入库的完整流程，返回入库条目数与处理状态
- **涉及文件**:
  - 新增: `backend/services/knowledge_service.py`
  - 新增: `backend/models/knowledge_entry.py`（KnowledgeBaseEntry模型）
- **验收标准**:
  - 支持PDF、Markdown、纯文本三种格式解析
  - 分块粒度300-500字/块，按语义边界分块避免句子截断
  - 向量化使用bge-large-zh-v1.5模型，768维向量
  - 入库返回`{"status": "success", "chunks_stored": N}`
  - PDF解析失败时返回具体错误原因（如"PDF为加密保护，无法解析"）
- **依赖任务**: TASK-5.3-01、TASK-5.3-02
- **预估复杂度**: 高

### TASK-5.3-04：向量语义检索服务（含降级）
- **关联需求**: REQ-5.3-02 [P0]、REQ-5.3-05 [P0]
- **任务描述**: 实现`RAGService`，接收查询文本进行向量化后从ChromaDB检索TOP5结果，返回含similarity_score的参考列表；当所有结果相似度<0.5时返回coverage_warning；ChromaDB不可用时自动降级至硬编码字典检索
- **涉及文件**:
  - 新增: `backend/services/rag_service.py`
- **验收标准**:
  - 检索响应时间≤3秒
  - 每条结果包含source、title、content、similarity_score、domain
  - similarity_score计算：1 - distance（ChromaDB返回的距离值）
  - 所有结果similarity_score<0.5时，返回`coverage_warning: true`和`suggestion`字段
  - ChromaDB不可用时降级至`_fallback_keyword_search()`，使用现有硬编码字典
  - 降级时返回结果不含similarity_score字段
- **依赖任务**: TASK-5.3-01、TASK-5.3-02
- **预估复杂度**: 高

### TASK-5.3-05：知识库管理后端路由
- **关联需求**: REQ-5.3-01、REQ-5.3-02
- **任务描述**: 实现`knowledge.py`路由模块，提供文档上传（`/api/knowledge/upload`）、语义检索（`/api/knowledge/search`）、知识库统计（`/api/knowledge/stats`）端点，注册至main.py
- **涉及文件**:
  - 新增: `backend/routers/knowledge.py`
  - 修改: `backend/main.py`（注册新路由）
- **验收标准**:
  - `POST /api/knowledge/upload`支持multipart/form-data文件上传
  - `GET /api/knowledge/search?query=...&domain=...&top_k=5`返回TOP5结果+coverage_warning
  - `GET /api/knowledge/stats`返回知识库条目数和域分布统计
  - 所有端点遵循统一响应格式`{status, data, message, timestamp}`
- **依赖任务**: TASK-5.3-03、TASK-5.3-04
- **预估复杂度**: 中

### TASK-5.3-06：前端知识库状态管理Store
- **关联需求**: REQ-5.3-01、REQ-5.3-02
- **任务描述**: 使用zustand创建`knowledgeStore`，管理知识库条目列表、统计信息、检索状态、上传进度，提供上传文档、语义检索、获取统计等action
- **涉及文件**:
  - 新增: `src/stores/knowledgeStore.ts`
- **验收标准**:
  - `uploadDocument()`调用`/api/knowledge/upload`并更新条目列表
  - `searchKnowledge()`调用`/api/knowledge/search`并更新检索结果
  - `fetchStats()`调用`/api/knowledge/stats`并更新统计信息
  - 上传过程中展示loading状态
- **依赖任务**: TASK-5.3-05、TASK-0-05
- **预估复杂度**: 中

### TASK-5.3-07：前端RAG参考凭据面板（含相似度评分）
- **关联需求**: REQ-5.3-03 [P0]
- **任务描述**: 扩展RAG参考凭据展示组件，新增similarity_score展示，按评分阈值标记高/中/低相关性（≥0.8绿色、0.5-0.8黄色、<0.5灰色+置灰），显示覆盖不足警告
- **涉及文件**:
  - 新增: `src/components/RAGReferencePanel.tsx`
  - 修改: `src/App.tsx`（引用新组件替换原有renderRAGReferences）
- **验收标准**:
  - 每条凭据显示similarity_score数值（如0.87）
  - 相似度≥0.8：绿色徽章"高相关性"
  - 相似度0.5-0.8：黄色徽章"中相关性"
  - 相似度<0.5：灰色徽章"低相关性" + 置灰显示
  - coverage_warning为true时显示"⚠️ 知识库覆盖不足"警告
  - 降级模式显示"⚠️ 向量检索服务不可用，已降级至基础知识库模式"
- **依赖任务**: TASK-5.3-06、TASK-0-03
- **预估复杂度**: 中

### TASK-5.3-08：前端知识库管理界面
- **关联需求**: REQ-5.3-01 [P0]
- **任务描述**: 创建`KnowledgeManager.tsx`组件，提供文档上传区域（拖拽/点击上传PDF/MD/TXT）、知识库统计面板（条目数/域分布）、检索测试入口
- **涉及文件**:
  - 新增: `src/components/KnowledgeManager.tsx`
  - 修改: `src/App.tsx`（集成KnowledgeManager组件）
- **验收标准**:
  - 支持拖拽上传PDF/MD/TXT文件
  - 上传后显示"成功入库N条知识块"提示
  - 展示知识库总条目数和各域分布统计
  - 提供简单检索测试入口（输入查询文本，返回TOP5结果）
  - 上传失败时显示具体错误原因
- **依赖任务**: TASK-5.3-06、TASK-5.3-07
- **预估复杂度**: 中

### TASK-5.3-09：前端向量检索Hook
- **关联需求**: REQ-5.3-02
- **任务描述**: 创建`useVectorSearch`自定义Hook，封装向量语义检索API调用逻辑，支持query/domain/topK参数，自动处理降级和loading状态
- **涉及文件**:
  - 新增: `src/hooks/useVectorSearch.ts`
- **验收标准**:
  - 输入query和domain，返回检索结果+loading状态+错误信息
  - 降级模式时返回不含similarity_score的结果
  - 支持debounce防止频繁请求
- **依赖任务**: TASK-5.3-06
- **预估复杂度**: 低

---

## 3. 阶段3：CodeArts平台联动（5.1 + 5.2 — P0核心，5-7小时）

### TASK-5.1-01：CodeArts Pipeline YAML配置
- **关联需求**: REQ-5.1-01 [P0]
- **任务描述**: 创建`pipeline.yaml`配置文件，定义CI/CD流水线的4个阶段（前端构建npm run build → 后端测试pytest → 安全检查门禁CodeArts Check → 部署预览CCE），配置push触发器和分支规则
- **涉及文件**:
  - 新增: `pipeline.yaml`
- **验收标准**:
  - Pipeline包含4个阶段，阶段顺序正确
  - 触发器配置为push至main/master分支
  - 安全检查门禁fail_on_high=true（高危漏洞阻止部署）
  - Pipeline配置文件语法正确，可导入CodeArts
- **依赖任务**: TASK-0-01
- **预估复杂度**: 中

### TASK-5.1-02：CodeArts Check安全检查门禁配置
- **关联需求**: REQ-5.1-02 [P0]
- **任务描述**: 配置CodeArts Check代码检查服务规则，包含SQL注入检测、XSS检测、敏感信息泄露检测、硬编码密钥检测，配置分支保护规则（main分支PR必须通过Check）
- **涉及文件**:
  - 新增: `checkrule.yaml`（CodeArts Check规则配置）
- **验收标准**:
  - 检查规则集包含4类安全规则
  - 高危漏洞门禁设为阻断部署
  - Check服务不可用时允许合并但标记"未检查"状态
  - 分支保护规则配置至main分支
- **依赖任务**: TASK-5.1-01
- **预估复杂度**: 中

### TASK-5.1-03：DevLog自动记录服务
- **关联需求**: REQ-5.1-03 [P1]
- **任务描述**: 实现`DevLogService`，在Pipeline WebHook回调时自动追加DevLog条目至`CodeArts_Agent_DevLog.md`，记录流水线名称、状态、构建产物链接、执行耗时
- **涉及文件**:
  - 新增: `backend/services/devlog_service.py`
- **验收标准**:
  - `append_pipeline_record()`方法将流水线记录追加至DevLog
  - DevLog条目包含：时间戳、流水线名称、状态（✅/❌/⏱️）、构建产物URL、耗时（秒）
  - DevLog文件路径可配置
- **依赖任务**: TASK-0-02
- **预估复杂度**: 中

### TASK-5.1-04：CI/CD回写服务
- **关联需求**: REQ-5.2-03、REQ-5.1-03
- **任务描述**: 实现`CICDService`，提供Pipeline状态查询（代理CodeArts Pipeline API）和WebHook回调处理功能，查询最近一次Pipeline执行状态和构建日志
- **涉及文件**:
  - 新增: `backend/services/cicd_service.py`
  - 新增: `backend/adapters/codearts_pipeline_adapter.py`（CodeArts Pipeline API适配器）
  - 新增: `backend/models/pipeline_status.py`（PipelineStatus模型）
- **验收标准**:
  - `query_latest_pipeline()`代理查询CodeArts Pipeline最近执行状态
  - Pipeline API不可用时返回降级响应（"构建状态获取失败"）
  - WebHook回调正确解析Pipeline执行结果
- **依赖任务**: TASK-5.1-01、TASK-5.1-03
- **预估复杂度**: 中

### TASK-5.1-05：CI/CD后端路由
- **关联需求**: REQ-5.1-03、REQ-5.2-03
- **任务描述**: 实现`cicd.py`路由模块，提供WebHook回调端点（`/api/cicd/webhook`）、Pipeline状态查询（`/api/cicd/pipeline/status`）、构建日志（`/api/cicd/pipeline/logs`）、质量报告（`/api/cicd/insight/quality`）端点
- **涉及文件**:
  - 新增: `backend/routers/cicd.py`
  - 修改: `backend/main.py`（注册新路由）
- **验收标准**:
  - `POST /api/cicd/webhook`接收Pipeline WebHook回调并记录DevLog
  - `GET /api/cicd/pipeline/status`返回最近Pipeline执行状态
  - `GET /api/cicd/pipeline/logs`返回最近10条构建日志
  - `GET /api/cicd/insight/quality`返回CodeArts Insight质量报告
- **依赖任务**: TASK-5.1-04、TASK-0-02
- **预估复杂度**: 中

### TASK-5.2-01：Git仓库推送至CodeArts Repo
- **关联需求**: REQ-5.2-01 [P0]
- **任务描述**: 在华为云CodeArts平台创建项目，获取Repo仓库地址，添加远程仓库并推送代码，确保Repo页面可查看完整项目结构与提交历史
- **涉及文件**:
  - 修改: 远程仓库配置
- **验收标准**:
  - CodeArts Repo页面可见完整项目文件结构
  - 提交历史完整可追溯
  - main分支包含最新代码
- **依赖任务**: TASK-0-01、TASK-5.1-01
- **预估复杂度**: 低

### TASK-5.2-02：Docker化配置
- **关联需求**: REQ-5.2-05 [P1]
- **任务描述**: 创建前端Nginx容器Dockerfile、后端Python容器Dockerfile、docker-compose.yml本地开发编排文件
- **涉及文件**:
  - 新增: `docker/Dockerfile.frontend`
  - 新增: `docker/Dockerfile.backend`
  - 新增: `docker/docker-compose.yml`
- **验收标准**:
  - `docker-compose up`可同时启动前后端服务
  - 前端Nginx容器正常提供静态资源服务
  - 后端Python容器FastAPI正常启动
- **依赖任务**: TASK-0-04
- **预估复杂度**: 中

---

## 4. 阶段4：鸿蒙系统适配（5.4 — P0核心，14-17小时）

### TASK-5.4-01：INearLinkAdapter接口定义与WebSocket模拟实现
- **关联需求**: REQ-5.4-01 [P0]、REQ-5.4-02 [P0]
- **任务描述**: 定义`INearLinkAdapter`接口（discoverDevices/pairDevice/establishChannel/sendData/onDataReceived/closeChannel/getState），实现`WebSocketNearLinkSim`模拟类，WebSocket连接模拟星闪"设备发现→配对→通道建立"流程，支持30秒心跳和断点续传缓存
- **涉及文件**:
  - 新增: `src/lib/wsNearLinkSim.ts`
- **验收标准**:
  - `INearLinkAdapter`接口7个方法签名与真实星闪SDK对齐
  - `discoverDevices()`返回模拟设备列表
  - `pairDevice()`建立WebSocket连接（ws://localhost:8765/harmony）
  - `sendData()`发送JSON格式数据，连接断开时缓存至reconnectBuffer
  - 30秒心跳保活，60秒超时判定断开
  - 状态映射：WebSocket状态→星闪状态枚举（discovered/pairing/connected/syncing/disconnected）
- **依赖任务**: TASK-0-03
- **预估复杂度**: 高

### TASK-5.4-02：后端WebSocket服务
- **关联需求**: REQ-5.4-01、REQ-5.4-02
- **任务描述**: 实现`HarmonyWSService`，管理WebSocket连接池（active_connections字典），支持设备注册、数据推流、连接断开处理，提供`/ws/harmony` WebSocket端点
- **涉及文件**:
  - 新增: `backend/infra/ws_server.py`
  - 新增: `backend/services/harmony_ws_service.py`
- **验收标准**:
  - WebSocket端点`/ws/harmony`可正常建立连接
  - 支持多设备同时连接（active_connections字典管理）
  - 数据推流格式为`{type: "nearlink_data", payload: {...}}`
  - 连接断开时自动清理active_connections
- **依赖任务**: TASK-0-02
- **预估复杂度**: 中

### TASK-5.4-03：NPU真实正则脱敏模块
- **关联需求**: REQ-5.4-03 [P0]
- **任务描述**: 实现`npuSanitizer.ts`前端脱敏模块，预定义6条医疗场景脱敏规则（患者ID/P\d{8}、医院名称、医生姓名/职称后姓名、联系电话/11位手机号、身份证号/18位、患者姓名），执行真实正则匹配替换，返回脱敏前后对比和规则匹配详情
- **涉及文件**:
  - 新增: `src/lib/npuSanitizer.ts`
- **验收标准**:
  - 6条脱敏规则覆盖医疗场景主要隐私字段
  - `npuSanitize()`返回`SanitizeResult`（original、sanitized、fields_sanitized、rules_applied、is_safe_for_transmission）
  - 患者ID `P20260001` → `[已脱敏-患者ID]`
  - 医院名称"北京协和医院" → `[已脱敏-医疗机构]`
  - 联系电话`13800138000` → `[已脱敏-电话]`
  - 未脱敏原始数据不出现在WebSocket传输中（硬性约束）
- **依赖任务**: TASK-0-03
- **预估复杂度**: 中

### TASK-5.4-04：NPU脱敏后端服务
- **关联需求**: REQ-5.4-03 [P0]
- **任务描述**: 实现`NpuSanitizerService`后端脱敏服务，提供`/api/harmony/sanitize`端点，接收文本执行正则脱敏并返回脱敏结果
- **涉及文件**:
  - 新增: `backend/services/npu_sanitizer_service.py`
- **验收标准**:
  - `POST /api/harmony/sanitize`接收文本返回脱敏结果
  - 响应包含original、sanitized、fields_sanitized、rules_applied、is_safe_for_transmission
  - 脱敏规则与前端`npuSanitizer.ts`保持一致
- **依赖任务**: TASK-0-02
- **预估复杂度**: 低

### TASK-5.4-05：NpuSandboxPanel组件改造 — 绑定真实脱敏
- **关联需求**: REQ-5.4-03 [P0]
- **任务描述**: 从App.tsx拆出并改造`NpuSandboxPanel.tsx`，保留5步进度条UI但绑定真实脱敏步骤（步骤1-2文本扫描与规则匹配、步骤3-4正则替换与哈希校验、步骤5安全传输确认），日志展示脱敏前后数据对比
- **涉及文件**:
  - 新增: `src/components/NpuSandboxPanel.tsx`
  - 修改: `src/App.tsx`（引用新组件替换内联NpuSandboxPanel）
- **验收标准**:
  - 进度条5步绑定真实脱敏处理步骤（非硬编码动画）
  - 日志展示脱敏前后数据对比，包含脱敏字段数和规则名称
  - 推流前必须调用`npuSanitize()`处理所有数据
  - 未脱敏的原始隐私数据不出现在WebSocket传输内容中
- **依赖任务**: TASK-5.4-01、TASK-5.4-03
- **预估复杂度**: 中

### TASK-5.4-06：HarmonyDrawer组件改造 — 接入WebSocket模拟层
- **关联需求**: REQ-5.4-01 [P0]、REQ-5.4-02 [P0]
- **任务描述**: 从App.tsx拆出并改造`HarmonyDrawer.tsx`，接入WebSocket模拟星闪协议层，实现"设备发现→配对→通道建立→数据同步"全流程UI，推流前调用NPU脱敏，增量推送参数变更，UI标注"当前为WebSocket模拟星闪通信"
- **涉及文件**:
  - 新增: `src/components/HarmonyDrawer.tsx`
  - 新增: `src/hooks/useWebSocket.ts`
  - 新增: `src/stores/harmonyStore.ts`
  - 修改: `src/App.tsx`（引用新组件替换内联HarmonyDrawer）
- **验收标准**:
  - 点击"星闪一键推流"后展示3步连接流程（设备发现→配对→通道建立）
  - 连接建立≤2秒
  - 参数变更后500ms内增量推流至目标窗口
  - 推流数据经过NPU脱敏处理
  - UI标注"当前为WebSocket模拟星闪通信，生产环境替换为真实星闪SDK"
  - WebSocket连接失败时3次重试后展示"设备连接失败"状态
- **依赖任务**: TASK-5.4-01、TASK-5.4-02、TASK-5.4-05
- **预估复杂度**: 高

### TASK-5.4-07：鸿蒙后端路由
- **关联需求**: REQ-5.4-01、REQ-5.4-03
- **任务描述**: 实现`harmony.py`路由模块，提供设备发现（`/api/harmony/discover`）、脱敏处理（`/api/harmony/sanitize`）、已连接设备列表（`/api/harmony/devices`）端点
- **涉及文件**:
  - 新增: `backend/routers/harmony.py`
  - 新增: `backend/models/harmony_device.py`（HarmonyDeviceState模型）
  - 修改: `backend/main.py`（注册新路由和WebSocket端点）
- **验收标准**:
  - `POST /api/harmony/discover`返回模拟设备列表
  - `POST /api/harmony/sanitize`调用NpuSanitizerService
  - `GET /api/harmony/devices`返回已连接设备列表
  - `/ws/harmony` WebSocket端点正常工作
- **依赖任务**: TASK-5.4-02、TASK-5.4-04、TASK-0-02
- **预估复杂度**: 中

### TASK-5.4-08：鸿蒙屏幕自适应布局
- **关联需求**: REQ-5.4-06 [P0]
- **任务描述**: 在`App.css`中新增CSS响应式断点样式，支持3种屏幕尺寸（≤768px手机竖屏、769-1280px平板、≥1281px智慧屏/桌面），触控适配最小44x44px点击目标，鸿蒙设备检测自动添加harmony-os CSS类
- **涉及文件**:
  - 修改: `src/App.css`
  - 修改: `src/main.tsx`或`src/App.tsx`（鸿蒙设备检测代码）
- **验收标准**:
  - ≤768px：flex-column布局，左侧面板100%宽度，右侧面板折叠为Drawer
  - 769-1280px：左侧280px，中间flex:1，右侧320px
  - ≥1281px：左侧320px，中间flex:1，右侧380px
  - 所有可点击元素最小44x44px
  - 鸿蒙浏览器User-Agent检测自动添加harmony-os类
  - 无水平滚动条，关键操作区域无重叠
- **依赖任务**: TASK-0-03
- **预估复杂度**: 中

---

## 5. 阶段5：P1加分项（按时间灵活安排）

### TASK-P1-01：前端CI/CD状态展示面板
- **关联需求**: REQ-5.2-03 [P1]
- **任务描述**: 创建`CICDStatusPanel.tsx`组件，5秒轮询`/api/cicd/pipeline/status`，展示构建状态指示器（排队/运行/成功/失败）和最近10条构建日志
- **涉及文件**:
  - 新增: `src/components/CICDStatusPanel.tsx`
  - 新增: `src/components/PipelineStatusWidget.tsx`
  - 修改: `src/App.tsx`（集成CICDStatusPanel）
- **验收标准**:
  - 5秒轮询更新构建状态
  - 状态指示器：排队→黄色、运行→蓝色脉冲、成功→绿色、失败→红色
  - 展示最近10条构建日志
  - Pipeline API不可用时显示"构建状态获取失败"提示
- **依赖任务**: TASK-5.1-05
- **预估复杂度**: 中

### TASK-P1-02：CodeArts Insight质量报告集成
- **关联需求**: REQ-5.2-04 [P1]、REQ-5.1-04 [P1]
- **任务描述**: 后端调用CodeArts Insight API获取质量报告数据，前端展示关键质量指标摘要（缺陷数、合规率、技术债务评分），支持ECharts图表渲染
- **涉及文件**:
  - 修改: `backend/services/cicd_service.py`（新增Insight查询方法）
  - 修改: `src/components/CICDStatusPanel.tsx`（新增质量报告Tab）
- **验收标准**:
  - 前端展示缺陷趋势图、技术债务评分、代码重复率统计
  - 数据延迟不超过24小时
  - Insight API不可用时显示降级提示
- **依赖任务**: TASK-5.1-05
- **预估复杂度**: 中

### TASK-P1-03：CCE一键部署配置
- **关联需求**: REQ-5.2-05 [P1]
- **任务描述**: 配置CodeArts Deploy服务，Pipeline部署阶段自动推送Docker镜像至CCE，部署完成后自动执行健康检查
- **涉及文件**:
  - 修改: `pipeline.yaml`（新增部署阶段配置）
  - 修改: `docker/docker-compose.yml`
- **验收标准**:
  - Pipeline部署阶段自动推送镜像至CCE
  - 部署完成后健康检查返回HTTP 200
  - 部署失败自动回滚至上一版本
- **依赖任务**: TASK-5.2-02、TASK-5.1-01
- **预估复杂度**: 中

### TASK-P1-04：华为云知识湖适配器
- **关联需求**: REQ-5.3-04 [P1]
- **任务描述**: 实现`KnowledgeLakeAdapter`，通过华为云知识湖API拉取企业规范文档，解析并索引至本地ChromaDB，支持Endpoint/Project ID/知识库ID配置，知识湖不可用时使用本地ChromaDB独立运行
- **涉及文件**:
  - 新增: `backend/adapters/knowledge_lake_adapter.py`
  - 修改: `backend/services/knowledge_service.py`（集成知识湖数据源）
- **验收标准**:
  - 支持配置知识湖服务Endpoint、Project ID、知识库ID
  - 知识湖API拉取文档后自动解析+分块+向量化入库
  - 知识湖API鉴权失败时跳过同步，本地ChromaDB独立运行
- **依赖任务**: TASK-5.3-03、TASK-5.3-04
- **预估复杂度**: 高

### TASK-P1-05：知识库审核流程与审计日志
- **关联需求**: REQ-5.3-06 [P1]
- **任务描述**: 实现知识库条目审核流程（新增/修改→待审核→审批通过/拒绝→入库），记录变更审计日志（操作人、操作类型、变更内容、时间戳），日志保留期≥90天
- **涉及文件**:
  - 修改: `backend/services/knowledge_service.py`（新增审核逻辑）
  - 修改: `backend/routers/knowledge.py`（新增审核端点）
  - 新增: `backend/models/audit_log.py`（审计日志模型）
- **验收标准**:
  - 新增知识条目默认状态为"pending"
  - 审批通过后状态变更为"approved"方可被检索
  - 审计日志记录操作人ID、操作类型（ADD/UPDATE/DELETE）、变更前后内容对比、时间戳
  - 日志保留期≥90天
- **依赖任务**: TASK-5.3-03、TASK-5.3-05
- **预估复杂度**: 中

### TASK-P1-06：鸿蒙Widget卡片预览
- **关联需求**: REQ-5.4-04 [P1]
- **任务描述**: 创建鸿蒙Widget卡片预览组件，模拟鸿蒙服务卡片视觉风格，展示关键转化指标（论文标题、提取参数数、RAG合规评分、同步状态），数据随主端实时更新（3秒内同步）
- **涉及文件**:
  - 新增: `src/components/HarmonyWidget.tsx`
  - 修改: `src/components/HarmonyDrawer.tsx`（集成Widget预览）
- **验收标准**:
  - Widget预览区模拟鸿蒙服务卡片视觉风格（圆角、毛玻璃背景）
  - 展示论文标题、提取参数数量、RAG合规评分、同步状态
  - 主端参数变更后3秒内Widget更新
- **依赖任务**: TASK-5.4-06
- **预估复杂度**: 中

### TASK-P1-07：鸿蒙断点续传缓存机制
- **关联需求**: REQ-5.4-05 [P1]
- **任务描述**: WebSocket连接断开时自动缓存待推流数据至localStorage，连接恢复后自动推送缓存数据（断点续传），缓存容量最多100条（FIFO淘汰）
- **涉及文件**:
  - 修改: `src/lib/wsNearLinkSim.ts`（完善_flushReconnectBuffer逻辑）
  - 修改: `src/hooks/useWebSocket.ts`（localStorage缓存逻辑）
  - 修改: `src/stores/harmonyStore.ts`（缓存状态管理）
- **验收标准**:
  - WebSocket断开时变更数据缓存至localStorage
  - 连接恢复后自动推送缓存数据
  - 缓存最多100条，超出FIFO淘汰
  - 续传完成后目标设备数据与源端100%一致
- **依赖任务**: TASK-5.4-06
- **预估复杂度**: 中

### TASK-P1-08：模型性能基准对比面板
- **关联需求**: REQ-5.5-04 [P1]
- **任务描述**: 创建`ModelBenchmarkPanel.tsx`组件，展示各模型在转化医学任务上的响应时间、Token消耗与准确率指标，支持手动刷新基准测试，数据来源于实际API调用测试
- **涉及文件**:
  - 新增: `src/components/ModelBenchmarkPanel.tsx`
  - 新增: `backend/models/model_benchmark.py`（ModelBenchmark模型）
  - 修改: `backend/routers/models.py`（新增benchmark端点）
- **验收标准**:
  - 面板以ECharts图表展示各模型指标
  - 指标维度：平均响应时间（ms）、Token消耗量（input/output）、任务准确率
  - 数据基于实际API调用测试（非虚构数据）
  - 支持手动刷新基准测试
- **依赖任务**: TASK-5.5-06
- **预估复杂度**: 中

### TASK-P1-09：Token消耗与推理延迟实时展示
- **关联需求**: REQ-5.5-07 [P1]
- **任务描述**: 从API响应的usage字段提取Token统计，从请求耗时计算推理延迟，前端在模型状态徽章区域下方实时展示"Token消耗：输入XXX/输出XXX"和"推理延迟：XXXms"
- **涉及文件**:
  - 新增: `src/hooks/useModelRouter.ts`（TokenMetrics接口+updateMetrics方法）
  - 修改: `src/components/ModelSelector.tsx`（Token指标展示UI）
  - 修改: `src/stores/modelStore.ts`（新增tokenMetrics状态）
- **验收标准**:
  - 每次API调用后更新Token消耗和推理延迟指标
  - 展示"Token消耗：输入XXX / 输出XXX"与"推理延迟：XXXms"
  - 指标更新延迟≤1秒
  - API响应缺失usage字段时基于请求输入估算，标注"~XXX Token（估算）"
- **依赖任务**: TASK-5.5-08、TASK-5.5-09
- **预估复杂度**: 低

---

## 6. 验证与集成测试

### TASK-VAL-01：后端API集成测试
- **关联需求**: 全部
- **任务描述**: 编写pytest测试用例，覆盖所有新增API端点（知识库、模型管理、鸿蒙、CI/CD），验证正常路径和异常路径（降级、错误处理）
- **涉及文件**:
  - 新增: `backend/tests/test_knowledge.py`
  - 新增: `backend/tests/test_models.py`
  - 新增: `backend/tests/test_harmony.py`
  - 新增: `backend/tests/test_cicd.py`
- **验收标准**:
  - 所有P0端点测试覆盖
  - 降级路径测试覆盖（ChromaDB不可用、模型API失败）
  - 测试可通过`pytest backend/tests/ -v`执行
- **依赖任务**: 全部P0任务完成后
- **预估复杂度**: 中

### TASK-VAL-02：前端功能验证
- **关联需求**: 全部
- **任务描述**: 逐一验证前端所有新增组件和改造组件的功能完整性，包括模型切换上下文保留、RAG相似度展示、NPU真实脱敏、WebSocket模拟推流、CI/CD状态展示、鸿蒙自适应布局
- **涉及文件**: 无新增，验证现有文件
- **验收标准**:
  - 模型切换后对话历史完整保留
  - RAG参考凭据展示相似度评分和颜色标记
  - NPU脱敏执行真实正则替换，日志可查看
  - WebSocket模拟推流正常传输数据
  - 鸿蒙分辨率下布局无滚动条无重叠
  - 所有降级提示正确展示
- **依赖任务**: 全部P0任务完成后
- **预估复杂度**: 中

### TASK-VAL-03：CodeArts Pipeline端到端验证
- **关联需求**: REQ-5.1-01、REQ-5.2-02
- **任务描述**: 推送代码至CodeArts Repo，验证Pipeline自动触发、安全检查门禁、DevLog自动记录的端到端流程
- **涉及文件**: 无新增，验证Pipeline配置
- **验收标准**:
  - 代码推送至main分支后Pipeline自动触发
  - 前端构建和后端测试阶段正常执行
  - 安全检查门禁对高危漏洞阻断部署
  - DevLog自动追加流水线执行记录
- **依赖任务**: TASK-5.1-01、TASK-5.2-01
- **预估复杂度**: 低

---

## 任务统计总览

| 阶段 | 任务数 | P0任务数 | P1任务数 | 预估总工时 |
|------|--------|---------|---------|-----------|
| 阶段0：基础准备 | 5 | 5 | 0 | 2-3h |
| 阶段1：5.5多模型 | 9 | 6 | 1 | 10-12h |
| 阶段2：5.3知识库 | 9 | 6 | 0 | 14-16h |
| 阶段3：5.1+5.2 CI/CD | 7 | 4 | 2 | 5-7h |
| 阶段4：5.4鸿蒙 | 8 | 6 | 0 | 14-17h |
| 阶段5：P1加分 | 9 | 0 | 9 | 18-20h |
| 验证集成 | 3 | 3 | 0 | 4-6h |
| **合计** | **50** | **30** | **12** | **67-81h** |

### 需求覆盖矩阵

| 需求编号 | 优先级 | 对应任务 |
|---------|--------|---------|
| REQ-5.1-01 | P0 | TASK-5.1-01, TASK-VAL-03 |
| REQ-5.1-02 | P0 | TASK-5.1-02 |
| REQ-5.1-03 | P1 | TASK-5.1-03, TASK-5.1-05 |
| REQ-5.1-04 | P1 | TASK-P1-02 |
| REQ-5.1-05 | P2 | （未规划，建议实现） |
| REQ-5.2-01 | P0 | TASK-0-01, TASK-5.2-01 |
| REQ-5.2-02 | P0 | TASK-5.1-01, TASK-5.2-01 |
| REQ-5.2-03 | P1 | TASK-P1-01 |
| REQ-5.2-04 | P1 | TASK-P1-02 |
| REQ-5.2-05 | P1 | TASK-5.2-02, TASK-P1-03 |
| REQ-5.2-06 | P2 | （未规划，建议实现） |
| REQ-5.3-01 | P0 | TASK-5.3-02, TASK-5.3-03, TASK-5.3-08 |
| REQ-5.3-02 | P0 | TASK-5.3-04, TASK-5.3-05, TASK-5.3-09 |
| REQ-5.3-03 | P0 | TASK-5.3-07 |
| REQ-5.3-04 | P1 | TASK-P1-04 |
| REQ-5.3-05 | P0 | TASK-5.3-04 |
| REQ-5.3-06 | P1 | TASK-P1-05 |
| REQ-5.4-01 | P0 | TASK-5.4-01, TASK-5.4-06 |
| REQ-5.4-02 | P0 | TASK-5.4-06 |
| REQ-5.4-03 | P0 | TASK-5.4-03, TASK-5.4-04, TASK-5.4-05 |
| REQ-5.4-04 | P1 | TASK-P1-06 |
| REQ-5.4-05 | P1 | TASK-P1-07 |
| REQ-5.4-06 | P0 | TASK-5.4-08 |
| REQ-5.5-01 | P0 | TASK-5.5-02 |
| REQ-5.5-02 | P0 | TASK-5.5-06, TASK-5.5-08 |
| REQ-5.5-03 | P0 | TASK-5.5-07, TASK-5.5-09 |
| REQ-5.5-04 | P1 | TASK-P1-08 |
| REQ-5.5-05 | P1 | TASK-5.5-03, TASK-5.5-08 |
| REQ-5.5-06 | P0 | TASK-5.5-05, TASK-5.5-09 |
| REQ-5.5-07 | P1 | TASK-P1-09 |

### 关键路径

```
TASK-0-01 → TASK-0-02 → TASK-5.5-01 → TASK-5.5-02 → TASK-5.5-05 → TASK-5.5-06 → TASK-5.5-08 → TASK-5.5-09
                ↓                                                               ↓
           TASK-5.3-01 → TASK-5.3-03 → TASK-5.3-05 → TASK-5.3-06 → TASK-5.3-07
                ↓
           TASK-5.4-01 → TASK-5.4-05 → TASK-5.4-06
                ↓
           TASK-5.1-01 → TASK-5.1-04 → TASK-5.1-05 → TASK-P1-01
```

> **说明**: P0任务共30个，覆盖27条需求中的19条P0需求；P1任务12个覆盖8条P1需求；P2需求（REQ-5.1-05、REQ-5.2-06）未规划为独立任务，时间充裕时可纳入。关键路径经过阶段0→阶段1→阶段2，建议优先保证阶段0-1-2的质量再推进后续阶段。
