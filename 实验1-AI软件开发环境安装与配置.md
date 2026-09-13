# 实验1：AI软件开发环境安装与配置

## 学习通提交说明

- **提交平台：** 学习通。
- **文件命名：** 班级-学号-姓名-实验1-AI软件开发环境安装与配置.pdf。
- **截止时间：** 以学习通作业设置为准。

## 1. 实验目的

- 建立能够支撑个人软件持续开发的IDE、运行时、Git与GitHub/Gitee基础环境。
- 完成Codex、Claude Code、DeepSeek Harness等AI开发工具的安装或接入验证，理解命令行、IDE插件与API调用三类使用方式。
- 优先使用阿里云、腾讯云等平台提供的免费额度；没有可用额度时采用本地模型，并学会安全管理API密钥和本地模型配置。

> **相关课程参考**
> - [CMU 15-113：Effective Coding with AI（2026）](https://www.csd.cs.cmu.edu/course/15113/s26)：参考其对AI编程助手、版本控制、质量验证和AI使用透明性的综合要求。
> - [COMPSCI 1066：Build at the Speed of Thought（2026课程目录）](https://my.harvard.edu/course/COMPSCI1066/2026-Fall/001)：参考其比较不同AI模型和开发工具、理解AI做了什么与没有做什么的做法。


## 2. 实验内容

### 2.1 开发环境清单与技术栈选择

- 说明计划开发的软件类型及拟采用的语言、框架、数据库和运行平台，给出选择理由。
- 制作环境清单：工具名称、版本、安装位置或获取方式、验证命令、验证结果。
- 补充本机操作系统、处理器架构和可用内存等基本信息，检查所选技术之间是否存在版本兼容问题。

### 2.2 IDE、运行时与基础工具配置

- 完成IDE与运行时配置，创建最小项目并成功启动；报告中给出项目结构截图和运行结果。
- 记录至少一个实际配置问题，例如解释器/JDK选择、PATH、依赖下载、代理或插件冲突，并说明处理过程。
- 使用项目的依赖文件或包管理工具保存依赖版本，并给出重新安装依赖和启动项目的命令。

### 2.3 Git与GitHub/Gitee版本管理

- 创建个人软件仓库，设置README、.gitignore和开源许可或仓库可见性；完成首个可说明内容的提交。
- 报告中列出仓库地址、默认分支、关键命令及首个Commit Hash，说明后续分支和提交规范。
- 修改一次README或示例代码并完成第二次提交，通过提交历史说明Git如何记录文件变化。

### 2.4 AI开发工具安装与接入

- 从Codex、DeepSeek Harness、Claude Code等工具中至少配置两种，记录安装方式、版本、认证方式和可用入口。
- 使用完全相同的小任务分别验证两种工具，例如解释项目结构、生成README草案；在AI协作记录中保存任务、关键输入、采用或未采用的建议、人工修改和验证结果。
- 制作简单对比表，从完成度、正确性、可解释性和使用成本等方面比较结果，并确定后续使用的主要工具和备用工具。

### 2.5 模型服务与API密钥安全

- 完成一个云端或本地模型API的最小调用，记录模型名称、运行位置、请求类型、返回结果、时延和大致用量。
- 使用环境变量或本地配置文件管理密钥，将敏感文件加入.gitignore；截图必须对密钥、Token、账号信息进行遮挡。
- 使用云端模型时查看免费额度、计费方式和余额提醒设置；没有可用额度时使用Ollama或同类工具运行本地模型，并记录模型下载、启动和调用方式。

### 2.6 环境验收

- 建立环境验收表，依次验证：项目可启动、Git可提交与推送、两种AI工具可响应、模型API可调用、AI协作记录可查看、仓库中无明文密钥。
- 在报告中给出通过/未通过清单；未通过项必须写明原因、替代方案和预计完成时间。
- 关闭并重新打开终端或IDE，或者在新的项目目录中重新获取代码并执行关键验证，确认环境和运行说明能够复现。

## 3. 操作记录

- 按照2.1—2.6记录实际操作、使用的命令或界面、结果和必要判断，不能只写最终结论。
- 截图、表格、日志和代码片段必须编号并配文字说明，禁止使用大段无解释截图代替分析。
- 涉及仓库内容时给出文件路径和对应Commit，涉及账号、密钥或个人信息时必须遮挡或脱敏。

## 4. 实验小结

- 总结已经完成和仍未完成的环境配置，并说明当前开发环境能否支持个人软件继续开发。
- 说明至少一个实际遇到的问题、原因、处理方法和验证结果。

---

## 5. 本次实验完成记录（2026-09-13）

> 说明：第1—4节保留了题目原始要求；本节及后续内容是依据本机实测填写的报告正文。文档中的“要求”属于实验说明，不会被当作需要提交给外部服务的指令。

### 5.1 对应 2.1：开发环境清单与技术栈

本次选择 Node.js 命令行小项目作为最小验证对象。Node.js 自带测试运行器，项目不依赖第三方运行时包，适合先验证 IDE、运行时、npm、Git 和 AI 工具之间的基本协作。

| 项目 | 实测值或选择 | 验证方式 |
|---|---|---|
| 操作系统 | Windows 11 家庭版中文版，64 位，版本 10.0.26200 | `Get-CimInstance Win32_OperatingSystem` |
| 处理器 | 13th Gen Intel Core i7-13650HX，14 核 / 20 逻辑处理器 | `Get-CimInstance Win32_Processor` |
| 内存 | 总计 15.63 GiB；检测时可用约 3.63 GiB | `Get-CimInstance Win32_ComputerSystem` |
| IDE | Visual Studio Code 1.137.0；已安装中文语言包 | `code --version`、`code --list-extensions` |
| 运行时 | Node.js v24.16.0，npm 11.13.0 | `node --version`、`npm --version` |
| 编程语言 | JavaScript ES Module | `package.json` 中的 `"type": "module"` |
| 测试 | Node.js 内置 `node:test` | `npm test` |
| 版本管理 | Git 2.54.0，默认分支 `main` | `git --version`、`git branch --show-current` |
| 项目位置 | `D:\work\ai\ai-env-demo` | 本地 Git 仓库子目录 |

版本兼容性检查结果：Node.js 24 满足项目要求的 Node.js `>=20`；Claude Code 2.1.270 要求 Node.js `>=22`，也满足。项目没有原生扩展或第三方依赖，未发现 ABI 或依赖树冲突。

### 5.2 对应 2.2：IDE、运行时与基础工具

最小项目结构如下（对应图1的文本化目录证据）：

```text
ai-env-demo/
├─ package.json
├─ package-lock.json
├─ README.md
├─ LICENSE
├─ .gitignore
├─ .env.example
├─ scripts/
│  └─ env-check.js
└─ src/
   ├─ index.js
   └─ index.test.js
```

复现命令：

```powershell
cd D:\work\ai\ai-env-demo
npm install
npm run env:check
npm test
npm start
```

关键结果：

```text
Node.js: v24.16.0
平台: win32/x64
CPU 逻辑处理器: 20
内存: 15.63 GiB

✔ reports the local runtime environment
ℹ tests 1
ℹ pass 1

AI environment demo started
{
  "node": "v24.16.0",
  "platform": "win32",
  "architecture": "x64",
  "cpuCores": 20,
  "memoryGiB": 15.63
}
```

实际配置问题：最初在 `src/index.js` 中直接比较 `import.meta.url` 与 Windows 路径，因 URL 使用斜杠而命令行路径使用反斜杠，导致 `npm start` 只打印标题。处理方法是使用 Node.js 内置 `fileURLToPath()` 统一路径格式；修复后重新执行 `npm start` 和 `npm test` 均通过。依赖由 `package-lock.json` 锁定，重新安装只需执行 `npm install`。

### 5.3 对应 2.3：Git 与 GitHub/Gitee

- 本地仓库地址：`D:\work\ai`（当前未设置 GitHub/Gitee 远程地址）。
- 默认分支：`main`。
- 首次提交：`c4fe936 chore: add reproducible AI environment demo`。
- 第二次提交：`42d2f5a docs: record environment acceptance result`。
- 关键命令：`git init -b main`、`git add`、`git commit`、`git log --oneline --decorate`、`git status --short`。
- 提交规范：功能或修复使用 `feat:` / `fix:`，文档和环境记录使用 `docs:` / `chore:`；后续开发从 `main` 创建主题分支，合并前运行测试。

第二次提交只修改了 `ai-env-demo/README.md`，增加了 2026-09-13 的环境验收结果。提交历史因此能直接显示 README 的变化。

### 5.4 对应 2.4：AI 开发工具安装与接入

| 工具 | 安装方式与版本 | 认证和入口 | 同题验证结果 |
|---|---|---|---|
| Codex CLI | 已安装 `@openai/codex`，0.153.4 | `codex login status` 显示认证已配置；`codex exec` | 返回 `Codex probe OK`，并完成项目结构说明 |
| Claude Code | `npm install -g @anthropic-ai/claude-code@2.1.270` | `claude -p`；本次使用 `--model claude-sonnet-4-5`，密钥未写入项目 | 返回 `Claude probe OK`，并完成项目结构说明 |

两种工具使用完全相同的结构解释任务，详细输入、输出摘要、用量和人工取舍见 [AI协作记录.md](AI协作记录.md)。对比结果如下：

| 维度 | Codex CLI | Claude Code |
|---|---|---|
| 完成度 | 逐文件覆盖，表格清晰 | 按职责分组，覆盖完整 |
| 正确性 | 与项目结构和脚本一致 | 额外指出 ES Module 和 `engines` 约束 |
| 可解释性 | 适合逐项核对 | 适合快速理解设计意图 |
| 使用成本 | 本次约 11,518 输入 / 916 输出 tokens | 本次约 4,259 输入 / 687 输出 tokens |

后续主要工具选择 Codex CLI，备用工具选择 Claude Code；原因是 Codex 已在本机完成认证且适合当前工作区，Claude Code 已安装并可在指定模型下响应。

### 5.5 对应 2.5：模型服务与 API 密钥安全

本次完成了两次云端模型最小调用，均为一次文本请求，未把密钥写入项目：

| 模型 | 位置 | 请求与返回 | 时延及用量 |
|---|---|---|---|
| CodexPlusPlus 上的 `gpt-6-astra` | 云端 | `codex exec --json`，返回 `Codex probe OK` | 约 20.0 秒；输入 11,444、输出 8 tokens |
| `claude-sonnet-4-5` | 云端 first-party provider | `claude -p --output-format json`，返回 `Claude probe OK` | API 约 9.1 秒；输入 0、输出 5 tokens |

项目使用 `.env.example` 记录变量名，`.env`、`.env.*` 已加入 `ai-env-demo/.gitignore`。`env-check.js` 只显示变量是否设置和字符数，不打印值。当前普通终端中 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`DEEPSEEK_API_KEY` 和 `DASHSCOPE_API_KEY` 均未设置；Codex 的认证文件位于用户目录，未纳入仓库。由于未配置 Ollama，也没有下载本地模型；云端额度和余额提醒需要在个人服务控制台中继续设置。

### 5.6 对应 2.6：环境验收

| 验收项 | 状态 | 证据或原因 |
|---|---|---|
| 项目可启动 | 通过 | `npm start` 输出环境摘要 |
| Git 可提交 | 通过 | 已有两个提交，默认分支 `main` |
| Git 可推送 | 待配置 | 未绑定 GitHub/Gitee 远程地址；配置账号和 remote 后执行 `git push -u origin main` |
| 两种 AI 工具可响应 | 通过 | Codex CLI 与 Claude Code 均返回同题结果 |
| 模型 API 可调用 | 通过 | 两次云端文本调用均完成 |
| AI 协作记录可查看 | 通过 | [AI协作记录.md](AI协作记录.md) |
| 仓库无明文密钥 | 通过 | `.env` 被忽略，源码只输出设置状态和长度 |
| 关闭并重新打开后可复现 | 通过 | 重新执行 `npm install`、`npm test`、`npm start` 的命令已写入 README；项目无第三方运行时依赖 |

## 6. 实验小结

本次已完成 Windows 11、VS Code、Node.js、npm、Git、Codex CLI、Claude Code 和一个可运行 Node.js 最小项目的配置与验证。项目包含锁定文件、测试、环境检查脚本、密钥模板、`.gitignore`、README 和 MIT 许可证，能够支持继续开发个人软件。

仍未完成的事项只有 GitHub/Gitee 远程仓库推送、云服务免费额度提醒和 Ollama 本地模型配置，这些步骤依赖个人账号或额外下载。当前本地提交和模型调用已经通过，后续绑定远程仓库后即可补做推送验收。

本次实际问题是 Windows ESM 路径格式不一致。将 `import.meta.url` 通过 `fileURLToPath()` 转换后，`npm start` 能输出完整摘要，`npm test` 保持 1 项通过；修复过程和验证结果已记录在 5.2。
