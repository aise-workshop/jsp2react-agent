# JSP 转 React 的 AI Agent CLI 工具

准备项目用的项目，来校验是否能自动迁移

- 创建 React 应用：npx create-next-app@latest ，目标目录：fixtures/target
- test fixtures 项目：https://github.com/innashpota/blog 目标目录：fixtures/source

## 任务分解（Tasks）

### 阶段一：项目初始化与分析

- [ ] **环境搭建**:
  - [x] 创建 Next.js 应用 (`npx create-next-app@latest`)
  - [ ] 分析并确定 JSP 项目的启动方式（如：使用 `mvn jetty:run`）
- [ ] **JSP 应用分析 (JspAnalysisService)**:
  - [ ] 梳理 JSP 项目的路由规则和页面结构 (RouteMappingGenerator)。
  - [ ] 识别可重用的 UI 模式和组件 (UiPatternRecognizer)。
  - [ ] 映射 JSP 页面使用的数据，为 API 设计做准备 (DataUsageMapper)。

### 阶段二：自动化迁移工具开发 (MigrationTool)

- [ ] **路由生成器 (JspRouterToReactRouterConverter)**:
  - [ ] 开发 AI Agent 读取 JSP 配置文件 (如 `web.xml`) 或代码，自动生成 React Router (`react-router-dom`) 的路由配置。
- [ ] **JSP 到 React 转换器 (JspToReactConverter)**:
  - [ ] **HTML 提取 (HtmlExtractor)**: 编写 Puppeteer 脚本访问运行中的 JSP 应用，提取页面 HTML。
  - [ ] **HTML 解析与组件化 (HtmlParser, Componentizer)**:
    - [ ] 将提取的 HTML 解析成 DOM 树 (DomTreeParser)。
    - [ ] 基于 DOM 结构、CSS 类名等启发式规则，将 HTML 分割成组件化的片段 (HtmlFragmenter)。
  - [ ] **代码转换 (JsxConverter, JstlConverter)**:
    - [ ] 将 HTML 片段转换为 React 组件 (JSX)。
    - [ ] 转换 JSP 标签库 (JSTL) 为对应的 React 写法 (如：`c:if` -> `{condition && ...}`, `c:forEach` -> `.map()`)。

### 阶段三：混合模式与逐步迁移

- [ ] **嵌入 React 组件 (ReactEmbedder)**:
  - [ ] 设计一种机制，将小的、独立的 React 组件嵌入到现有的 JSP 页面中（Strangler Fig Pattern）。
  - [ ] 建立 JSP 和 React 组件之间的通信桥梁 (JspReactBridge)。
- [ ] **API 化改造 (ApiService)**:
  - [ ] 将 JSP 中的业务逻辑逐步重构为独立的 RESTful API。
  - [ ] 更新 React 组件，使其通过 API 获取数据，而非依赖 JSP 上下文。

### 阶段四：构建与部署自动化

- [ ] **构建工具 (BuildAutomationTool)**:
  - [ ] 编写脚本自动化执行 `npm run build`, `npm run dev` 等命令 (NpmScriptRunner)。
  - [ ] 集成 Linting 和代码格式化工具 (ESLint, Prettier) 以保证代码质量 (CodeQualityEnforcer)。
- [ ] **自动化修复 (AutoFixer)**:
  - [ ] 探索使用 AI 自动修复在构建过程中出现的常见错误。
      - [ ] 结合常见 issue，生成相关上下文
      - [ ] 根据 issue 生成生成工具调用 read_file, write_file, str_replace 等
      - [ ] 执行工具（如生成文件），对结果执行校验等

### 阶段五：完成迁移

- [ ] **全量替换 (PageReplacer)**:
  - [ ] 逐步将所有页面替换为 React 实现。
  - [ ] 移除 JSP 相关代码和依赖 (CodeCleaner)。
- [ ] **测试 (MigrationTester)**:
  - [ ] 编写单元测试和端到端测试，确保迁移后的应用功能正确。

考虑到可维护性，应该要控制类的大小，并尽可能模块化。


