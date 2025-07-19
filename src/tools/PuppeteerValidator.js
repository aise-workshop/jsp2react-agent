const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Puppeteer 验证工具
 * 使用 Puppeteer 验证 JSP 转 React 的转换结果
 */
class PuppeteerValidator {
  constructor(options = {}) {
    this.options = {
      jspBaseUrl: options.jspBaseUrl || 'http://localhost:8080',
      reactBaseUrl: options.reactBaseUrl || 'http://localhost:3000',
      headless: options.headless !== false,
      timeout: options.timeout || 30000,
      viewport: options.viewport || { width: 1280, height: 720 },
      screenshotDir: options.screenshotDir || './screenshots',
      verbose: options.verbose || false,
      ...options
    };

    this.browser = null;
    this.validationResults = [];
  }

  /**
   * 初始化 Puppeteer
   */
  async initialize() {
    console.log(chalk.blue('🚀 启动 Puppeteer 浏览器...'));
    
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    await fs.ensureDir(this.options.screenshotDir);
    console.log(chalk.green('✅ Puppeteer 浏览器已启动'));
  }

  /**
   * 验证转换结果
   */
  async validateConversion(conversionResults) {
    if (!this.browser) {
      await this.initialize();
    }

    console.log(chalk.blue('🔍 开始验证转换结果...'));

    for (const result of conversionResults) {
      if (result.reactCode && result.file) {
        await this.validateSingleConversion(result);
      }
    }

    await this.generateValidationReport();
    console.log(chalk.green('✅ 验证完成'));

    return this.validationResults;
  }

  /**
   * 验证单个转换结果
   */
  async validateSingleConversion(conversionResult) {
    const { file, componentName } = conversionResult;
    const jspPath = this.getJSPPath(file.relativePath);
    
    console.log(chalk.gray(`🔍 验证 ${file.name} -> ${componentName}...`));

    const validation = {
      fileName: file.name,
      componentName,
      jspUrl: `${this.options.jspBaseUrl}/${jspPath}`,
      reactUrl: `${this.options.reactBaseUrl}/${this.getReactPath(componentName)}`,
      timestamp: new Date().toISOString(),
      results: {}
    };

    try {
      // 1. 验证原始 JSP 页面
      validation.results.jsp = await this.validateJSPPage(validation.jspUrl, file.name);

      // 2. 验证转换后的 React 页面
      validation.results.react = await this.validateReactPage(validation.reactUrl, componentName);

      // 3. 比较页面结构
      validation.results.comparison = await this.comparePages(validation.results.jsp, validation.results.react);

      // 4. 验证嵌入式版本
      validation.results.embedded = await this.validateEmbeddedVersion(conversionResult);

      validation.success = true;

    } catch (error) {
      validation.error = error.message;
      validation.success = false;
      console.error(chalk.red(`❌ 验证失败 ${file.name}: ${error.message}`));
    }

    this.validationResults.push(validation);
  }

  /**
   * 验证 JSP 页面
   */
  async validateJSPPage(url, fileName) {
    const page = await this.browser.newPage();
    await page.setViewport(this.options.viewport);

    const result = {
      url,
      accessible: false,
      errors: [],
      warnings: [],
      screenshot: null,
      content: null,
      elements: {}
    };

    try {
      // 监听控制台错误
      page.on('console', msg => {
        if (msg.type() === 'error') {
          result.errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          result.warnings.push(msg.text());
        }
      });

      // 监听页面错误
      page.on('pageerror', error => {
        result.errors.push(`Page Error: ${error.message}`);
      });

      // 监听请求失败
      page.on('requestfailed', request => {
        result.errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
      });

      console.log(chalk.gray(`  📄 访问 JSP 页面: ${url}`));
      
      const response = await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: this.options.timeout 
      });

      if (response && response.ok()) {
        result.accessible = true;
        result.statusCode = response.status();

        // 等待页面完全加载
        await page.waitForTimeout(2000);

        // 获取页面内容
        result.content = await page.content();
        
        // 分析页面元素
        result.elements = await this.analyzePageElements(page);

        // 截图
        const screenshotPath = path.join(
          this.options.screenshotDir,
          `jsp-${fileName.replace('.jsp', '')}-${Date.now()}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshot = screenshotPath;

        console.log(chalk.green(`  ✅ JSP 页面访问成功`));

      } else {
        result.errors.push(`HTTP ${response.status()}: ${response.statusText()}`);
      }

    } catch (error) {
      result.errors.push(`Navigation Error: ${error.message}`);
      console.log(chalk.yellow(`  ⚠️  JSP 页面访问失败: ${error.message}`));
    } finally {
      await page.close();
    }

    return result;
  }

  /**
   * 验证 React 页面
   */
  async validateReactPage(url, componentName) {
    const page = await this.browser.newPage();
    await page.setViewport(this.options.viewport);

    const result = {
      url,
      accessible: false,
      errors: [],
      warnings: [],
      screenshot: null,
      content: null,
      elements: {},
      reactErrors: []
    };

    try {
      // 监听 React 错误
      await page.evaluateOnNewDocument(() => {
        window.reactErrors = [];
        const originalError = console.error;
        console.error = (...args) => {
          const message = args.join(' ');
          if (message.includes('React') || message.includes('Warning:')) {
            window.reactErrors.push(message);
          }
          originalError.apply(console, args);
        };
      });

      // 监听控制台消息
      page.on('console', msg => {
        if (msg.type() === 'error') {
          result.errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          result.warnings.push(msg.text());
        }
      });

      console.log(chalk.gray(`  ⚛️  访问 React 页面: ${url}`));

      const response = await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: this.options.timeout 
      });

      if (response && response.ok()) {
        result.accessible = true;
        result.statusCode = response.status();

        // 等待 React 组件渲染
        await page.waitForTimeout(3000);

        // 检查 React 是否正确加载
        const reactLoaded = await page.evaluate(() => {
          return typeof window.React !== 'undefined' && typeof window.ReactDOM !== 'undefined';
        });

        if (!reactLoaded) {
          result.warnings.push('React 库未正确加载');
        }

        // 获取 React 错误
        result.reactErrors = await page.evaluate(() => window.reactErrors || []);

        // 获取页面内容
        result.content = await page.content();
        
        // 分析页面元素
        result.elements = await this.analyzePageElements(page);

        // 截图
        const screenshotPath = path.join(
          this.options.screenshotDir,
          `react-${componentName}-${Date.now()}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshot = screenshotPath;

        console.log(chalk.green(`  ✅ React 页面访问成功`));

      } else {
        result.errors.push(`HTTP ${response.status()}: ${response.statusText()}`);
      }

    } catch (error) {
      result.errors.push(`Navigation Error: ${error.message}`);
      console.log(chalk.yellow(`  ⚠️  React 页面访问失败: ${error.message}`));
    } finally {
      await page.close();
    }

    return result;
  }

  /**
   * 分析页面元素
   */
  async analyzePageElements(page) {
    return await page.evaluate(() => {
      const elements = {
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent.trim()
        })),
        forms: Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input')).length
        })),
        links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
          href: a.href,
          text: a.textContent.trim()
        })),
        images: Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt
        })),
        scripts: Array.from(document.querySelectorAll('script[src]')).map(script => script.src),
        styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => link.href)
      };

      return elements;
    });
  }

  /**
   * 比较页面结构
   */
  async comparePages(jspResult, reactResult) {
    const comparison = {
      structureSimilarity: 0,
      differences: [],
      similarities: []
    };

    if (!jspResult.accessible || !reactResult.accessible) {
      comparison.differences.push('其中一个页面无法访问');
      return comparison;
    }

    // 比较标题
    if (jspResult.elements.title === reactResult.elements.title) {
      comparison.similarities.push('页面标题相同');
    } else {
      comparison.differences.push(`标题不同: JSP="${jspResult.elements.title}" vs React="${reactResult.elements.title}"`);
    }

    // 比较标题数量
    const jspHeadings = jspResult.elements.headings.length;
    const reactHeadings = reactResult.elements.headings.length;
    
    if (jspHeadings === reactHeadings) {
      comparison.similarities.push(`标题数量相同: ${jspHeadings}`);
    } else {
      comparison.differences.push(`标题数量不同: JSP=${jspHeadings} vs React=${reactHeadings}`);
    }

    // 比较表单数量
    const jspForms = jspResult.elements.forms.length;
    const reactForms = reactResult.elements.forms.length;
    
    if (jspForms === reactForms) {
      comparison.similarities.push(`表单数量相同: ${jspForms}`);
    } else {
      comparison.differences.push(`表单数量不同: JSP=${jspForms} vs React=${reactForms}`);
    }

    // 计算结构相似度
    const totalChecks = 3; // 标题、标题数量、表单数量
    const similarities = comparison.similarities.length;
    comparison.structureSimilarity = (similarities / totalChecks) * 100;

    return comparison;
  }

  /**
   * 验证嵌入式版本
   */
  async validateEmbeddedVersion(conversionResult) {
    // 这里可以验证嵌入式 JSP 页面
    // 暂时返回基本信息
    return {
      embeddedPath: conversionResult.embeddedPath,
      validated: false,
      note: '嵌入式验证需要运行的 JSP 服务器'
    };
  }

  /**
   * 获取 JSP 路径
   */
  getJSPPath(relativePath) {
    // 移除 .jsp 扩展名，因为通常 URL 不包含扩展名
    return relativePath.replace('.jsp', '');
  }

  /**
   * 获取 React 路径
   */
  getReactPath(componentName) {
    // 根据组件名生成对应的路由
    const routeMap = {
      'Posts': '',
      'Post': 'post',
      'Create': 'create',
      'Edit': 'edit'
    };
    
    return routeMap[componentName] || componentName.toLowerCase();
  }

  /**
   * 生成验证报告
   */
  async generateValidationReport() {
    const reportPath = path.join(this.options.screenshotDir, 'validation-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.validationResults.length,
        successful: this.validationResults.filter(r => r.success).length,
        failed: this.validationResults.filter(r => !r.success).length
      },
      results: this.validationResults
    };

    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    console.log(chalk.blue(`📊 验证报告已生成: ${reportPath}`));
    
    // 打印摘要
    console.log(chalk.blue('\n📋 验证摘要:'));
    console.log(`总计: ${report.summary.total}`);
    console.log(chalk.green(`成功: ${report.summary.successful}`));
    console.log(chalk.red(`失败: ${report.summary.failed}`));
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log(chalk.gray('🔒 Puppeteer 浏览器已关闭'));
    }
  }
}

module.exports = { PuppeteerValidator };
