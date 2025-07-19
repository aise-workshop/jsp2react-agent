#!/usr/bin/env node

const chalk = require('chalk');
const { spawn } = require('child_process');
const { JSPToReactAgent } = require('./src/core/JSPToReactAgent');
const { PuppeteerValidator } = require('./src/tools/PuppeteerValidator');
const fs = require('fs-extra');
const path = require('path');

/**
 * 完整的验证演示脚本
 * 包含转换和 Puppeteer 验证的完整流程
 */
class ValidationDemo {
  constructor() {
    this.processes = [];
    this.sourceDir = './fixtures/source';
    this.targetDir = './fixtures/target';
  }

  /**
   * 运行完整的验证演示
   */
  async run() {
    console.log(chalk.blue('🎯 JSP2React 完整验证演示'));
    console.log(chalk.gray('=' .repeat(60)));

    try {
      // 1. 检查环境
      await this.checkEnvironment();

      // 2. 执行转换
      await this.performConversion();

      // 3. 启动服务器
      await this.startServers();

      // 4. 等待服务器就绪
      await this.waitForServers();

      // 5. 运行 Puppeteer 验证
      await this.runPuppeteerValidation();

      // 6. 显示结果
      await this.showResults();

      console.log(chalk.green('\n🎉 验证演示完成！'));

    } catch (error) {
      console.error(chalk.red('\n❌ 验证演示失败:'), error.message);
      process.exit(1);
    } finally {
      // 清理资源
      await this.cleanup();
    }
  }

  /**
   * 检查环境
   */
  async checkEnvironment() {
    console.log(chalk.blue('\n📋 步骤 1: 环境检查'));

    // 检查源项目
    if (!await fs.pathExists(this.sourceDir)) {
      throw new Error(`源项目不存在: ${this.sourceDir}`);
    }

    // 检查目标项目
    await fs.ensureDir(this.targetDir);

    // 检查 AI 服务
    const { SimpleAIService } = require('./src/core/SimpleAIService');
    const aiService = new SimpleAIService();
    
    if (!aiService.isEnabled()) {
      console.log(chalk.yellow('⚠️  AI 服务未配置，将使用模拟模式'));
    } else {
      console.log(chalk.green('✅ AI 服务配置正常'));
    }

    console.log(chalk.green('✅ 环境检查完成'));
  }

  /**
   * 执行转换
   */
  async performConversion() {
    console.log(chalk.blue('\n📋 步骤 2: 执行 JSP 转 React 转换'));

    const agent = new JSPToReactAgent({
      sourceDir: this.sourceDir,
      targetDir: this.targetDir,
      verbose: false
    });

    const results = await agent.convertJSPProject();
    
    const successCount = results.filter(r => r.reactCode).length;
    console.log(chalk.green(`✅ 转换完成: ${successCount}/${results.length} 个文件`));
  }

  /**
   * 启动服务器
   */
  async startServers() {
    console.log(chalk.blue('\n📋 步骤 3: 启动开发服务器'));

    // 启动 React 开发服务器
    await this.startReactServer();

    // 尝试启动 JSP 服务器（如果可能）
    await this.startJSPServer();
  }

  /**
   * 启动 React 服务器
   */
  async startReactServer() {
    console.log(chalk.gray('🚀 启动 React 开发服务器...'));

    // 检查是否已安装依赖
    const nodeModulesPath = path.join(this.targetDir, 'node_modules');
    if (!await fs.pathExists(nodeModulesPath)) {
      console.log(chalk.gray('📦 安装 React 项目依赖...'));
      await this.runCommand('npm', ['install'], this.targetDir);
    }

    // 启动开发服务器
    const reactProcess = spawn('npm', ['run', 'dev'], {
      cwd: this.targetDir,
      stdio: 'pipe',
      shell: true
    });

    this.processes.push({
      name: 'React Server',
      process: reactProcess,
      port: 3000
    });

    console.log(chalk.green('✅ React 服务器启动中...'));
  }

  /**
   * 启动 JSP 服务器
   */
  async startJSPServer() {
    console.log(chalk.gray('🚀 尝试启动 JSP 服务器...'));

    try {
      // 检查是否有 Maven 项目
      const pomPath = path.join(this.sourceDir, 'pom.xml');
      
      if (await fs.pathExists(pomPath)) {
        // 使用 Maven Jetty 插件启动
        const jspProcess = spawn('mvn', ['jetty:run'], {
          cwd: this.sourceDir,
          stdio: 'pipe',
          shell: true
        });

        this.processes.push({
          name: 'JSP Server',
          process: jspProcess,
          port: 8080
        });

        console.log(chalk.green('✅ JSP 服务器启动中...'));
      } else {
        console.log(chalk.yellow('⚠️  未找到 Maven 项目，跳过 JSP 服务器启动'));
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  JSP 服务器启动失败: ${error.message}`));
    }
  }

  /**
   * 等待服务器就绪
   */
  async waitForServers() {
    console.log(chalk.blue('\n📋 步骤 4: 等待服务器就绪'));

    const maxWaitTime = 60000; // 60秒
    const checkInterval = 2000; // 2秒
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const reactReady = await this.checkServerHealth('http://localhost:3000');
      const jspReady = await this.checkServerHealth('http://localhost:8080');

      if (reactReady) {
        console.log(chalk.green('✅ React 服务器就绪'));
        
        if (jspReady) {
          console.log(chalk.green('✅ JSP 服务器就绪'));
        } else {
          console.log(chalk.yellow('⚠️  JSP 服务器未就绪，将只验证 React 部分'));
        }
        break;
      }

      console.log(chalk.gray('⏳ 等待服务器启动...'));
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    if (Date.now() - startTime >= maxWaitTime) {
      throw new Error('服务器启动超时');
    }
  }

  /**
   * 检查服务器健康状态
   */
  async checkServerHealth(url) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 5000 
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 运行 Puppeteer 验证
   */
  async runPuppeteerValidation() {
    console.log(chalk.blue('\n📋 步骤 5: 运行 Puppeteer 验证'));

    // 读取转换结果
    const resultsPath = path.join(this.targetDir, 'conversion-results.json');
    const conversionResults = await fs.readJson(resultsPath);

    const validator = new PuppeteerValidator({
      jspBaseUrl: 'http://localhost:8080',
      reactBaseUrl: 'http://localhost:3000',
      headless: true,
      screenshotDir: path.join(this.targetDir, 'screenshots'),
      verbose: true
    });

    const validationResults = await validator.validateConversion(conversionResults);
    await validator.close();

    this.validationResults = validationResults;
    
    const successful = validationResults.filter(r => r.success).length;
    const total = validationResults.length;
    
    console.log(chalk.green(`✅ Puppeteer 验证完成: ${successful}/${total} 通过`));
  }

  /**
   * 显示结果
   */
  async showResults() {
    console.log(chalk.blue('\n📋 步骤 6: 验证结果'));

    if (!this.validationResults) {
      console.log(chalk.yellow('⚠️  没有验证结果'));
      return;
    }

    console.log(chalk.blue('\n📊 详细验证结果:'));
    
    this.validationResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.fileName} -> ${result.componentName}`);
      
      if (result.results) {
        if (result.results.jsp?.accessible) {
          console.log(chalk.gray(`  📄 JSP 页面: 可访问`));
        }
        
        if (result.results.react?.accessible) {
          console.log(chalk.gray(`  ⚛️  React 页面: 可访问`));
        }
        
        if (result.results.comparison) {
          const similarity = result.results.comparison.structureSimilarity;
          console.log(chalk.gray(`  🔍 结构相似度: ${similarity.toFixed(1)}%`));
        }
      }
      
      if (result.error) {
        console.log(chalk.red(`  ❌ 错误: ${result.error}`));
      }
    });

    // 显示截图位置
    const screenshotDir = path.join(this.targetDir, 'screenshots');
    if (await fs.pathExists(screenshotDir)) {
      console.log(chalk.blue(`\n📸 截图已保存到: ${screenshotDir}`));
    }
  }

  /**
   * 运行命令
   */
  async runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令失败: ${command} ${args.join(' ')}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log(chalk.gray('\n🧹 清理资源...'));

    for (const { name, process } of this.processes) {
      try {
        process.kill('SIGTERM');
        console.log(chalk.gray(`  ✓ 停止 ${name}`));
      } catch (error) {
        console.log(chalk.gray(`  ⚠️  停止 ${name} 失败: ${error.message}`));
      }
    }
  }
}

// 运行演示
if (require.main === module) {
  const demo = new ValidationDemo();
  
  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n收到中断信号，正在清理...'));
    await demo.cleanup();
    process.exit(0);
  });

  demo.run().catch(error => {
    console.error(chalk.red('演示失败:'), error);
    process.exit(1);
  });
}

module.exports = { ValidationDemo };
