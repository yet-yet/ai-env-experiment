# AI 环境最小验证项目

这个项目用于验证 Node.js、npm、Git 和 AI 开发工具可以在同一工作区协同使用。

## 运行

```powershell
npm install
npm run env:check
npm test
npm start
```

项目不依赖第三方运行时包，`package.json` 中的 `engines` 约束 Node.js 版本，便于在新目录复现。

## 验收结果

2026-09-13 在 Windows 11 64 位环境验证：`npm test` 通过 1 个测试，`npm start` 成功输出运行时摘要。

## 密钥

复制 `.env.example` 为本地 `.env` 后再填入密钥。`.env` 已被 `.gitignore` 忽略，命令输出也只报告变量是否设置和长度，不打印密钥内容。
