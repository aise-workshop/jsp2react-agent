#!/usr/bin/env node

/**
 * Puppeteer 验证示例
 * 演示如何使用 Puppeteer 验证 JSP 转 React 的转换结果
 */

const { PuppeteerValidator } = require('../src/tools/PuppeteerValidator');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

async function puppeteerValidationExample() {
  console.log(chalk.blue('🎭 Puppeteer 验证示例'));
  console.log(chalk.gray('=' .repeat(50)));

  try {
    // 1. 检查转换结果
    console.log(chalk.blue('\n步骤 1: 检查转换结果'));
    const resultsPath = './fixtures/target/conversion-results.json';
    
    if (!await fs.pathExists(resultsPath)) {
      console.log(chalk.yellow('⚠️  未找到转换结果，创建模拟数据...'));
      await createMockConversionResults();
    }

    const conversionResults = await fs.readJson(resultsPath);
    console.log(chalk.green(`✅ 找到 ${conversionResults.length} 个转换结果`));

    // 2. 检查服务器状态
    console.log(chalk.blue('\n步骤 2: 检查服务器状态'));
    const serverStatus = await checkServers();
    
    if (!serverStatus.react && !serverStatus.jsp) {
      console.log(chalk.yellow('⚠️  没有运行的服务器，将演示验证器配置'));
      await demonstrateValidatorConfig();
      return;
    }

    // 3. 创建验证器
    console.log(chalk.blue('\n步骤 3: 创建 Puppeteer 验证器'));
    const validator = new PuppeteerValidator({
      jspBaseUrl: 'http://localhost:8080',
      reactBaseUrl: 'http://localhost:3000',
      headless: true, // 在示例中使用无头模式
      screenshotDir: './examples/screenshots',
      verbose: true
    });

    // 4. 运行验证
    console.log(chalk.blue('\n步骤 4: 运行验证'));
    const validationResults = await validator.validateConversion(conversionResults);

    // 5. 显示结果
    console.log(chalk.blue('\n步骤 5: 验证结果'));
    displayValidationResults(validationResults);

    // 6. 清理
    await validator.close();

    console.log(chalk.green('\n🎉 Puppeteer 验证示例完成！'));

  } catch (error) {
    console.error(chalk.red('❌ 验证示例失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 创建模拟转换结果
 */
async function createMockConversionResults() {
  const mockResults = [
    {
      file: {
        name: 'posts.jsp',
        relativePath: 'posts.jsp',
        path: './fixtures/source/src/main/webapp/posts.jsp'
      },
      componentName: 'Posts',
      reactCode: true,
      success: true
    },
    {
      file: {
        name: 'post.jsp',
        relativePath: 'post.jsp',
        path: './fixtures/source/src/main/webapp/post.jsp'
      },
      componentName: 'Post',
      reactCode: true,
      success: true
    },
    {
      file: {
        name: 'create.jsp',
        relativePath: 'create.jsp',
        path: './fixtures/source/src/main/webapp/create.jsp'
      },
      componentName: 'Create',
      reactCode: true,
      success: true
    }
  ];

  await fs.ensureDir('./fixtures/target');
  await fs.writeJson('./fixtures/target/conversion-results.json', mockResults, { spaces: 2 });
  
  console.log(chalk.gray('  ✓ 创建模拟转换结果'));
}

/**
 * 检查服务器状态
 */
async function checkServers() {
  const status = {
    react: false,
    jsp: false
  };

  try {
    const reactResponse = await fetch('http://localhost:3000', { 
      method: 'HEAD',
      timeout: 3000 
    });
    status.react = reactResponse.ok;
  } catch (error) {
    // React 服务器未运行
  }

  try {
    const jspResponse = await fetch('http://localhost:8080', { 
      method: 'HEAD',
      timeout: 3000 
    });
    status.jsp = jspResponse.ok;
  } catch (error) {
    // JSP 服务器未运行
  }

  console.log(chalk.gray(`  React 服务器: ${status.react ? '运行' : '停止'}`));
  console.log(chalk.gray(`  JSP 服务器: ${status.jsp ? '运行' : '停止'}`));

  return status;
}

/**
 * 演示验证器配置
 */
async function demonstrateValidatorConfig() {
  console.log(chalk.blue('\n🔧 Puppeteer 验证器配置示例:'));
  
  const configExample = `
const validator = new PuppeteerValidator({
  // 服务器地址
  jspBaseUrl: 'http://localhost:8080',
  reactBaseUrl: 'http://localhost:3000',
  
  // 浏览器设置
  headless: true,                    // 无头模式
  viewport: { width: 1280, height: 720 },
  timeout: 30000,                    // 30秒超时
  
  // 输出设置
  screenshotDir: './screenshots',    // 截图目录
  verbose: true                      // 详细输出
});

// 运行验证
const results = await validator.validateConversion(conversionResults);
await validator.close();
`;

  console.log(chalk.gray(configExample));

  console.log(chalk.blue('🚀 启动服务器进行实际验证:'));
  console.log(chalk.cyan('  # Terminal 1: 启动 React 服务器'));
  console.log(chalk.gray('  cd fixtures/target && npm run dev'));
  console.log(chalk.cyan('  # Terminal 2: 启动 JSP 服务器'));
  console.log(chalk.gray('  cd fixtures/source && mvn jetty:run'));
  console.log(chalk.cyan('  # Terminal 3: 运行验证'));
  console.log(chalk.gray('  npm run validate'));
}

/**
 * 显示验证结果
 */
function displayValidationResults(results) {
  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(chalk.green(`✅ 验证完成: ${successful}/${total} 通过`));

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`\n${status} ${result.fileName} -> ${result.componentName}`);
    
    if (result.results) {
      // JSP 页面结果
      if (result.results.jsp) {
        const jspStatus = result.results.jsp.accessible ? '✅' : '❌';
        console.log(chalk.gray(`  📄 JSP 页面: ${jspStatus} ${result.results.jsp.accessible ? '可访问' : '无法访问'}`));
        
        if (result.results.jsp.errors.length > 0) {
          console.log(chalk.red(`    错误: ${result.results.jsp.errors.slice(0, 2).join(', ')}`));
        }
      }

      // React 页面结果
      if (result.results.react) {
        const reactStatus = result.results.react.accessible ? '✅' : '❌';
        console.log(chalk.gray(`  ⚛️  React 页面: ${reactStatus} ${result.results.react.accessible ? '可访问' : '无法访问'}`));
        
        if (result.results.react.reactErrors.length > 0) {
          console.log(chalk.red(`    React 错误: ${result.results.react.reactErrors.slice(0, 2).join(', ')}`));
        }
      }

      // 页面对比结果
      if (result.results.comparison) {
        const similarity = result.results.comparison.structureSimilarity;
        const similarityColor = similarity >= 80 ? chalk.green : similarity >= 60 ? chalk.yellow : chalk.red;
        console.log(chalk.gray(`  🔍 结构相似度: ${similarityColor(similarity.toFixed(1) + '%')}`));
        
        if (result.results.comparison.similarities.length > 0) {
          console.log(chalk.gray(`    相似点: ${result.results.comparison.similarities.slice(0, 2).join(', ')}`));
        }
        
        if (result.results.comparison.differences.length > 0) {
          console.log(chalk.gray(`    差异点: ${result.results.comparison.differences.slice(0, 2).join(', ')}`));
        }
      }
    }

    if (result.error) {
      console.log(chalk.red(`  ❌ 验证错误: ${result.error}`));
    }
  });

  // 显示截图信息
  console.log(chalk.blue('\n📸 验证截图:'));
  console.log(chalk.gray('  截图已保存到: ./examples/screenshots/'));
  console.log(chalk.gray('  包含 JSP 和 React 页面的对比截图'));

  // 显示报告信息
  console.log(chalk.blue('\n📊 验证报告:'));
  console.log(chalk.gray('  详细报告: ./examples/screenshots/validation-report.json'));
  console.log(chalk.gray('  包含完整的验证数据和错误信息'));
}

// 运行示例
if (require.main === module) {
  puppeteerValidationExample().catch(error => {
    console.error(chalk.red('示例运行失败:'), error);
    process.exit(1);
  });
}

module.exports = { puppeteerValidationExample };
