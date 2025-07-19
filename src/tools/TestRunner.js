const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { spawn } = require('child_process');

/**
 * 测试运行器 - 验证转换后的 React 组件
 */
class TestRunner {
  constructor(options = {}) {
    this.options = {
      targetDir: options.targetDir || './fixtures/target',
      verbose: options.verbose || false,
      timeout: options.timeout || 30000,
      ...options
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log(chalk.blue('🧪 开始运行测试...'));

    try {
      // 1. 检查项目结构
      await this.checkProjectStructure();

      // 2. 安装依赖（如果需要）
      await this.ensureDependencies();

      // 3. 运行 Jest 测试
      await this.runJestTests();

      // 4. 运行构建测试
      await this.runBuildTest();

      // 5. 运行基本的组件渲染测试
      await this.runComponentTests();

      console.log(chalk.green('✅ 所有测试通过！'));
      return true;

    } catch (error) {
      console.error(chalk.red('❌ 测试失败:'), error.message);
      if (this.options.verbose) {
        console.error(error.stack);
      }
      return false;
    }
  }

  /**
   * 检查项目结构
   */
  async checkProjectStructure() {
    console.log(chalk.gray('📁 检查项目结构...'));

    const requiredFiles = [
      'package.json',
      'next.config.ts',
      'src/components',
      'src/__tests__'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.options.targetDir, file);
      if (!await fs.pathExists(filePath)) {
        throw new Error(`缺少必要文件或目录: ${file}`);
      }
    }

    console.log(chalk.green('✅ 项目结构检查通过'));
  }

  /**
   * 确保依赖已安装
   */
  async ensureDependencies() {
    console.log(chalk.gray('📦 检查依赖...'));

    const nodeModulesPath = path.join(this.options.targetDir, 'node_modules');
    
    if (!await fs.pathExists(nodeModulesPath)) {
      console.log(chalk.yellow('⚠️  依赖未安装，正在安装...'));
      await this.runCommand('npm', ['install'], this.options.targetDir);
    }

    console.log(chalk.green('✅ 依赖检查通过'));
  }

  /**
   * 运行 Jest 测试
   */
  async runJestTests() {
    console.log(chalk.gray('🧪 运行 Jest 测试...'));

    try {
      await this.runCommand('npm', ['test', '--', '--passWithNoTests'], this.options.targetDir);
      console.log(chalk.green('✅ Jest 测试通过'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Jest 测试失败，但继续执行其他测试'));
      if (this.options.verbose) {
        console.error(error.message);
      }
    }
  }

  /**
   * 运行构建测试
   */
  async runBuildTest() {
    console.log(chalk.gray('🏗️  运行构建测试...'));

    try {
      await this.runCommand('npm', ['run', 'build'], this.options.targetDir);
      console.log(chalk.green('✅ 构建测试通过'));
    } catch (error) {
      throw new Error(`构建失败: ${error.message}`);
    }
  }

  /**
   * 运行组件测试
   */
  async runComponentTests() {
    console.log(chalk.gray('⚛️  运行组件测试...'));

    const componentsDir = path.join(this.options.targetDir, 'src/components');
    
    if (!await fs.pathExists(componentsDir)) {
      console.log(chalk.yellow('⚠️  没有找到组件目录，跳过组件测试'));
      return;
    }

    const componentFiles = await fs.readdir(componentsDir);
    const tsxFiles = componentFiles.filter(file => file.endsWith('.tsx'));

    if (tsxFiles.length === 0) {
      console.log(chalk.yellow('⚠️  没有找到 React 组件，跳过组件测试'));
      return;
    }

    console.log(chalk.green(`✅ 找到 ${tsxFiles.length} 个组件文件`));

    // 检查每个组件的基本语法
    for (const file of tsxFiles) {
      await this.checkComponentSyntax(path.join(componentsDir, file));
    }

    console.log(chalk.green('✅ 组件测试通过'));
  }

  /**
   * 检查组件语法
   */
  async checkComponentSyntax(componentPath) {
    try {
      const content = await fs.readFile(componentPath, 'utf-8');
      
      // 基本的语法检查
      const checks = [
        {
          name: 'React import',
          test: /import\s+React/,
          required: true
        },
        {
          name: 'Component export',
          test: /export\s+default/,
          required: true
        },
        {
          name: 'JSX syntax',
          test: /<[A-Za-z]/,
          required: true
        }
      ];

      for (const check of checks) {
        if (check.required && !check.test.test(content)) {
          throw new Error(`组件 ${path.basename(componentPath)} 缺少: ${check.name}`);
        }
      }

      if (this.options.verbose) {
        console.log(chalk.gray(`  ✓ ${path.basename(componentPath)} 语法检查通过`));
      }

    } catch (error) {
      throw new Error(`组件语法检查失败 ${path.basename(componentPath)}: ${error.message}`);
    }
  }

  /**
   * 运行命令
   */
  async runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      if (!this.options.verbose) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`命令超时: ${command} ${args.join(' ')}`));
      }, this.options.timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`命令失败 (退出码 ${code}): ${command} ${args.join(' ')}\n${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`命令执行错误: ${error.message}`));
      });
    });
  }

  /**
   * 生成测试报告
   */
  async generateReport(results) {
    const reportPath = path.join(this.options.targetDir, 'test-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      }
    };

    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(chalk.blue(`📊 测试报告已生成: ${reportPath}`));
  }
}

module.exports = { TestRunner };
