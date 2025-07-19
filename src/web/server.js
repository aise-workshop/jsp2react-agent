const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { JSPToReactAgent } = require('../core/JSPToReactAgent');

/**
 * 简单的 Web 界面服务器
 * 提供可视化的转换界面和结果展示
 */
class WebServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || 3001,
      sourceDir: options.sourceDir || './fixtures/source',
      targetDir: options.targetDir || './fixtures/target',
      ...options
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.set('view engine', 'html');
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 主页
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API: 获取 JSP 文件列表
    this.app.get('/api/jsp-files', async (req, res) => {
      try {
        const agent = new JSPToReactAgent({
          sourceDir: this.options.sourceDir,
          targetDir: this.options.targetDir
        });

        const jspFiles = await agent.discoverJSPFiles();
        res.json({ success: true, files: jspFiles });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: 分析 JSP 文件
    this.app.post('/api/analyze', async (req, res) => {
      try {
        const { filePath } = req.body;
        
        if (!filePath) {
          return res.status(400).json({ success: false, error: '缺少文件路径' });
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const agent = new JSPToReactAgent({
          sourceDir: this.options.sourceDir,
          targetDir: this.options.targetDir
        });

        const analysis = await agent.aiService.analyzeJSP(content);
        
        res.json({ 
          success: true, 
          analysis: JSON.parse(analysis),
          content 
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: 转换 JSP 文件
    this.app.post('/api/convert', async (req, res) => {
      try {
        const { filePath, componentName } = req.body;
        
        if (!filePath) {
          return res.status(400).json({ success: false, error: '缺少文件路径' });
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const agent = new JSPToReactAgent({
          sourceDir: this.options.sourceDir,
          targetDir: this.options.targetDir
        });

        const reactCode = await agent.aiService.convertJSPToReact(content, {
          componentName: componentName || 'GeneratedComponent'
        });

        res.json({ 
          success: true, 
          reactCode,
          componentName: componentName || 'GeneratedComponent'
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: 执行完整转换
    this.app.post('/api/convert-project', async (req, res) => {
      try {
        const agent = new JSPToReactAgent({
          sourceDir: this.options.sourceDir,
          targetDir: this.options.targetDir,
          verbose: false
        });

        const results = await agent.convertJSPProject();
        
        res.json({ 
          success: true, 
          results: results.map(r => ({
            fileName: r.file?.name,
            componentName: r.componentName,
            success: !!r.reactCode,
            error: r.error
          }))
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: 获取转换状态
    this.app.get('/api/status', (req, res) => {
      const { SimpleAIService } = require('../core/SimpleAIService');
      const aiService = new SimpleAIService();
      
      res.json({
        success: true,
        aiEnabled: aiService.isEnabled(),
        provider: aiService.llmConfig?.providerName || 'None',
        sourceDir: this.options.sourceDir,
        targetDir: this.options.targetDir
      });
    });
  }

  /**
   * 启动服务器
   */
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(chalk.green(`🌐 Web 界面已启动: http://localhost:${this.options.port}`));
        resolve();
      });
    });
  }

  /**
   * 停止服务器
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log(chalk.gray('🌐 Web 服务器已停止'));
          resolve();
        });
      });
    }
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  const server = new WebServer();
  
  server.start().catch(error => {
    console.error(chalk.red('启动 Web 服务器失败:'), error);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n收到关闭信号，正在停止服务器...'));
    await server.stop();
    process.exit(0);
  });
}

module.exports = { WebServer };
