#!/usr/bin/env node

const { TestRunner } = require('./tools/TestRunner');
const chalk = require('chalk');

async function runTests() {
  console.log(chalk.blue('🚀 JSP2React Agent 测试套件'));
  console.log(chalk.gray('=' .repeat(50)));

  const testRunner = new TestRunner({
    targetDir: './fixtures/target',
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    timeout: 60000 // 1分钟超时
  });

  try {
    const success = await testRunner.runAllTests();
    
    if (success) {
      console.log(chalk.green('\n🎉 所有测试通过！'));
      process.exit(0);
    } else {
      console.log(chalk.red('\n❌ 测试失败'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n💥 测试运行出错:'), error.message);
    process.exit(1);
  }
}

// 运行测试
runTests();
