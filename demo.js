#!/usr/bin/env node

const chalk = require('chalk');
const { JSPToReactAgent } = require('./src/core/JSPToReactAgent');
const { TestRunner } = require('./src/tools/TestRunner');
const path = require('path');

/**
 * 演示脚本 - 展示 JSP2React Agent 的完整工作流程
 */
async function runDemo() {
  console.log(chalk.blue('🎯 JSP2React AI Agent 演示'));
  console.log(chalk.gray('=' .repeat(60)));
  
  try {
    // 检查环境
    console.log(chalk.blue('\n📋 步骤 1: 环境检查'));
    await checkEnvironment();

    // 分析 JSP 项目
    console.log(chalk.blue('\n📋 步骤 2: 分析 JSP 项目'));
    await analyzeProject();

    // 执行转换
    console.log(chalk.blue('\n📋 步骤 3: 执行转换'));
    await convertProject();

    // 运行测试
    console.log(chalk.blue('\n📋 步骤 4: 验证结果'));
    await validateResults();

    // 展示结果
    console.log(chalk.blue('\n📋 步骤 5: 展示结果'));
    showResults();

    console.log(chalk.green('\n🎉 演示完成！'));

  } catch (error) {
    console.error(chalk.red('\n❌ 演示失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 检查环境
 */
async function checkEnvironment() {
  console.log(chalk.gray('🔍 检查 AI 服务配置...'));
  
  const { SimpleAIService } = require('./src/core/SimpleAIService');
  const aiService = new SimpleAIService();
  
  if (!aiService.isEnabled()) {
    console.log(chalk.yellow('⚠️  AI 服务未配置，将使用模拟模式'));
    console.log(chalk.gray('提示: 设置环境变量 DEEPSEEK_TOKEN, GLM_API_KEY 或 OPENAI_API_KEY'));
  } else {
    console.log(chalk.green('✅ AI 服务配置正常'));
  }
}

/**
 * 分析项目
 */
async function analyzeProject() {
  console.log(chalk.gray('🔍 分析示例 JSP 项目...'));
  
  const agent = new JSPToReactAgent({
    sourceDir: './fixtures/source',
    targetDir: './fixtures/target',
    verbose: false,
    dryRun: true
  });

  // 发现 JSP 文件
  const jspFiles = await agent.discoverJSPFiles();
  console.log(chalk.green(`📁 发现 ${jspFiles.length} 个 JSP 文件:`));
  
  jspFiles.forEach(file => {
    console.log(chalk.gray(`  - ${file.relativePath}`));
  });

  // 分析文件（如果 AI 可用）
  if (new (require('./src/core/SimpleAIService'))().isEnabled()) {
    const analysisResults = await agent.analyzeJSPFiles(jspFiles.slice(0, 1)); // 只分析第一个文件作为演示
    
    if (analysisResults.length > 0 && analysisResults[0].analysis) {
      const analysis = analysisResults[0].analysis;
      console.log(chalk.blue('\n📊 分析结果示例:'));
      console.log(chalk.gray(`  文件: ${analysisResults[0].file.name}`));
      console.log(chalk.gray(`  标题: ${analysis.title || '未知'}`));
      console.log(chalk.gray(`  JSTL 标签: ${analysis.jstlTags?.join(', ') || '无'}`));
      console.log(chalk.gray(`  变量: ${analysis.variables?.join(', ') || '无'}`));
    }
  }
}

/**
 * 转换项目
 */
async function convertProject() {
  console.log(chalk.gray('⚛️  执行 JSP 到 React 转换...'));
  
  const agent = new JSPToReactAgent({
    sourceDir: './fixtures/source',
    targetDir: './fixtures/target',
    verbose: false,
    dryRun: false
  });

  const results = await agent.convertJSPProject();
  
  console.log(chalk.green(`✅ 转换完成，生成了 ${results.length} 个组件`));
  
  results.forEach(result => {
    const status = result.reactCode ? '✅' : '❌';
    console.log(chalk.gray(`  ${status} ${result.file?.name} -> ${result.componentName || 'Failed'}`));
  });
}

/**
 * 验证结果
 */
async function validateResults() {
  console.log(chalk.gray('🧪 验证转换结果...'));
  
  const testRunner = new TestRunner({
    targetDir: './fixtures/target',
    verbose: false,
    timeout: 30000
  });

  try {
    await testRunner.checkProjectStructure();
    console.log(chalk.green('✅ 项目结构验证通过'));
  } catch (error) {
    console.log(chalk.yellow(`⚠️  项目结构验证失败: ${error.message}`));
  }

  // 检查生成的文件
  const fs = require('fs-extra');
  const componentsDir = path.join('./fixtures/target', 'src/components');
  
  if (await fs.pathExists(componentsDir)) {
    const files = await fs.readdir(componentsDir);
    const tsxFiles = files.filter(f => f.endsWith('.tsx'));
    console.log(chalk.green(`✅ 生成了 ${tsxFiles.length} 个 React 组件`));
  }
}

/**
 * 展示结果
 */
function showResults() {
  console.log(chalk.blue('📋 转换结果:'));
  console.log(chalk.gray('  源项目: ./fixtures/source (JSP 博客应用)'));
  console.log(chalk.gray('  目标项目: ./fixtures/target (Next.js React 应用)'));
  
  console.log(chalk.blue('\n🚀 下一步操作:'));
  console.log(chalk.cyan('  1. 进入目标目录: cd fixtures/target'));
  console.log(chalk.cyan('  2. 安装依赖: npm install'));
  console.log(chalk.cyan('  3. 启动开发服务器: npm run dev'));
  console.log(chalk.cyan('  4. 打开浏览器: http://localhost:3000'));
  
  console.log(chalk.blue('\n📚 更多命令:'));
  console.log(chalk.cyan('  npm run analyze    # 分析 JSP 项目'));
  console.log(chalk.cyan('  npm run convert    # 执行转换'));
  console.log(chalk.cyan('  npm test           # 运行测试'));
  console.log(chalk.cyan('  npm run setup      # 设置开发环境'));
}

// 运行演示
if (require.main === module) {
  runDemo().catch(error => {
    console.error(chalk.red('演示失败:'), error);
    process.exit(1);
  });
}

module.exports = { runDemo };
