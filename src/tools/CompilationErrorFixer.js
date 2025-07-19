const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { SimpleAIService } = require('../core/SimpleAIService');

/**
 * 编译错误修复器
 * 使用 AI 自动修复 TypeScript/React 编译错误
 */
class CompilationErrorFixer {
  constructor(options = {}) {
    this.options = {
      targetDir: options.targetDir || './fixtures/target',
      verbose: options.verbose || false,
      maxRetries: options.maxRetries || 3,
      ...options
    };

    this.aiService = new SimpleAIService({
      verbose: this.options.verbose,
      temperature: 0.1 // 代码修复需要更低的温度
    });

    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * 运行编译并修复错误
   */
  async runCompilationAndFix() {
    console.log(chalk.blue('🔧 开始编译错误检测和修复...'));

    let attempt = 0;
    let lastErrors = [];

    while (attempt < this.options.maxRetries) {
      attempt++;
      console.log(chalk.gray(`\n🔄 编译尝试 ${attempt}/${this.options.maxRetries}...`));

      // 运行编译
      const compilationResult = await this.runCompilation();

      if (compilationResult.success) {
        console.log(chalk.green('✅ 编译成功！'));
        return {
          success: true,
          fixedFiles: this.fixedFiles,
          attempts: attempt
        };
      }

      // 解析编译错误
      const errors = this.parseCompilationErrors(compilationResult.output);
      
      if (errors.length === 0) {
        console.log(chalk.yellow('⚠️  编译失败但未找到具体错误信息'));
        break;
      }

      // 检查是否有新的错误（避免无限循环）
      if (this.areErrorsSame(errors, lastErrors)) {
        console.log(chalk.yellow('⚠️  错误未改变，停止修复尝试'));
        break;
      }

      lastErrors = [...errors];

      // 修复错误
      console.log(chalk.blue(`🔧 发现 ${errors.length} 个编译错误，开始修复...`));
      
      for (const error of errors) {
        await this.fixCompilationError(error);
      }
    }

    return {
      success: false,
      fixedFiles: this.fixedFiles,
      errors: lastErrors,
      attempts: attempt
    };
  }

  /**
   * 运行编译
   */
  async runCompilation() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      
      const child = spawn('npm', ['run', 'build'], {
        cwd: this.options.targetDir,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout + stderr,
          exitCode: code
        });
      });
    });
  }

  /**
   * 解析编译错误
   */
  parseCompilationErrors(output) {
    const errors = [];
    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 匹配 ESLint/TypeScript 错误格式: ./src/components/Create.tsx
      // 2:18  Error: 'screen' is defined but never used.  @typescript-eslint/no-unused-vars
      const eslintMatch = line.match(/^(.+\.tsx?)$/);

      if (eslintMatch) {
        const filePath = eslintMatch[1];

        // 查找下一行的错误详情
        for (let j = i + 1; j < lines.length && j < i + 10; j++) {
          const errorLine = lines[j];
          const errorMatch = errorLine.match(/^(\d+):(\d+)\s+(Error|Warning):\s+(.+?)\s+(@[\w-]+\/[\w-]+|[\w-]+)$/);

          if (errorMatch) {
            const [, lineNum, colNum, severity, message, rule] = errorMatch;

            errors.push({
              file: filePath,
              line: parseInt(lineNum),
              column: parseInt(colNum),
              message: message.trim(),
              rule: rule,
              severity: severity.toLowerCase(),
              type: 'eslint'
            });
          } else if (errorLine.trim() === '' || errorLine.startsWith('./')) {
            break;
          }
        }
      }

      // 匹配 TypeScript 错误格式: ./src/components/Create.tsx:1:8
      const tsErrorMatch = line.match(/^(.+\.tsx?):(\d+):(\d+)$/);

      if (tsErrorMatch) {
        const [, filePath, lineNum, colNum] = tsErrorMatch;
        const nextLine = lines[i + 1];

        if (nextLine && nextLine.startsWith('Type error:')) {
          const errorMessage = nextLine.replace('Type error: ', '');

          errors.push({
            file: filePath,
            line: parseInt(lineNum),
            column: parseInt(colNum),
            message: errorMessage,
            type: 'typescript'
          });
        }
      }
    }

    return errors;
  }

  /**
   * 修复单个编译错误
   */
  async fixCompilationError(error) {
    console.log(chalk.gray(`  🔧 修复 ${error.file}:${error.line}:${error.column} - ${error.message}`));

    try {
      // 读取文件内容
      const fullPath = path.resolve(this.options.targetDir, error.file);
      const fileContent = await fs.readFile(fullPath, 'utf-8');

      // 使用 AI 修复错误
      const fixedContent = await this.generateFix(error, fileContent);

      if (fixedContent && fixedContent !== fileContent) {
        // 备份原文件
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, fileContent);

        // 写入修复后的内容
        await fs.writeFile(fullPath, fixedContent);

        this.fixedFiles.push({
          file: error.file,
          error: error.message,
          backupPath
        });

        console.log(chalk.green(`    ✅ 已修复 ${error.file}`));
      } else {
        console.log(chalk.yellow(`    ⚠️  无法修复 ${error.file}`));
      }

    } catch (fixError) {
      console.log(chalk.red(`    ❌ 修复失败 ${error.file}: ${fixError.message}`));
      this.errors.push({
        ...error,
        fixError: fixError.message
      });
    }
  }

  /**
   * 使用 AI 生成修复代码
   */
  async generateFix(error, fileContent) {
    if (!this.aiService.isEnabled()) {
      // 如果 AI 不可用，使用规则修复
      return this.applyRuleBasedFix(error, fileContent);
    }

    const prompt = this.buildFixPrompt(error, fileContent);
    
    try {
      const fixedContent = await this.aiService.callAI(prompt, {
        extractCode: false, // 返回完整的文件内容
        context: {
          taskType: 'compilation-fix',
          fileName: error.file
        }
      });

      return fixedContent;

    } catch (aiError) {
      console.log(chalk.yellow(`    ⚠️  AI 修复失败，尝试规则修复: ${aiError.message}`));
      return this.applyRuleBasedFix(error, fileContent);
    }
  }

  /**
   * 构建修复提示词
   */
  buildFixPrompt(error, fileContent) {
    return `你是一个专业的 TypeScript/React 开发专家。请修复以下编译错误：

错误信息：
文件: ${error.file}
位置: 第 ${error.line} 行，第 ${error.column} 列
错误: ${error.message}

错误上下文：
${error.codeContext}

完整文件内容：
\`\`\`typescript
${fileContent}
\`\`\`

请提供修复后的完整文件内容，要求：
1. 修复编译错误
2. 保持代码功能不变
3. 遵循 TypeScript 和 React 最佳实践
4. 确保代码格式正确

修复后的完整文件内容：`;
  }

  /**
   * 基于规则的修复（当 AI 不可用时）
   */
  applyRuleBasedFix(error, fileContent) {
    let fixedContent = fileContent;

    // 修复未使用的变量
    if (error.rule === '@typescript-eslint/no-unused-vars') {
      fixedContent = this.fixUnusedVariables(error, fileContent);
    }

    // 修复 any 类型
    else if (error.rule === '@typescript-eslint/no-explicit-any') {
      fixedContent = this.fixExplicitAny(error, fileContent);
    }

    // 修复未转义的实体
    else if (error.rule === 'react/no-unescaped-entities') {
      fixedContent = this.fixUnescapedEntities(error, fileContent);
    }

    // 修复 Next.js head 元素
    else if (error.rule === '@next/next/no-head-element') {
      fixedContent = this.fixNextHeadElement(error, fileContent);
    }

    // 修复重复的 React import
    else if (error.message.includes("Duplicate identifier 'React'")) {
      fixedContent = this.fixDuplicateReactImport(fileContent);
    }

    // 修复重复的 export default
    else if (error.message.includes("Duplicate identifier") && error.message.includes("export")) {
      fixedContent = this.fixDuplicateExport(fileContent);
    }

    return fixedContent;
  }

  /**
   * 修复未使用的变量
   */
  fixUnusedVariables(error, fileContent) {
    const lines = fileContent.split('\n');
    const targetLine = lines[error.line - 1];

    if (targetLine && targetLine.includes('screen')) {
      // 移除未使用的 screen import
      const newLine = targetLine.replace(/,\s*screen/, '').replace(/screen\s*,\s*/, '');
      lines[error.line - 1] = newLine;
    }

    if (targetLine && targetLine.includes('useState')) {
      // 移除未使用的 useState import
      const newLine = targetLine.replace(/,\s*useState/, '').replace(/useState\s*,\s*/, '');
      lines[error.line - 1] = newLine;
    }

    return lines.join('\n');
  }

  /**
   * 修复 any 类型
   */
  fixExplicitAny(error, fileContent) {
    const lines = fileContent.split('\n');
    const targetLine = lines[error.line - 1];

    if (targetLine && targetLine.includes('any')) {
      // 将 any 替换为更具体的类型
      let newLine = targetLine.replace(/:\s*any/g, ': unknown');
      lines[error.line - 1] = newLine;
    }

    return lines.join('\n');
  }

  /**
   * 修复未转义的实体
   */
  fixUnescapedEntities(error, fileContent) {
    const lines = fileContent.split('\n');
    const targetLine = lines[error.line - 1];

    if (targetLine) {
      // 转义引号
      const newLine = targetLine.replace(/"/g, '&quot;');
      lines[error.line - 1] = newLine;
    }

    return lines.join('\n');
  }

  /**
   * 修复 Next.js head 元素
   */
  fixNextHeadElement(error, fileContent) {
    let fixedContent = fileContent;

    // 添加 Head import
    if (!fixedContent.includes('import Head from \'next/head\'')) {
      const lines = fixedContent.split('\n');
      const importIndex = lines.findIndex(line => line.startsWith('import React'));
      if (importIndex !== -1) {
        lines.splice(importIndex + 1, 0, 'import Head from \'next/head\';');
        fixedContent = lines.join('\n');
      }
    }

    // 替换 <head> 为 <Head>
    fixedContent = fixedContent.replace(/<head>/g, '<Head>');
    fixedContent = fixedContent.replace(/<\/head>/g, '</Head>');

    return fixedContent;
  }

  /**
   * 修复重复的 React import
   */
  fixDuplicateReactImport(fileContent) {
    const lines = fileContent.split('\n');
    const reactImports = [];
    const otherLines = [];

    for (const line of lines) {
      if (line.trim().startsWith('import React')) {
        reactImports.push(line);
      } else {
        otherLines.push(line);
      }
    }

    if (reactImports.length > 1) {
      // 合并 React imports
      const mergedImport = this.mergeReactImports(reactImports);
      return [mergedImport, '', ...otherLines].join('\n');
    }

    return fileContent;
  }

  /**
   * 修复重复的 export default
   */
  fixDuplicateExport(fileContent) {
    const lines = fileContent.split('\n');
    const exportLines = [];
    const otherLines = [];

    for (const line of lines) {
      if (line.trim().startsWith('export default')) {
        exportLines.push(line);
      } else {
        otherLines.push(line);
      }
    }

    if (exportLines.length > 1) {
      // 只保留最后一个 export default
      return [...otherLines, exportLines[exportLines.length - 1]].join('\n');
    }

    return fileContent;
  }

  /**
   * 合并 React imports
   */
  mergeReactImports(imports) {
    const defaultImport = 'React';
    const namedImports = new Set();

    for (const importLine of imports) {
      // 解析 named imports
      const namedMatch = importLine.match(/import\s+React,\s*\{\s*([^}]+)\s*\}/);
      if (namedMatch) {
        const names = namedMatch[1].split(',').map(name => name.trim());
        names.forEach(name => namedImports.add(name));
      }
    }

    if (namedImports.size > 0) {
      return `import React, { ${Array.from(namedImports).join(', ')} } from 'react';`;
    } else {
      return `import React from 'react';`;
    }
  }

  /**
   * 检查错误是否相同
   */
  areErrorsSame(errors1, errors2) {
    if (errors1.length !== errors2.length) return false;

    for (let i = 0; i < errors1.length; i++) {
      const e1 = errors1[i];
      const e2 = errors2[i];
      
      if (e1.file !== e2.file || e1.line !== e2.line || e1.message !== e2.message) {
        return false;
      }
    }

    return true;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      fixedFiles: this.fixedFiles,
      errors: this.errors,
      summary: {
        totalFixed: this.fixedFiles.length,
        totalErrors: this.errors.length
      }
    };
  }
}

module.exports = { CompilationErrorFixer };
