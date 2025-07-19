#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const { JSPToReactAgent } = require('./core/JSPToReactAgent');

const program = new Command();

program
  .name('jsp2react')
  .description('JSP 转 React 的 AI Agent CLI 工具')
  .version('1.0.0');

program
  .command('convert')
  .description('转换 JSP 项目为 React')
  .option('-s, --source <path>', '源 JSP 项目路径', './fixtures/source')
  .option('-t, --target <path>', '目标 React 项目路径', './fixtures/target')
  .option('-v, --verbose', '显示详细输出', false)
  .option('--dry-run', '试运行，不实际写入文件', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 JSP 转 React AI Agent 启动...'));
      
      // 检查源目录
      if (!await fs.pathExists(options.source)) {
        console.error(chalk.red(`❌ 源目录不存在: ${options.source}`));
        process.exit(1);
      }

      // 确保目标目录存在
      await fs.ensureDir(options.target);

      const agent = new JSPToReactAgent({
        sourceDir: path.resolve(options.source),
        targetDir: path.resolve(options.target),
        verbose: options.verbose,
        dryRun: options.dryRun
      });

      const results = await agent.convertJSPProject();
      
      console.log(chalk.green('\n✅ 转换完成！'));
      
      if (!options.dryRun) {
        console.log(chalk.blue('\n📋 下一步操作:'));
        console.log('1. 进入目标目录:', chalk.cyan(`cd ${options.target}`));
        console.log('2. 安装依赖:', chalk.cyan('npm install'));
        console.log('3. 启动开发服务器:', chalk.cyan('npm run dev'));
        console.log('4. 查看转换结果:', chalk.cyan('http://localhost:3000'));
      }

    } catch (error) {
      console.error(chalk.red('❌ 转换失败:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('分析 JSP 项目结构')
  .option('-s, --source <path>', '源 JSP 项目路径', './fixtures/source')
  .option('-v, --verbose', '显示详细输出', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 分析 JSP 项目结构...'));
      
      const agent = new JSPToReactAgent({
        sourceDir: path.resolve(options.source),
        verbose: options.verbose,
        dryRun: true // 分析模式不写入文件
      });

      // 只执行分析步骤
      const jspFiles = await agent.discoverJSPFiles();
      console.log(chalk.green(`📁 发现 ${jspFiles.length} 个 JSP 文件:`));
      
      jspFiles.forEach(file => {
        console.log(`  - ${file.relativePath}`);
      });

      const analysisResults = await agent.analyzeJSPFiles(jspFiles);
      
      console.log(chalk.blue('\n📊 分析结果:'));
      analysisResults.forEach(result => {
        console.log(chalk.yellow(`\n📄 ${result.file.name}:`));
        if (result.analysis) {
          console.log(`  标题: ${result.analysis.title}`);
          console.log(`  JSTL 标签: ${result.analysis.jstlTags.join(', ') || '无'}`);
          console.log(`  变量: ${result.analysis.variables.join(', ') || '无'}`);
          console.log(`  建议组件: ${result.analysis.suggestedComponents.join(', ')}`);
        }
        if (result.error) {
          console.log(chalk.red(`  错误: ${result.error}`));
        }
      });

    } catch (error) {
      console.error(chalk.red('❌ 分析失败:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('设置开发环境')
  .option('-t, --target <path>', '目标 React 项目路径', './fixtures/target')
  .action(async (options) => {
    try {
      console.log(chalk.blue('⚙️  设置开发环境...'));
      
      const targetDir = path.resolve(options.target);
      
      // 检查是否已经是 Next.js 项目
      const packageJsonPath = path.join(targetDir, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        console.error(chalk.red(`❌ 目标目录不是有效的 Next.js 项目: ${targetDir}`));
        console.log(chalk.yellow('请先运行: npx create-next-app@latest'));
        process.exit(1);
      }

      // 添加必要的依赖
      const packageJson = await fs.readJson(packageJsonPath);
      const devDependencies = {
        '@testing-library/react': '^13.4.0',
        '@testing-library/jest-dom': '^5.16.5',
        '@testing-library/user-event': '^14.4.3',
        'jest': '^29.5.0',
        'jest-environment-jsdom': '^29.5.0'
      };

      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        ...devDependencies
      };

      // 添加测试脚本
      packageJson.scripts = {
        ...packageJson.scripts,
        'test': 'jest',
        'test:watch': 'jest --watch'
      };

      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

      // 创建 Jest 配置
      const jestConfig = {
        testEnvironment: 'jsdom',
        setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
        moduleNameMapping: {
          '^@/(.*)$': '<rootDir>/src/$1'
        }
      };

      await fs.writeJson(path.join(targetDir, 'jest.config.json'), jestConfig, { spaces: 2 });

      // 创建 Jest setup 文件
      const jestSetup = `import '@testing-library/jest-dom';`;
      await fs.writeFile(path.join(targetDir, 'jest.setup.js'), jestSetup);

      console.log(chalk.green('✅ 开发环境设置完成！'));
      console.log(chalk.blue('\n📋 下一步操作:'));
      console.log('1. 安装新依赖:', chalk.cyan('npm install'));
      console.log('2. 运行转换:', chalk.cyan('npm run jsp2react convert'));

    } catch (error) {
      console.error(chalk.red('❌ 设置失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('运行演示转换')
  .option('-v, --verbose', '显示详细输出', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🎯 运行演示转换...'));

      // 使用内置的示例项目
      const sourceDir = path.resolve('./fixtures/source');
      const targetDir = path.resolve('./fixtures/target');

      if (!await fs.pathExists(sourceDir)) {
        console.error(chalk.red('❌ 演示项目不存在，请确保在项目根目录运行'));
        process.exit(1);
      }

      const agent = new JSPToReactAgent({
        sourceDir,
        targetDir,
        verbose: options.verbose,
        dryRun: false
      });

      await agent.convertJSPProject();

      console.log(chalk.green('\n🎉 演示转换完成！'));
      console.log(chalk.blue('\n📋 查看结果:'));
      console.log('1. 进入目标目录:', chalk.cyan(`cd ${targetDir}`));
      console.log('2. 启动开发服务器:', chalk.cyan('npm run dev'));
      console.log('3. 打开浏览器:', chalk.cyan('http://localhost:3000'));

    } catch (error) {
      console.error(chalk.red('❌ 演示失败:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('使用 Puppeteer 验证转换结果')
  .option('-s, --source <path>', '源 JSP 项目路径', './fixtures/source')
  .option('-t, --target <path>', '目标 React 项目路径', './fixtures/target')
  .option('--jsp-url <url>', 'JSP 服务器地址', 'http://localhost:8080')
  .option('--react-url <url>', 'React 服务器地址', 'http://localhost:3000')
  .option('--headless', '无头模式运行浏览器', true)
  .option('--no-headless', '显示浏览器界面')
  .option('-v, --verbose', '显示详细输出', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🎭 开始 Puppeteer 验证...'));

      const { PuppeteerValidator } = require('./tools/PuppeteerValidator');

      // 检查转换结果文件
      const resultsPath = path.join(path.resolve(options.target), 'conversion-results.json');

      if (!await fs.pathExists(resultsPath)) {
        console.error(chalk.red('❌ 未找到转换结果文件，请先运行转换'));
        console.log(chalk.yellow('提示: 运行 npm run convert 或 npm run demo'));
        process.exit(1);
      }

      const conversionResults = await fs.readJson(resultsPath);

      if (conversionResults.length === 0) {
        console.error(chalk.red('❌ 没有转换结果可以验证'));
        process.exit(1);
      }

      const validator = new PuppeteerValidator({
        jspBaseUrl: options.jspUrl,
        reactBaseUrl: options.reactUrl,
        headless: options.headless,
        screenshotDir: path.join(path.resolve(options.target), 'screenshots'),
        verbose: options.verbose
      });

      const validationResults = await validator.validateConversion(conversionResults);
      await validator.close();

      // 显示结果摘要
      const successful = validationResults.filter(r => r.success).length;
      const total = validationResults.length;

      console.log(chalk.blue('\n📊 验证结果摘要:'));
      console.log(`总计: ${total}`);
      console.log(chalk.green(`成功: ${successful}`));
      console.log(chalk.red(`失败: ${total - successful}`));

      if (successful === total) {
        console.log(chalk.green('\n🎉 所有验证通过！'));
      } else {
        console.log(chalk.yellow('\n⚠️  部分验证失败，请查看详细报告'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ 验证失败:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('修复编译错误')
  .option('-t, --target <path>', '目标 React 项目路径', './fixtures/target')
  .option('-v, --verbose', '显示详细输出', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔧 开始修复编译错误...'));

      const { CompilationErrorFixer } = require('./tools/CompilationErrorFixer');

      const fixer = new CompilationErrorFixer({
        targetDir: path.resolve(options.target),
        verbose: options.verbose
      });

      const result = await fixer.runCompilationAndFix();

      console.log(chalk.blue('\n📊 修复结果:'));
      console.log(`成功: ${result.success}`);
      console.log(`修复文件数: ${result.fixedFiles.length}`);
      console.log(`尝试次数: ${result.attempts}`);

      if (result.fixedFiles.length > 0) {
        console.log(chalk.green('\n✅ 修复的文件:'));
        result.fixedFiles.forEach(file => {
          console.log(`  - ${file.file}: ${file.error}`);
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.red('\n❌ 未修复的错误:'));
        result.errors.forEach(error => {
          console.log(`  - ${error.file}:${error.line} - ${error.message}`);
        });
      }

      if (result.success) {
        console.log(chalk.green('\n🎉 所有编译错误已修复！'));
      } else {
        console.log(chalk.yellow('\n⚠️  部分错误未能修复'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ 修复失败:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('未处理的 Promise 拒绝:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('未捕获的异常:'), error);
  process.exit(1);
});

program.parse();
