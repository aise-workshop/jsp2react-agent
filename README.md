# **JSP 转 React 的 AI Agent CLI 工具 - 增强版项目计划**

## **项目核心原则**

* **分析驱动**: 所有迁移决策必须基于对源应用的深度静态与动态分析，而非简单的启发式规则。  
* **AI 协作伙伴**: Agent 的每一步操作都应透明、可审计，并为人工干预预留接口。  
* **渐进式迁移**: 原生支持“绞杀者无花果模式”，确保新旧系统平滑共存与过渡。  
* **混合智能**: 对确定性任务使用规则引擎，对复杂性任务（如逻辑翻译、错误修复）使用高级 AI Agent。  
* **可验证性第一**: 迁移的成功由测试定义，尤其是功能、E2E 和视觉回归测试。  
* **迭代验证与人工监督**: 在每个关键阶段（特别是代码生成和修复后），建立自动化检查点和清晰的人工审核流程。Agent 应主动标记低置信度的转换结果，并暂停执行以请求人工确认，从而将 AI 的效率与人类的经验智慧相结合，避免错误累积。

## **任务分解 (Tasks)**

### **阶段一：深度应用分析 (Deep Analysis)**

*目标：构建一个全面的、结构化的“应用模型 (Application Model)”作为所有后续操作的“事实之源”。*

* [ ] **环境搭建**:  
  * [x] 创建 Next.js 目标应用 (npx create-next-app@latest)  
  * [x] 部署并运行源 JSP 应用（如使用 mvn jetty:run），使其可被动态分析工具访问。  
* [ ] **JSP 应用分析服务 (JspAnalysisService)**:  
  * [ ] **高级路由发现 (Advanced Route Discovery)**:  
    * [ ] **声明式配置解析**: 开发解析器，处理 web.xml (Servlet 映射) 和常见框架配置文件 (如 struts-config.xml)。  
    * [ ] **注解扫描**: 开发 Java 源码解析器 (可使用 JavaParser)，扫描 @RequestMapping 等路由注解。  
    * [ ] **静态资源映射**: 扫描项目目录，识别所有可公开访问的静态文件 (CSS, JS, 图片等)。  
    * [ ] **产出**: 生成结构化的**“路由清单 (Route Manifest)”**，包含每条路由的类型、来源和置信度评分。  
  * [ ] **UI 模式与数据依赖识别 (UI Pattern & Data-Dependency Identification)**:  
    * [ ] **静态分析**: 解析 JSP 文件，识别 <jsp:include>, JSTL 标签库，以及 EL 表达式中的数据使用模式。  
    * [ ] **动态运行时分析 (使用 Puppeteer)**:  
      * [ ] 访问运行中的 JSP 页面，等待网络静默 (networkidle0) 和关键元素加载完成，捕获最终渲染的 HTML。  
      * [ ] 拦截 AJAX 请求，精确映射 UI 片段与其依赖的后端 API 端点和数据。  
  * [ ] **初步 API 合约生成 (Initial API Contract Generation)**:  
    * [ ] 将 API 合约的格式标准化为 OpenAPI (Swagger) 3.0 规范。这不仅能提供一个机器可读的严格定义，还能利用其生态工具自动生成客户端请求代码和交互式 API 文档，从而显著加速第四阶段的后端重构和前端组件的数据获取实现。

### **阶段二：AI Agent 核心架构 (Agent Architecture)**

*目标：构建一个具备动态规划、自我修正和状态管理能力的智能 Agent 框架。*

* [ ] **认知架构升级**:  
  * [ ] 采用 **ReAct (Reasoning + Acting)** 框架，使 Agent 能够在“思考 -> 行动 -> 观察”的循环中工作，而非线性执行脚本。  
* [ ] **核心工具集定义与封装**:  
  * [ ] 文件系统工具: read_file, write_file, list_directory, string_replace。  
  * [ ] 安全命令执行工具: run_shell_command，所有命令必须在隔离的 **Docker 沙箱环境**中执行。  
* [ ] **状态管理与持久化**:  
  * [ ] 设计状态管理机制（可使用 SQLite 或 JSON 文件），用于保存迁移进度（如已迁移文件、已创建 API、测试结果），支持任务的中断和恢复。

### **阶段三：自动化代码转换 (Automated Code Conversion)**

*目标：建立一个“规则+AI”的混合智能转换流水线，高效且准确地生成 React 代码。*

* [ ] **路由生成器 (JspRouterToReactRouterConverter)**:  
  * [ ] 读取第一阶段生成的“路由清单”，自动生成 React Router (react-router-dom) 或 Next.js 的路由配置。  
  * [ ] 确保能正确处理精确路径、前缀通配符和动态路径段 (/users/:id)。  
* [ ] **HTML 到 React 转换器 (HtmlToReactConverter)**:  
  * [ ] **HTML 提取 (HtmlExtractor)**: 增强 Puppeteer 脚本，使用反爬虫策略、模拟用户交互和显式等待，确保稳定提取动态页面的最终 HTML。  
  * [ ] **智能组件化 (Intelligent Componentizer)**:  
    * [ ] **基于稳健 DOM 与语义的基线分割**: 优先利用 HTML5 语义标签（如 <header>, <nav>, <main>）和 ARIA roles 作为分割依据，确保项目初期有一个可靠的保底方案。  
    * [ ] **高级目标：视觉布局分割 (Vision-Based Segmentation)**: 作为高级目标，研究并应用网页分割算法，根据视觉布局识别独立的 UI 区域块，以应对无语义结构的复杂页面。  
    * [ ] 结合 DOM 结构分析，生成语义上更合理的组件树。  
  * [ ] **代码转换引擎 (Code Conversion Engine)**:  
    * [ ] **JSTL 到 JSX 转换器 (JstlConverter)**: 构建一个基于**规则**的转换器，将 JSTL 标签 (c:if, c:forEach 等) 精确映射为等效的 JSX 语法。  
    * [ ] **AI 驱动的逻辑翻译 (AI-Powered Logic Translation)**:  
      * [ ] **选择代码专用 LLM** (如 Code Llama, GPT-4o)。  
      * [ ] **创建并维护一个可版本化的提示模板库**: 将高质量的提示作为项目的核心资产进行管理，而不是在代码中硬编码字符串。这使得提示的迭代、测试和优化变得更加容易，并且可以为不同类型的翻译任务（如业务逻辑、数据格式化）创建专门的模板，从而提高 AI Agent 的稳定性和性能。  
      * [ ] 核心任务：翻译 JSP 中嵌入的复杂 Java 脚本片段 (<%...%>)。

### **阶段四：混合模式与逐步迁移 (Hybrid Mode & Gradual Migration)**

*目标：实现“绞杀者无花果模式”，让新旧系统平滑共存、通信，并逐步完成后端 API 化。*

* [ ] **React 组件嵌入器 (ReactEmbedder)**:  
  * [ ] 设计机制，将独立的 React 组件（作为微前端）打包并嵌入到现有 JSP 页面的指定 DOM 节点中。  
* [ ] **JSP-React 通信桥 (JspReactBridge)**:  
  * [ ] 建立一个基于**浏览器自定义事件 (Custom Events Bus)** 的双向通信总线，实现 JSP 和嵌入的 React 组件之间的解耦通信。  
* [ ] **后端 API 化改造 (Backend API Refactoring)**:  
  * [ ] 并行进行后端重构，使用第一阶段生成的 **API 合约**作为规范。  
  * [ ] **为 API 合约添加状态跟踪**: 在状态管理系统中为每个 API 合约增加一个 status 字段（可选值如 defined, implementing, tested, deployed）。这使得 AI Agent 能够跟踪每个后端 API 的重构进度，并据此决定何时可以安全地让 React 组件切换到新的数据源，从而实现更智能的依赖管理。  
  * [ ] **引入 API 合约测试 (API Contract Testing)**：为确保重构后的 API 在功能上与原有业务逻辑完全对等，建议在此阶段引入“API 合约测试”，例如使用 Pact 工具。具体流程为：1. 重构前，为现有 JSP 的数据输出编写消费者驱动的合约。2. 重构后，新的 Spring Boot API 必须通过这些合约测试。这为技术栈迁移提供了强大的安全保障。  
  * [ ] 将 JSP 中的业务逻辑逐步重构为独立的、无状态的 RESTful API (推荐使用 Spring Boot)。  
  * [ ] 更新 React 组件，使其通过 fetch 调用新 API 获取数据。

### **阶段五：构建自动化与智能修复 (Build Automation & Intelligent Repair)**

*目标：建立 CI/CD 流程，并构建一个能自动诊断和修复构建错误的“多 Agent 系统”。*

* [ ] **构建与质量保障自动化 (Build & QA Automation)**:  
  * [ ] 编写脚本自动化执行 npm run lint, npm run test, npm run build。  
  * [ ] 集成 ESLint 和 Prettier，强制执行代码质量标准。  
* [ ] **AI 自动修复器 (AutoFixer) - 多 Agent 协作系统**:  
  * [ ] **选择 Agent 框架** (如 **AutoGen** 或 **LangGraph**)。  
  * [ ] **定义 Agent 角色**:  
    * [ ] **管理员 (Admin)**: 流程总控，分发任务。  
    * [ ] **规划员 (Planner)**: 1. 分析错误日志。 2. 提出一个明确的“修复假说 (Fix Hypothesis)”，例如：‘假说：构建失败是由于缺少 ‘lodash’ 依赖包’。 3. 基于此假说制定修复计划。将“假说”显式记录下来，有助于人工审查和理解 Agent 的决策过程。  
    * [ ] **程序员 (Coder)**: 根据计划，使用工具修改代码。  
    * [ ] **执行员 (Executor)**: 在沙箱中安全执行 npm install 等命令。  
    * [ ] **质检员 (QA)**: 运行测试，验证修复是否成功且未引入新问题。  
  * [ ] 实现“规划 -> 编码 -> 执行 -> 验证”的自主修复循环。  
  * [ ] **实现修复后知识记录与反馈循环**: 当一个修复被成功验证后，系统应自动记录“问题-假说-解决方案”的完整对。这个知识库可以用于两个目的：1. 作为未来处理类似问题时的“少量示例”，提高修复效率。2. 作为数据集，用于未来对一个更小的、专门用于代码修复的本地模型进行微调，使系统具备自我学习和进化的能力。

### **阶段六：完成迁移与综合验证 (Finalization & Comprehensive Validation)**

*目标：完成系统切换，清理遗留代码，并通过多层次的测试策略确保迁移质量。*

* [ ] **全量替换与清理 (Full Replacement & Cleanup)**:  
  * [ ] **开发自动化部署与回滚脚本生成器**: 在生成部署脚本（如修改 Nginx 配置以将流量完全指向 React 应用）的同时，AI Agent 应自动生成一个对应的、时间戳标记的回滚脚本。一旦新应用在上线后出现严重问题，运维人员可以立即执行此脚本，将流量瞬间切回稳定的旧版 JSP 应用，从而为问题排查争取宝贵时间。  
  * [ ] 安全地从代码库中移除所有 JSP 相关文件、依赖和配置。  
* [ ] **多层次迁移测试 (Multi-Level Migration Testing)**:  
  * [ ] **单元/集成测试**: 利用 LLM 为新组件生成单元测试 (Jest/Vitest)，并确保重构后的后端逻辑通过原有测试。  
  * [ ] **端到端 (E2E) 测试**: 使用 Playwright 或 Cypress 编写脚本，验证关键用户流程。  
  * [ ] **视觉回归测试 (Visual Regression Testing)**:  
    * [ ] **建立基线**: 针对**原始 JSP 应用**的关键页面进行截图，建立“黄金标准”。  
    * [ ] **自动化比对**: 在 CI 流程中，自动截取**新 React 应用**的截图，并与基线进行像素级比对。  
    * [ ] **差异分析**: 使用 Percy、Applitools 或 Playwright 内置功能，自动高亮 UI 差异，防止视觉降级。
