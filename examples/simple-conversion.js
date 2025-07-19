#!/usr/bin/env node

/**
 * 简单转换示例
 * 演示如何使用 JSP2React Agent 进行基本的代码转换
 */

const { JSPToReactAgent } = require('../src/core/JSPToReactAgent');
const { SimpleAIService } = require('../src/core/SimpleAIService');
const chalk = require('chalk');

async function simpleConversionExample() {
  console.log(chalk.blue('📚 JSP2React 简单转换示例'));
  console.log(chalk.gray('=' .repeat(50)));

  // 1. 检查 AI 服务
  console.log(chalk.blue('\n步骤 1: 检查 AI 服务'));
  const aiService = new SimpleAIService({ verbose: true });
  
  if (!aiService.isEnabled()) {
    console.log(chalk.yellow('⚠️  AI 服务未配置，将使用模拟转换'));
    await simulateConversion();
    return;
  }

  // 2. 创建 Agent
  console.log(chalk.blue('\n步骤 2: 创建转换 Agent'));
  const agent = new JSPToReactAgent({
    sourceDir: './fixtures/source',
    targetDir: './fixtures/target',
    verbose: true
  });

  try {
    // 3. 执行转换
    console.log(chalk.blue('\n步骤 3: 执行转换'));
    const results = await agent.convertJSPProject();

    // 4. 显示结果
    console.log(chalk.blue('\n步骤 4: 转换结果'));
    displayResults(results);

    // 5. 提供下一步指导
    console.log(chalk.blue('\n步骤 5: 下一步操作'));
    showNextSteps();

  } catch (error) {
    console.error(chalk.red('转换失败:'), error.message);
  }
}

/**
 * 模拟转换（当 AI 服务不可用时）
 */
async function simulateConversion() {
  console.log(chalk.yellow('🎭 模拟转换模式'));
  
  const mockResults = [
    {
      file: { name: 'posts.jsp', relativePath: 'posts.jsp' },
      componentName: 'Posts',
      reactCode: `import React from 'react';

interface Post {
  postId: number;
  title: string;
  postedText: string;
  postedDate: string;
}

interface PostsProps {
  posts: Post[];
  formatter: any;
}

const Posts: React.FC<PostsProps> = ({ posts = [], formatter }) => {
  return (
    <html>
      <head>
        <title>First blog :)</title>
        <link rel="stylesheet" href="/css/styles.css" />
      </head>
      <body>
        <div className="max_width_400">
          {posts.map((post) => (
            <div key={post.postId}>
              <h3>{post.title}</h3>
              <p>{formatter?.format(post.postedDate)}</p>
              <p>{post.postedText}</p>
              <a href={\`posts/\${post.postId}\`}>Continue</a>
              <br />
            </div>
          ))}
        </div>
        <br />
        <form action="/posts" method="get">
          <input type="submit" name="create" value="Create new post" />
        </form>
      </body>
    </html>
  );
};

export default Posts;`,
      success: true
    },
    {
      file: { name: 'post.jsp', relativePath: 'post.jsp' },
      componentName: 'Post',
      reactCode: `// Mock React component for Post`,
      success: true
    },
    {
      file: { name: 'create.jsp', relativePath: 'create.jsp' },
      componentName: 'Create',
      reactCode: `// Mock React component for Create`,
      success: true
    }
  ];

  displayResults(mockResults);
  showNextSteps();
}

/**
 * 显示转换结果
 */
function displayResults(results) {
  const successCount = results.filter(r => r.success || r.reactCode).length;
  const totalCount = results.length;

  console.log(chalk.green(`✅ 转换完成: ${successCount}/${totalCount} 个文件`));
  
  results.forEach(result => {
    const status = (result.success || result.reactCode) ? '✅' : '❌';
    const fileName = result.file?.name || 'Unknown';
    const componentName = result.componentName || 'Failed';
    
    console.log(chalk.gray(`  ${status} ${fileName} → ${componentName}`));
    
    if (result.error) {
      console.log(chalk.red(`    错误: ${result.error}`));
    }
  });

  // 显示生成的文件结构
  console.log(chalk.blue('\n📁 生成的文件结构:'));
  console.log(chalk.gray('fixtures/target/'));
  console.log(chalk.gray('├── src/'));
  console.log(chalk.gray('│   ├── components/'));
  results.forEach(result => {
    if (result.success || result.reactCode) {
      console.log(chalk.gray(`│   │   ├── ${result.componentName}.tsx`));
    }
  });
  console.log(chalk.gray('│   ├── embedded/'));
  results.forEach(result => {
    if (result.success || result.reactCode) {
      console.log(chalk.gray(`│   │   ├── ${result.componentName}Embedded.tsx`));
    }
  });
  console.log(chalk.gray('│   └── __tests__/'));
  results.forEach(result => {
    if (result.success || result.reactCode) {
      console.log(chalk.gray(`│       ├── ${result.componentName}.test.tsx`));
    }
  });
  console.log(chalk.gray('└── embedded/'));
  console.log(chalk.gray('    ├── jsp/'));
  console.log(chalk.gray('    ├── react-embed.js'));
  console.log(chalk.gray('    └── USAGE.md'));
}

/**
 * 显示下一步操作
 */
function showNextSteps() {
  console.log(chalk.blue('🚀 下一步操作:'));
  
  console.log(chalk.cyan('\n1. 查看生成的 React 组件:'));
  console.log(chalk.gray('   ls fixtures/target/src/components/'));
  
  console.log(chalk.cyan('\n2. 启动 React 开发服务器:'));
  console.log(chalk.gray('   cd fixtures/target'));
  console.log(chalk.gray('   npm install'));
  console.log(chalk.gray('   npm run dev'));
  
  console.log(chalk.cyan('\n3. 查看渐进式嵌入页面:'));
  console.log(chalk.gray('   ls embedded/jsp/'));
  console.log(chalk.gray('   cat embedded/USAGE.md'));
  
  console.log(chalk.cyan('\n4. 启动 Web 界面 (可选):'));
  console.log(chalk.gray('   npm run web'));
  console.log(chalk.gray('   打开 http://localhost:3001'));
  
  console.log(chalk.cyan('\n5. 运行测试:'));
  console.log(chalk.gray('   npm test'));
  
  console.log(chalk.blue('\n💡 提示:'));
  console.log(chalk.gray('- 转换后的组件可以直接在 Next.js 中使用'));
  console.log(chalk.gray('- 嵌入式版本可以在现有 JSP 页面中使用'));
  console.log(chalk.gray('- 查看 README-AGENT.md 了解更多详细信息'));
}

// 运行示例
if (require.main === module) {
  simpleConversionExample().catch(error => {
    console.error(chalk.red('示例运行失败:'), error);
    process.exit(1);
  });
}

module.exports = { simpleConversionExample };
