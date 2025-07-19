const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * React 嵌入器 - 实现渐进式迁移
 * 将 React 组件嵌入到现有 JSP 页面中
 */
class ReactEmbedder {
  constructor(options = {}) {
    this.options = {
      targetDir: options.targetDir || './fixtures/target',
      jspDir: options.jspDir || './fixtures/source/src/main/webapp',
      embedDir: options.embedDir || './fixtures/embedded',
      verbose: options.verbose || false,
      ...options
    };
  }

  /**
   * 创建嵌入式版本的 JSP 页面
   */
  async createEmbeddedJSPPages(conversionResults) {
    console.log(chalk.blue('🔗 创建嵌入式 JSP 页面...'));

    await fs.ensureDir(this.options.embedDir);

    for (const result of conversionResults) {
      if (result.reactCode && result.file) {
        await this.createEmbeddedJSP(result);
      }
    }

    // 创建通用的嵌入脚本
    await this.createEmbedScript();
    
    // 创建开发服务器配置
    await this.createProxyConfig();

    console.log(chalk.green('✅ 嵌入式页面创建完成'));
  }

  /**
   * 创建单个嵌入式 JSP 页面
   */
  async createEmbeddedJSP(result) {
    const { file, componentName } = result;
    const originalContent = await fs.readFile(file.path, 'utf-8');
    
    // 解析原始 JSP 内容
    const { head, body } = this.parseJSPContent(originalContent);
    
    // 创建嵌入式版本
    const embeddedContent = this.createEmbeddedJSPContent({
      originalHead: head,
      originalBody: body,
      componentName,
      fileName: file.name
    });

    // 保存嵌入式 JSP
    const embeddedPath = path.join(
      this.options.embedDir,
      'jsp',
      file.name
    );

    await fs.ensureDir(path.dirname(embeddedPath));
    await fs.writeFile(embeddedPath, embeddedContent);

    if (this.options.verbose) {
      console.log(chalk.gray(`  ✓ 创建嵌入式页面: ${file.name}`));
    }
  }

  /**
   * 解析 JSP 内容
   */
  parseJSPContent(content) {
    // 简单的 HTML 解析
    const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    return {
      head: headMatch ? headMatch[1] : '',
      body: bodyMatch ? bodyMatch[1] : content
    };
  }

  /**
   * 创建嵌入式 JSP 内容
   */
  createEmbeddedJSPContent({ originalHead, originalBody, componentName, fileName }) {
    return `<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page isELIgnored="false" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>嵌入式 React - ${fileName}</title>
    
    <!-- 原始样式 -->
    ${originalHead}
    
    <!-- React 开发环境 -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    
    <!-- Babel 转换器 (仅开发环境) -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <style>
        /* 嵌入式容器样式 */
        .react-embedded-container {
            /* 继承原始样式 */
        }
        
        .react-fallback {
            padding: 20px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            text-align: center;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <!-- 渐进式增强：显示原始内容作为后备 -->
    <div id="original-content" style="display: none;">
        ${originalBody}
    </div>
    
    <!-- React 组件容器 -->
    <div id="react-${componentName.toLowerCase()}-container">
        <div class="react-fallback">
            <p>正在加载 React 组件...</p>
            <p><small>如果长时间未加载，请检查网络连接或 JavaScript 是否启用</small></p>
        </div>
    </div>

    <!-- 嵌入脚本 -->
    <script type="text/babel">
        // React 组件定义 (从服务器获取)
        async function load${componentName}() {
            try {
                // 从 React 开发服务器获取组件
                const response = await fetch('http://localhost:3000/api/component/${componentName}');
                
                if (!response.ok) {
                    throw new Error('组件加载失败');
                }
                
                const componentCode = await response.text();
                
                // 动态执行组件代码
                const ComponentModule = eval(\`(\${componentCode})\`);
                const Component = ComponentModule.default || ComponentModule;
                
                // 渲染组件
                const container = document.getElementById('react-${componentName.toLowerCase()}-container');
                const root = ReactDOM.createRoot(container);
                
                // 从 JSP 上下文获取数据
                const props = window.jspData || {};
                
                root.render(React.createElement(Component, props));
                
            } catch (error) {
                console.error('React 组件加载失败:', error);
                
                // 回退到原始内容
                const originalContent = document.getElementById('original-content');
                const container = document.getElementById('react-${componentName.toLowerCase()}-container');
                
                container.innerHTML = originalContent.innerHTML;
                originalContent.style.display = 'block';
            }
        }

        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', function() {
            // 延迟加载，确保 React 库已加载
            setTimeout(load${componentName}, 100);
        });
        
        // 全局错误处理
        window.addEventListener('error', function(event) {
            console.error('页面错误:', event.error);
            
            // 如果是 React 相关错误，回退到原始内容
            if (event.error && event.error.message.includes('React')) {
                const originalContent = document.getElementById('original-content');
                const container = document.getElementById('react-${componentName.toLowerCase()}-container');
                
                if (originalContent && container) {
                    container.innerHTML = originalContent.innerHTML;
                    originalContent.style.display = 'block';
                }
            }
        });
    </script>

    <!-- JSP 数据传递 -->
    <script>
        // 将 JSP 数据传递给 React 组件
        window.jspData = {
            // 这里可以通过 JSP 表达式传递数据
            // 例如: posts: <%= posts != null ? posts.toString() : "[]" %>,
            // 或者通过 AJAX 从后端获取
        };
    </script>
</body>
</html>`;
  }

  /**
   * 创建嵌入脚本
   */
  async createEmbedScript() {
    const scriptContent = `/**
 * React 嵌入脚本
 * 用于在 JSP 页面中嵌入 React 组件
 */

class ReactEmbedHelper {
  constructor() {
    this.components = new Map();
    this.isReactLoaded = false;
  }

  /**
   * 检查 React 是否已加载
   */
  async ensureReactLoaded() {
    if (this.isReactLoaded) return;

    return new Promise((resolve, reject) => {
      if (window.React && window.ReactDOM) {
        this.isReactLoaded = true;
        resolve();
        return;
      }

      // 动态加载 React
      const reactScript = document.createElement('script');
      reactScript.src = 'https://unpkg.com/react@18/umd/react.development.js';
      reactScript.crossOrigin = 'anonymous';
      
      const reactDOMScript = document.createElement('script');
      reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.development.js';
      reactDOMScript.crossOrigin = 'anonymous';

      let loadedCount = 0;
      const onLoad = () => {
        loadedCount++;
        if (loadedCount === 2) {
          this.isReactLoaded = true;
          resolve();
        }
      };

      reactScript.onload = onLoad;
      reactDOMScript.onload = onLoad;
      reactScript.onerror = reject;
      reactDOMScript.onerror = reject;

      document.head.appendChild(reactScript);
      document.head.appendChild(reactDOMScript);
    });
  }

  /**
   * 嵌入 React 组件
   */
  async embedComponent(containerId, componentName, props = {}) {
    try {
      await this.ensureReactLoaded();

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(\`容器元素未找到: \${containerId}\`);
      }

      // 从缓存或服务器获取组件
      let Component = this.components.get(componentName);
      
      if (!Component) {
        Component = await this.loadComponent(componentName);
        this.components.set(componentName, Component);
      }

      // 渲染组件
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Component, props));

      return root;

    } catch (error) {
      console.error(\`嵌入组件失败 (\${componentName}):\`, error);
      throw error;
    }
  }

  /**
   * 从服务器加载组件
   */
  async loadComponent(componentName) {
    const response = await fetch(\`http://localhost:3000/api/component/\${componentName}\`);
    
    if (!response.ok) {
      throw new Error(\`组件加载失败: \${response.statusText}\`);
    }

    const componentCode = await response.text();
    
    // 安全地执行组件代码
    const ComponentModule = new Function('React', 'return ' + componentCode)(React);
    
    return ComponentModule.default || ComponentModule;
  }

  /**
   * 批量嵌入组件
   */
  async embedMultiple(embeddings) {
    const promises = embeddings.map(({ containerId, componentName, props }) =>
      this.embedComponent(containerId, componentName, props)
    );

    return Promise.allSettled(promises);
  }
}

// 全局实例
window.ReactEmbedHelper = new ReactEmbedHelper();

// 便捷方法
window.embedReactComponent = (containerId, componentName, props) => {
  return window.ReactEmbedHelper.embedComponent(containerId, componentName, props);
};`;

    const scriptPath = path.join(this.options.embedDir, 'react-embed.js');
    await fs.writeFile(scriptPath, scriptContent);

    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ 创建嵌入脚本: react-embed.js'));
    }
  }

  /**
   * 创建代理配置
   */
  async createProxyConfig() {
    const configContent = `/**
 * 代理配置 - 支持 JSP 和 React 混合开发
 * 使用 nginx 或 Apache 配置反向代理
 */

// Nginx 配置示例
const nginxConfig = \`
server {
    listen 8080;
    server_name localhost;

    # JSP 应用 (Tomcat)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # React 开发服务器
    location /react/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # WebSocket 支持 (热重载)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态资源
    location /static/ {
        alias /path/to/react/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`;

// Express 代理示例 (开发环境)
const expressProxy = \`
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// 代理 React 开发服务器
app.use('/react', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/react': ''
  }
}));

// 代理 JSP 应用
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true
}));

app.listen(9000, () => {
  console.log('代理服务器运行在 http://localhost:9000');
});
\`;

module.exports = {
  nginxConfig,
  expressProxy
};`;

    const configPath = path.join(this.options.embedDir, 'proxy-config.js');
    await fs.writeFile(configPath, configContent);

    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ 创建代理配置: proxy-config.js'));
    }
  }

  /**
   * 生成使用说明
   */
  async generateUsageGuide() {
    const guideContent = `# 渐进式嵌入使用指南

## 概述

渐进式嵌入允许你在现有的 JSP 页面中逐步引入 React 组件，实现平滑的技术栈迁移。

## 使用方式

### 1. 直接嵌入 (推荐)

使用生成的嵌入式 JSP 页面：

\`\`\`bash
# 复制嵌入式页面到你的 JSP 项目
cp embedded/jsp/*.jsp /path/to/your/jsp/project/src/main/webapp/
\`\`\`

### 2. 手动嵌入

在现有 JSP 页面中添加 React 组件：

\`\`\`jsp
<%-- 在 head 中添加 React 库 --%>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="/embedded/react-embed.js"></script>

<%-- 在需要的位置添加容器 --%>
<div id="react-component-container"></div>

<%-- 嵌入组件 --%>
<script>
document.addEventListener('DOMContentLoaded', function() {
    embedReactComponent('react-component-container', 'YourComponent', {
        // 传递给组件的 props
        data: <%= yourJspData %>
    });
});
</script>
\`\`\`

### 3. 批量嵌入

同时嵌入多个组件：

\`\`\`javascript
ReactEmbedHelper.embedMultiple([
    {
        containerId: 'header-component',
        componentName: 'Header',
        props: { title: 'My App' }
    },
    {
        containerId: 'posts-component', 
        componentName: 'Posts',
        props: { posts: <%= posts %> }
    }
]);
\`\`\`

## 开发环境设置

### 1. 启动 React 开发服务器

\`\`\`bash
cd fixtures/target
npm run dev
\`\`\`

### 2. 启动 JSP 应用

\`\`\`bash
cd fixtures/source
mvn jetty:run
\`\`\`

### 3. 配置代理 (可选)

使用 nginx 或 Express 代理统一访问：

\`\`\`bash
# 使用提供的代理配置
node embedded/proxy-config.js
\`\`\`

## 数据传递

### JSP 到 React

\`\`\`jsp
<script>
window.jspData = {
    posts: <%= posts.toJson() %>,
    user: {
        id: <%= user.id %>,
        name: '<%= user.name %>'
    }
};
</script>
\`\`\`

### React 到 JSP

\`\`\`javascript
// 通过自定义事件
const event = new CustomEvent('reactDataUpdate', {
    detail: { action: 'updatePost', postId: 123 }
});
window.dispatchEvent(event);

// 在 JSP 中监听
window.addEventListener('reactDataUpdate', function(event) {
    // 处理 React 组件的数据更新
    console.log('React 数据更新:', event.detail);
});
\`\`\`

## 最佳实践

1. **渐进式替换**: 从小的、独立的组件开始
2. **数据隔离**: 保持 React 组件的数据独立性
3. **错误处理**: 提供原始 JSP 内容作为后备
4. **性能优化**: 使用组件懒加载和缓存
5. **测试**: 确保新旧系统的兼容性

## 故障排除

### 组件无法加载

1. 检查 React 开发服务器是否运行
2. 检查网络连接和跨域设置
3. 查看浏览器控制台错误信息

### 数据传递问题

1. 确保 JSP 数据格式正确
2. 检查 JSON 序列化
3. 验证组件 props 类型

### 样式冲突

1. 使用 CSS 模块或 styled-components
2. 添加组件特定的 CSS 前缀
3. 检查 CSS 优先级

## 生产环境部署

1. 构建 React 应用: \`npm run build\`
2. 配置静态资源服务
3. 更新组件加载路径
4. 启用 CDN 和缓存优化
`;

    const guidePath = path.join(this.options.embedDir, 'USAGE.md');
    await fs.writeFile(guidePath, guideContent);

    console.log(chalk.blue(`📖 使用指南已生成: ${guidePath}`));
  }
}

module.exports = { ReactEmbedder };
