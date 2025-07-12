# JSP 转 React 的 AI Agent CLI 工具

准备项目用的项目，来校验是否能自动迁移

- 创建 React 应用：npx create-next-app@latest ，目标目录：fixtures/target
- test fixtures 项目：https://github.com/innashpota/blog 目标目录：fixtures/source

TODO:

- [ ] 创建 AI Agent 来根据项目，读取路由信息，生成对应的react router
  - [ ] AI Agent 工具参考你的工具，list_dir, read_file, write_file 
- [ ] 编写 AST/语法 自动化程序
  - [ ] 尝试启动 jsp 应用，
  - [ ] 编写 puppeteer 应用，自动访问网页，下载 HTML 
  - [ ] 创建组件化的 HTML 解析逻辑，按 DOM Tree 的二三四级节点之类的，可能可以结合 AI
  - [ ] 将拆分完后的 HTML 转换为 React（ReactConverter??）
- [ ] 自动构建工具
  - [ ] 执行 npm 相关命令（NpmCommandManger, DevServerManager）
  - [ ] 自动化修复 AI 构建
- [ ] 其它

考虑到可维护性，应该要控制类的大小，并尽可能模块化。


