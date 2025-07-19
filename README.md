# **JSP 转 React 的 AI Agent CLI 工具 - 增强版项目计划**


第一轮提示词：

```
我在设计一个渐进式的 JSP 转 React 的工具，第一步想借助 AI 把 JSP 翻译为 React Embedded 的方式来使用，帮我好好设计这个 AI Agent（参考一下你 Augment 的经验），需要确保页面可以直接跑起来？？？或者方便的方式直接打开进行测试。

如下是我之前写的 ai 服务调用 代码，有点太复杂了，你可以基于这个去转换：

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();
const ai = require('ai');
const aiSdkOpenai = require('@ai-sdk/openai');

const { createUnifiedLogService } = require('../infrastructure/logging');
```

```
你应该结合 Puppetter 来看看是否能成功转换 JSP 到 react 页面，看看有没有报错
```


```
现在你应该使用我的测试工程 @/Users/phodal/ai/legacy/jsp2react-agent/fixtures/source/ 来进行转换，并确保流程是 OK 的，页面可以访问，也不会报错
```


```
我这是一个 CLI 工具，你不应该手动修复 。应该先编译之类的，然后报错，再设计  AI Agent 自动修复 编译错误；如果浏览器打开出错，应该使用 Puppetterer 或者 Playwright 去读取浏览器 console 的错误
```