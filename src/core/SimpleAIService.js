const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

/**
 * 简化的 AI 服务 - 专注于 JSP 转 React 的核心功能
 * 移除了复杂的日志系统，保留核心 AI 调用能力
 */
class SimpleAIService {
  constructor(options = {}) {
    this.options = {
      maxTokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.1, // 降低温度以获得更一致的代码生成
      maxRetries: options.maxRetries || 3,
      verbose: options.verbose || false,
      ...options
    };

    this.llmConfig = this.configureLLMProvider();
    this.enabled = !!this.llmConfig;
    
    if (this.enabled && this.options.verbose) {
      console.log(chalk.green(`✅ AI 服务已启用 (${this.llmConfig.providerName})`));
    }
  }

  /**
   * 配置 LLM 提供商 - 简化版本
   */
  configureLLMProvider() {
    // 支持多种 AI 提供商
    const providers = [
      {
        name: 'DeepSeek',
        check: () => process.env.DEEPSEEK_TOKEN,
        config: () => ({
          providerName: 'DeepSeek',
          apiKey: process.env.DEEPSEEK_TOKEN,
          baseURL: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat'
        })
      },
      {
        name: 'GLM',
        check: () => process.env.GLM_API_KEY || process.env.GLM_TOKEN,
        config: () => ({
          providerName: 'GLM',
          apiKey: process.env.GLM_API_KEY || process.env.GLM_TOKEN,
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          model: 'glm-4-air'
        })
      },
      {
        name: 'OpenAI',
        check: () => process.env.OPENAI_API_KEY,
        config: () => ({
          providerName: 'OpenAI',
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: 'https://api.openai.com/v1',
          model: 'gpt-4'
        })
      }
    ];

    for (const provider of providers) {
      if (provider.check()) {
        return provider.config();
      }
    }

    return null;
  }

  /**
   * 检查 AI 服务是否可用
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * 简化的 AI 调用方法
   */
  async callAI(prompt, options = {}) {
    if (!this.enabled) {
      throw new Error('AI 服务未启用或配置不正确');
    }

    const callOptions = {
      maxRetries: this.options.maxRetries,
      extractCode: options.extractCode !== false, // 默认提取代码块
      ...options
    };

    let lastError = null;

    for (let attempt = 1; attempt <= callOptions.maxRetries; attempt++) {
      try {
        if (this.options.verbose) {
          console.log(chalk.gray(`🤖 调用 ${this.llmConfig.providerName} API (尝试 ${attempt}/${callOptions.maxRetries})...`));
        }

        const response = await this.makeAPICall(prompt);
        
        // 处理响应
        let result = response.trim();
        if (callOptions.extractCode) {
          const codeMatch = result.match(/```[\w]*\n([\s\S]*?)\n```/);
          if (codeMatch) {
            result = codeMatch[1];
          }
        }

        if (this.options.verbose) {
          console.log(chalk.green(`✅ AI 响应成功`));
        }

        return result;

      } catch (error) {
        lastError = error;
        if (this.options.verbose) {
          console.log(chalk.yellow(`⚠️  AI 调用失败 (尝试 ${attempt}/${callOptions.maxRetries}): ${error.message}`));
        }

        if (attempt < callOptions.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`AI 调用失败，已重试 ${callOptions.maxRetries} 次: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 实际的 API 调用 - 使用 fetch 替代复杂的 SDK
   */
  async makeAPICall(prompt) {
    const response = await fetch(`${this.llmConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmConfig.apiKey}`
      },
      body: JSON.stringify({
        model: this.llmConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.options.maxTokens,
        temperature: this.options.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`API 调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * JSP 转 React 专用方法
   */
  async convertJSPToReact(jspContent, options = {}) {
    const prompt = this.buildJSPConversionPrompt(jspContent, options);
    return await this.callAI(prompt, { extractCode: true });
  }

  /**
   * 构建 JSP 转换提示词
   */
  buildJSPConversionPrompt(jspContent, options = {}) {
    const { componentName = 'GeneratedComponent', includeStyles = true } = options;
    
    return `你是一个专业的前端开发专家，请将以下 JSP 代码转换为 React 组件。

要求：
1. 保持原有的 HTML 结构和样式
2. 将 JSTL 标签转换为对应的 JSX 语法
3. 将 EL 表达式转换为 React 的 props 或 state
4. 使用现代 React 函数组件和 Hooks
5. 确保代码可以直接运行
6. 组件名称：${componentName}

JSP 代码：
\`\`\`jsp
${jspContent}
\`\`\`

请生成完整的 React 组件代码：`;
  }

  /**
   * 分析 JSP 文件结构
   */
  async analyzeJSP(jspContent) {
    const prompt = `请分析以下 JSP 文件，提取关键信息：

JSP 代码：
\`\`\`jsp
${jspContent}
\`\`\`

请以 JSON 格式返回分析结果，包含：
1. 页面标题
2. 使用的 JSTL 标签
3. EL 表达式中的变量
4. 表单和链接
5. 静态资源引用
6. 建议的组件拆分

返回格式：
\`\`\`json
{
  "title": "页面标题",
  "jstlTags": ["c:forEach", "c:if"],
  "variables": ["posts", "post", "formatter"],
  "forms": [{"action": "/posts", "method": "post"}],
  "links": [{"href": "/css/styles.css", "type": "stylesheet"}],
  "suggestedComponents": ["PostList", "PostItem", "CreatePostForm"]
}
\`\`\``;

    return await this.callAI(prompt, { extractCode: true });
  }
}

module.exports = { SimpleAIService };
