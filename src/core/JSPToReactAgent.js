const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { SimpleAIService } = require('./SimpleAIService');
const { ReactEmbedder } = require('../embedded/ReactEmbedder');

/**
 * JSP 转 React 的核心 Agent
 * 专注于渐进式迁移的核心功能
 */
class JSPToReactAgent {
  constructor(options = {}) {
    this.options = {
      sourceDir: options.sourceDir || './fixtures/source',
      targetDir: options.targetDir || './fixtures/target',
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      ...options
    };

    this.aiService = new SimpleAIService({
      verbose: this.options.verbose,
      temperature: 0.1 // 代码生成需要更低的温度
    });

    this.conversionResults = [];
  }

  /**
   * 主要的转换流程
   */
  async convertJSPProject() {
    if (!this.aiService.isEnabled()) {
      throw new Error('AI 服务未启用，请配置相应的 API Key');
    }

    console.log(chalk.blue('🚀 开始 JSP 转 React 项目转换...'));

    try {
      // 1. 发现和分析 JSP 文件
      const jspFiles = await this.discoverJSPFiles();
      console.log(chalk.green(`📁 发现 ${jspFiles.length} 个 JSP 文件`));

      // 2. 分析每个 JSP 文件
      const analysisResults = await this.analyzeJSPFiles(jspFiles);

      // 3. 生成 React 组件
      const conversionResults = await this.generateReactComponents(analysisResults);

      // 4. 创建嵌入式版本（渐进式迁移）
      await this.createEmbeddedVersions(conversionResults);

      // 5. 创建渐进式嵌入页面
      await this.createProgressiveEmbedding(conversionResults);

      // 6. 生成测试文件
      await this.generateTests(conversionResults);

      // 7. 创建开发服务器配置
      await this.createDevServerConfig();

      console.log(chalk.green('✅ JSP 转 React 转换完成！'));
      this.printSummary();

      return this.conversionResults;

    } catch (error) {
      console.error(chalk.red('❌ 转换过程中出现错误:'), error.message);
      throw error;
    }
  }

  /**
   * 发现项目中的 JSP 文件
   */
  async discoverJSPFiles() {
    const webappDir = path.join(this.options.sourceDir, 'src/main/webapp');
    
    if (!await fs.pathExists(webappDir)) {
      throw new Error(`JSP 目录不存在: ${webappDir}`);
    }

    const jspFiles = [];
    const files = await fs.readdir(webappDir, { recursive: true });

    for (const file of files) {
      if (file.endsWith('.jsp')) {
        const fullPath = path.join(webappDir, file);
        const stats = await fs.stat(fullPath);
        
        if (stats.isFile()) {
          jspFiles.push({
            name: file,
            path: fullPath,
            relativePath: file
          });
        }
      }
    }

    return jspFiles;
  }

  /**
   * 分析 JSP 文件
   */
  async analyzeJSPFiles(jspFiles) {
    const results = [];

    for (const jspFile of jspFiles) {
      console.log(chalk.gray(`🔍 分析 ${jspFile.name}...`));

      try {
        const content = await fs.readFile(jspFile.path, 'utf-8');
        const analysisResult = await this.aiService.analyzeJSP(content);
        
        let analysis;
        try {
          analysis = JSON.parse(analysisResult);
        } catch (parseError) {
          console.warn(chalk.yellow(`⚠️  解析 ${jspFile.name} 分析结果失败，使用默认结构`));
          analysis = this.createDefaultAnalysis(jspFile.name);
        }

        results.push({
          file: jspFile,
          content,
          analysis
        });

      } catch (error) {
        console.warn(chalk.yellow(`⚠️  分析 ${jspFile.name} 失败: ${error.message}`));
        results.push({
          file: jspFile,
          content: await fs.readFile(jspFile.path, 'utf-8'),
          analysis: this.createDefaultAnalysis(jspFile.name),
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 生成 React 组件
   */
  async generateReactComponents(analysisResults) {
    const results = [];

    for (const result of analysisResults) {
      console.log(chalk.gray(`⚛️  生成 ${result.file.name} 的 React 组件...`));

      try {
        const componentName = this.getComponentName(result.file.name);
        const reactCode = await this.aiService.convertJSPToReact(result.content, {
          componentName,
          includeStyles: true
        });

        // 保存 React 组件
        const componentPath = path.join(
          this.options.targetDir,
          'src/components',
          `${componentName}.tsx`
        );

        if (!this.options.dryRun) {
          await fs.ensureDir(path.dirname(componentPath));
          await fs.writeFile(componentPath, this.wrapReactComponent(reactCode, componentName));
        }

        results.push({
          ...result,
          componentName,
          reactCode,
          componentPath
        });

        console.log(chalk.green(`✅ 生成组件: ${componentName}`));

      } catch (error) {
        console.error(chalk.red(`❌ 生成 ${result.file.name} 组件失败: ${error.message}`));
        results.push({
          ...result,
          error: error.message
        });
      }
    }

    this.conversionResults = results;
    return results;
  }

  /**
   * 创建嵌入式版本（渐进式迁移）
   */
  async createEmbeddedVersions(conversionResults) {
    console.log(chalk.blue('🔗 创建嵌入式版本...'));

    for (const result of conversionResults) {
      if (result.reactCode) {
        const embeddedCode = this.createEmbeddedComponent(result);
        const embeddedPath = path.join(
          this.options.targetDir,
          'src/embedded',
          `${result.componentName}Embedded.tsx`
        );

        if (!this.options.dryRun) {
          await fs.ensureDir(path.dirname(embeddedPath));
          await fs.writeFile(embeddedPath, embeddedCode);
        }

        result.embeddedPath = embeddedPath;
      }
    }
  }

  /**
   * 创建渐进式嵌入页面
   */
  async createProgressiveEmbedding(conversionResults) {
    console.log(chalk.blue('🌉 创建渐进式嵌入页面...'));

    const embedder = new ReactEmbedder({
      targetDir: this.options.targetDir,
      jspDir: path.join(this.options.sourceDir, 'src/main/webapp'),
      embedDir: path.join(this.options.targetDir, '../embedded'),
      verbose: this.options.verbose
    });

    if (!this.options.dryRun) {
      await embedder.createEmbeddedJSPPages(conversionResults);
      await embedder.generateUsageGuide();
    }

    console.log(chalk.green('✅ 渐进式嵌入页面创建完成'));
  }

  /**
   * 包装 React 组件
   */
  wrapReactComponent(reactCode, componentName) {
    return `import React from 'react';

${reactCode}

export default ${componentName};`;
  }

  /**
   * 创建嵌入式组件
   */
  createEmbeddedComponent(result) {
    const { componentName } = result;
    
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import ${componentName} from '../components/${componentName}';

// 嵌入式组件，可以在 JSP 页面中使用
class ${componentName}Embedded {
  static mount(containerId: string, props: any = {}) {
    const container = document.getElementById(containerId);
    if (container) {
      const root = ReactDOM.createRoot(container);
      root.render(<${componentName} {...props} />);
      return root;
    }
    console.error(\`Container with id '\${containerId}' not found\`);
    return null;
  }

  static unmount(containerId: string) {
    const container = document.getElementById(containerId);
    if (container) {
      const root = ReactDOM.createRoot(container);
      root.unmount();
    }
  }
}

// 全局暴露，供 JSP 页面调用
(window as any).${componentName}Embedded = ${componentName}Embedded;

export default ${componentName}Embedded;`;
  }

  /**
   * 获取组件名称
   */
  getComponentName(fileName) {
    const baseName = path.basename(fileName, '.jsp');
    return baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * 创建默认分析结果
   */
  createDefaultAnalysis(fileName) {
    return {
      title: fileName.replace('.jsp', ''),
      jstlTags: [],
      variables: [],
      forms: [],
      links: [],
      suggestedComponents: [this.getComponentName(fileName)]
    };
  }

  /**
   * 生成测试文件
   */
  async generateTests(conversionResults) {
    console.log(chalk.blue('🧪 生成测试文件...'));

    for (const result of conversionResults) {
      if (result.reactCode) {
        const testCode = this.createTestFile(result);
        const testPath = path.join(
          this.options.targetDir,
          'src/__tests__',
          `${result.componentName}.test.tsx`
        );

        if (!this.options.dryRun) {
          await fs.ensureDir(path.dirname(testPath));
          await fs.writeFile(testPath, testCode);
        }

        result.testPath = testPath;
      }
    }
  }

  /**
   * 创建测试文件
   */
  createTestFile(result) {
    const { componentName } = result;

    return `import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${componentName} from '../components/${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  it('matches snapshot', () => {
    const { container } = render(<${componentName} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});`;
  }

  /**
   * 创建开发服务器配置
   */
  async createDevServerConfig() {
    console.log(chalk.blue('⚙️  创建开发服务器配置...'));

    const configContent = this.createDevConfig();
    const configPath = path.join(this.options.targetDir, 'dev-server.config.js');

    if (!this.options.dryRun) {
      await fs.writeFile(configPath, configContent);
    }
  }

  /**
   * 创建开发配置
   */
  createDevConfig() {
    return `// 开发服务器配置，支持 JSP 和 React 混合开发
module.exports = {
  // Next.js 开发服务器配置
  async rewrites() {
    return [
      // 代理 JSP 请求到原始服务器
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/:path*'
      }
    ];
  },

  // 静态文件服务
  async headers() {
    return [
      {
        source: '/embedded/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  }
};`;
  }

  /**
   * 打印转换摘要
   */
  printSummary() {
    console.log(chalk.blue('\n📊 转换摘要:'));
    console.log(`总文件数: ${this.conversionResults.length}`);
    console.log(`成功转换: ${this.conversionResults.filter(r => r.reactCode).length}`);
    console.log(`转换失败: ${this.conversionResults.filter(r => r.error).length}`);

    if (this.options.verbose) {
      this.conversionResults.forEach(result => {
        const status = result.reactCode ? '✅' : '❌';
        console.log(`  ${status} ${result.file.name} -> ${result.componentName || 'Failed'}`);
      });
    }
  }
}

module.exports = { JSPToReactAgent };
