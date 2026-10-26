# qingdun-rag

青盾（青少年上网内容净化与监护管理助手）的 **RAG 最小链路**：知识库准备 → 切分 → 混合检索 → 上下文组织 → 带出处的回答生成 → 对比测试。

对应《实验5：LLM、Context与RAG实现》的 2.1—2.6。零第三方运行依赖（只用 Node.js 内置模块），Node.js ≥ 20。

## 目录

```
rag/
  knowledge/            知识库原始资料（Markdown + YAML 元数据），5 份
  data/chunks.json      切分产物（可复现，由 kb:build 生成）
  data/kb-report.json   知识库统计与清理报告
  data/questions.json   固定问题集（8 题，含运行前写定的判断规则）
  data/inputs-2.1.json  2.1 的三组输入（正常/缺信息/超范围）
  data/judgement.json   对比测试的人工判断（人工填写，脚本只做合并）
  src/config.mjs        配置与密钥读取（.env.local → 环境变量优先级更高）
  src/llm.mjs           模型调用：超时、重试、错误分类
  src/tokenize.mjs      分词：领域词典 + 二元回退 + 条款号/数量词抽取
  src/chunk.mjs         切分：标题分段 + 段落合并 + 句子兜底
  src/kb.mjs            装载、清理（乱码/噪声/重复）、切分、统计
  src/bm25.mjs          BM25 与 TF-IDF 余弦（同一分词空间）
  src/retrieve.mjs      混合检索、相关性门槛、模型判断重排
  src/prompt.mjs        Prompt 模板 v1/v2、直接模型组模板、上下文拼装
  src/pipeline.mjs      完整链路 askRag / askDirect + 引用校验
  src/eval.mjs          双组对比运行器与表格渲染
  src/cli.mjs           命令行入口
  runs/                 每次运行的完整记录（JSON）与对比结果
  test/                 单元测试（不联网，用假模型验证编排与失败分支）
```

## 配置

```bash
cp .env.example .env.local     # 然后填入 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY
```

`.env.local` 已被仓库 `.gitignore` 忽略，不会提交。接口按 **Anthropic Messages** 协议调用：
`POST {LLM_BASE_URL}/v1/messages`，请求头 `x-api-key`、`anthropic-version: 2023-06-01`。

主要参数（`src/config.mjs`，均可用环境变量覆盖）：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_MODEL` | `claude-opus-5-5` | 模型名称 |
| `LLM_MAX_TOKENS` | 900 | 单次生成上限 |
| `LLM_TEMPERATURE` | 0 | 固定为 0，保证可重复 |
| `LLM_TIMEOUT_MS` | 60000 | 单次请求超时 |
| `LLM_MAX_RETRIES` | 2 | 可重试错误的重试次数（超时/网络/429/5xx） |
| `RAG_TOPK` | 4 | 最终进入上下文的片段数 k |
| `RAG_CANDIDATES` | 8 | 进入模型判断的候选片段数 |
| `RAG_MIN_KEYWORD_OVERLAP` | 2 | 关键词预筛门槛（实词命中数） |
| `RAG_MIN_COVERAGE_IDF` | 0.3 | 加权覆盖度门槛（模型判断不可用时回退） |
| `RAG_CHUNK_TARGET` / `RAG_CHUNK_MAX` | 520 / 780 | 片段目标长度 / 上限（字符） |
| `RAG_RERANK` | 1 | 是否启用模型判断重排 |

## 知识库准备

1. 取公开发布的资料正文（政策法规或本项目自有文档），按段落整理成 Markdown；
2. 文件头写 YAML 元数据：`docId / title / issuer / docNumber / published / effective / sourceUrl / retrieved / permission / privacy / form`；
3. 放入 `knowledge/`，执行 `npm run kb:build`。脚本会：剔除导航/版权等噪声行、检查乱码与控制字符、按正文去重、按标题与段落切分、输出 `data/chunks.json` 与统计报告；
4. 资料更新时替换同名文件后重新 `kb:build`，片段编号会重排，`runs/` 里的旧记录仍保留原编号与原文本。

## 调用方式

```bash
npm run kb:build            # 构建知识库（必须最先执行一次）
npm run kb:check            # 抽查 3 个片段的内容与元数据
node src/cli.mjs retrieve "问题"   # 只看检索结果（不调用模型，用于标定阈值）
npm run ask -- "问题"        # 单次 RAG 问答
npm run demo                # 完整链路 + 多轮对话演示
node src/cli.mjs inputs     # 2.1 三组输入测试
npm run eval                # 2.5 双组对比测试（8 题）
node src/cli.mjs report     # 合并人工判断并打印对比表
npm run fail                # 失败处理测试（超时/连接失败/鉴权失败）
npm test                    # 单元测试
```

### 作为模块调用

```js
import { askRag, askDirect } from "./src/pipeline.mjs";

const res = await askRag({
  question: "不满16周岁的用户，未成年人模式默认每天能用多长时间？",
  history: [],        // 可选：多轮历史 [{role:'user'|'assistant', content}]
  topK: 4,            // 可选：本次的 k
  useRerank: true     // 可选：是否用模型判断重排
});
```

**输入**：`question`（必填）、`history`（可选）、`topK` / `useRerank` / `template`（可选）。
**输出**（成功）：

```json
{
  "ok": true, "group": "rag", "question": "...", "answer": "...",
  "insufficient": false,
  "retrieval": { "hits": [], "accepted": [], "used": ["K1-C07"], "gate": {}, "rerank": {} },
  "context": "【资料1｜编号 K1-C07】…",
  "citations": { "cited": ["K1-C07"], "invalid": [], "hasCitation": true, "checkable": true },
  "usage": { "input": 4, "output": 212, "total": 216, "calls": 2 },
  "latencyMs": { "retrieve": 2, "rerank": 4109, "generate": 6091, "total": 10229 }
}
```

**失败返回**（不抛异常）：`{ ok: false, stage: "generate", code: "TIMEOUT" | "NETWORK" | "AUTH" | "RATE_LIMIT" | "SERVER" | "BAD_REQUEST" | "EMPTY" | "CONFIG", message, retrieval, context }`。检索结果与上下文在失败时仍保留，界面层可以只展示依据、暂不展示结论。

**资料不足**（正常返回，但与“答不出来”区分）：`{ ok: true, insufficient: true, answer: "资料不足：…" }`，产生原因写入 `retrieval.gate.reason` 或 `retrieval.rerank`。
