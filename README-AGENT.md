# JSP2React AI Agent

一个基于 AI 的渐进式 JSP 转 React 迁移工具，专注于实用性和可验证性。

## 🌟 特性

- **🤖 AI 驱动**: 使用先进的 LLM 进行智能代码转换
- **📈 渐进式迁移**: 支持 JSP 和 React 混合运行
- **🔍 智能分析**: 自动分析 JSP 文件结构和依赖关系
- **🧪 自动测试**: 生成测试文件确保转换质量
- **⚡ 即开即用**: 转换后的页面可以直接运行
- **🛠️ 简化架构**: 相比原始复杂代码，大幅简化了 AI 服务调用

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/aise-workshop/jsp2react-agent
cd jsp2react-agent

# 安装依赖
npm install

# 配置 AI 服务（选择其一）
export DEEPSEEK_TOKEN="your-deepseek-token"
export GLM_API_KEY="your-glm-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

### 2. 运行演示

```bash
# 运行内置演示
npm run demo

# 查看转换结果
cd fixtures/target
npm install
npm run dev
```

### 3. 转换自己的项目

```bash
# 分析现有 JSP 项目
npm run analyze -- --source /path/to/your/jsp/project

# 执行转换
npm run convert -- --source /path/to/your/jsp/project --target /path/to/react/project

# 运行测试
npm test
```

## 📋 命令行工具

### `jsp2react convert`

转换 JSP 项目为 React：

```bash
jsp2react convert [options]

Options:
  -s, --source <path>   源 JSP 项目路径 (default: "./fixtures/source")
  -t, --target <path>   目标 React 项目路径 (default: "./fixtures/target")
  -v, --verbose         显示详细输出
  --dry-run            试运行，不实际写入文件
```

### `jsp2react analyze`

分析 JSP 项目结构：

```bash
jsp2react analyze [options]

Options:
  -s, --source <path>   源 JSP 项目路径 (default: "./fixtures/source")
  -v, --verbose         显示详细输出
```

### `jsp2react setup`

设置开发环境：

```bash
jsp2react setup [options]

Options:
  -t, --target <path>   目标 React 项目路径 (default: "./fixtures/target")
```

### `jsp2react demo`

运行演示转换：

```bash
jsp2react demo [options]

Options:
  -v, --verbose         显示详细输出
```

### `jsp2react validate`

使用 Puppeteer 验证转换结果：

```bash
jsp2react validate [options]

Options:
  -s, --source <path>   源 JSP 项目路径 (default: "./fixtures/source")
  -t, --target <path>   目标 React 项目路径 (default: "./fixtures/target")
  --jsp-url <url>       JSP 服务器地址 (default: "http://localhost:8080")
  --react-url <url>     React 服务器地址 (default: "http://localhost:3000")
  --headless           无头模式运行浏览器 (default: true)
  --no-headless        显示浏览器界面
  -v, --verbose        显示详细输出
```

## 🏗️ 架构设计

### 核心组件

1. **SimpleAIService**: 简化的 AI 服务，支持多种 LLM 提供商
2. **JSPToReactAgent**: 主要的转换 Agent，负责整个迁移流程
3. **TestRunner**: 自动化测试工具，验证转换结果
4. **PuppeteerValidator**: 基于 Puppeteer 的页面验证工具
5. **ReactEmbedder**: 渐进式嵌入机制，支持 JSP 和 React 混合运行

### 转换流程

```mermaid
graph TD
    A[发现 JSP 文件] --> B[分析文件结构]
    B --> C[生成 React 组件]
    C --> D[创建嵌入式版本]
    D --> E[创建渐进式嵌入页面]
    E --> F[生成测试文件]
    F --> G[配置开发环境]
    G --> H[Puppeteer 验证]
    H --> I[生成验证报告]
```

### 渐进式迁移

工具支持两种运行模式：

1. **独立模式**: 完全的 React 应用
2. **嵌入模式**: React 组件嵌入到现有 JSP 页面

## 🔧 配置

### 环境变量

```bash
# DeepSeek API
DEEPSEEK_TOKEN=your-token

# GLM API  
GLM_API_KEY=your-key
# 或
GLM_TOKEN=your-token

# OpenAI API
OPENAI_API_KEY=your-key
```

### 项目结构

```
jsp2react-agent/
├── src/
│   ├── core/
│   │   ├── SimpleAIService.js     # 简化的 AI 服务
│   │   └── JSPToReactAgent.js     # 主要转换 Agent
│   ├── tools/
│   │   └── TestRunner.js          # 测试运行器
│   ├── cli.js                     # CLI 工具
│   └── test.js                    # 测试脚本
├── fixtures/
│   ├── source/                    # 示例 JSP 项目
│   └── target/                    # 转换后的 React 项目
└── package.json
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 详细输出
npm test -- --verbose

# 只运行特定测试
npm run analyze
npm run convert -- --dry-run

# Puppeteer 验证测试
npm run validate

# 完整验证演示（包含服务器启动）
npm run validate-demo
```

## 📊 转换示例

### JSP 输入

```jsp
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<html>
<head>
    <title>Posts</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <div class="max_width_400">
        <c:forEach items="${posts}" var="post">
            <h3>${post.title}</h3>
            <p>${post.postedText}</p>
            <a href="posts/${post.postId}">Continue</a>
        </c:forEach>
    </div>
</body>
</html>
```

### React 输出

```tsx
import React from 'react';

interface Post {
  postId: number;
  title: string;
  postedText: string;
}

interface PostsProps {
  posts: Post[];
}

const Posts: React.FC<PostsProps> = ({ posts = [] }) => {
  return (
    <html>
      <head>
        <title>Posts</title>
        <link rel="stylesheet" href="/css/styles.css" />
      </head>
      <body>
        <div className="max_width_400">
          {posts.map((post) => (
            <div key={post.postId}>
              <h3>{post.title}</h3>
              <p>{post.postedText}</p>
              <a href={`posts/${post.postId}`}>Continue</a>
            </div>
          ))}
        </div>
      </body>
    </html>
  );
};

export default Posts;
```

## 🎭 Puppeteer 验证

工具集成了 Puppeteer 自动化验证功能，确保转换质量：

### 验证内容

1. **页面可访问性**: 检查 JSP 和 React 页面是否正常加载
2. **错误监控**: 捕获 JavaScript 错误和控制台警告
3. **结构对比**: 比较原始 JSP 和转换后 React 页面的结构相似度
4. **截图对比**: 生成页面截图用于视觉验证
5. **性能监控**: 记录页面加载时间和资源使用情况

### 验证流程

```bash
# 1. 执行转换
npm run convert

# 2. 启动服务器
# Terminal 1: 启动 JSP 服务器
cd fixtures/source && mvn jetty:run

# Terminal 2: 启动 React 服务器
cd fixtures/target && npm run dev

# 3. 运行验证
npm run validate

# 或者使用一键验证演示
npm run validate-demo
```

### 验证报告

验证完成后会生成：
- `screenshots/`: 页面截图
- `validation-report.json`: 详细验证报告
- 控制台输出的验证摘要

## 🤝 相比原始代码的改进

1. **简化 AI 服务**: 移除了复杂的日志系统，保留核心功能
2. **统一 API 调用**: 使用标准 fetch API 替代多个 SDK
3. **专注核心功能**: 专门针对 JSP 转 React 的场景优化
4. **更好的错误处理**: 简化但更可靠的错误处理机制
5. **即开即用**: 转换后的代码可以直接运行和测试
6. **自动化验证**: 集成 Puppeteer 确保转换质量
7. **渐进式迁移**: 支持 JSP 和 React 混合运行

## 📝 许可证

MIT License

## 🙋‍♂️ 贡献

欢迎提交 Issue 和 Pull Request！
