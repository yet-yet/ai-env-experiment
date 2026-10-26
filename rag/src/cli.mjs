#!/usr/bin/env node
// 命令行入口：知识库构建、片段抽查、单次问答、多轮演示、三组输入、双组对比、失败处理
import fs from "node:fs";
import path from "node:path";
import { config, RUNS_DIR, DATA_DIR, assertConfigured, redactKey } from "./config.mjs";
import { buildKnowledgeBase, loadKnowledge } from "./kb.mjs";
import { getRetriever, askRag, askDirect, PROMPT_V2, PROMPT_V1 } from "./pipeline.mjs";
import { callModel, describeConfig } from "./llm.mjs";
import { runEval, renderTable, loadQuestions } from "./eval.mjs";

const line = (ch = "─", n = 72) => ch.repeat(n);
const h1 = (t) => console.log(`\n${line("═")}\n${t}\n${line("═")}`);
const h2 = (t) => console.log(`\n${line("─")}\n${t}\n${line("─")}`);

function saveRun(kind, payload) {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(RUNS_DIR, `${stamp}-${kind}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  return file;
}

function printRetrieval(res, { showContext = false } = {}) {
  const hits = res.retrieval?.hits ?? [];
  h2(`检索结果（Top-${Math.min(hits.length, 8)}，最终进入上下文 k = ${res.retrieval?.accepted?.length ?? 0}）`);
  console.log("排名 编号        混合分  BM25*   余弦    覆盖度 重合  相关  片段小节点");
  for (const h of hits) {
    console.log(
      `${String(h.rank).padStart(3)}  ${h.chunkId.padEnd(10)} ${String(h.hybrid).padEnd(6)} ${String(h.bm25norm).padEnd(7)} ${String(h.cosine).padEnd(7)} ${String(h.coverageIdf).padEnd(6)} ${String(h.overlap).padStart(3)}   ${h.relevant ? "是" : "否"}    ${h.section.slice(0, 22)}`
    );
  }
  console.log(`\n关键词预筛：实词命中 ≥ ${res.retrieval?.gate?.minKeywordOverlap}；加权覆盖度门槛 ${res.retrieval?.gate?.minCoverageIdf}（模型判断不可用时回退使用）`);
  if (res.retrieval?.rerank && !res.retrieval.rerank.skipped) {
    console.log(`模型判断重排：${res.retrieval.rerank.fallback ? "失败，已回退词法排序" : `完成 → ${(res.retrieval.rerank.ids ?? []).join("、") || "判定为均不相关"}`}`);
  }
  if (showContext && res.context) {
    h2("实际送入模型的上下文（节选前 900 字）");
    console.log(res.context.slice(0, 900) + (res.context.length > 900 ? "\n…（已截断显示）" : ""));
    console.log(`\n上下文字符数：${res.context.length}`);
  }
}

function printAnswer(res) {
  h2("回答");
  console.log(res.answer ?? `（调用失败：${res.code} ${res.message}）`);
  if (res.citations) {
    console.log(
      `\n引用检查：${res.citations.hasCitation ? res.citations.cited.join("、") : "未引用任何编号"}` +
        (res.citations.invalid.length ? `；无效引用 ${res.citations.invalid.join("、")}` : "；全部对应本次提供的片段")
    );
  }
  if (res.usage) {
    const th = res.usage.thinking ? `（其中推理 ${res.usage.thinking}）` : "";
    console.log(`用量：输入 ${res.usage.input} / 输出 ${res.usage.output}${th} / 合计 ${res.usage.total} tokens，调用 ${res.usage.calls} 次`);
  }
  if (res.truncated) console.log(`⚠ 输出达到 max_tokens 上限被截断（stop_reason=${res.stopReason}）`);
  if (res.latencyMs) {
    const l = res.latencyMs;
    console.log(`耗时：检索 ${l.retrieve} ms，重排 ${l.rerank} ms，生成 ${l.generate} ms，合计 ${l.total} ms`);
  }
}

const commands = {
  async info() {
    h1("模型调用配置（密钥只显示长度）");
    for (const [k, v] of Object.entries(describeConfig())) console.log(`${k.padEnd(12)}${v}`);
  },

  async build() {
    h1("知识库构建：清理、切分与统计");
    const { chunks, stats } = buildKnowledgeBase();
    console.log(`资料 ${stats.docCount} 份，片段 ${stats.chunkCount} 个，正文共 ${stats.bodyChars} 字符`);
    console.log(`片段长度：平均 ${stats.chunk.avgChars}，最短 ${stats.chunk.minChars}，最长 ${stats.chunk.maxChars}，中位数 ${stats.chunk.p50}；相邻片段重叠 ${stats.chunk.overlapChars} 字符\n`);
    console.log("文档清单：");
    for (const d of stats.perDoc) console.log(`  ${d.docId}  ${d.title}｜${d.issuer}｜${d.effective} 施行｜${d.bodyChars} 字符 → ${d.chunks} 片段`);
    console.log("\n清理结果：");
    console.log(`  乱码（U+FFFD/控制字符）文件：${stats.issues.garbled.length} 个`);
    console.log(`  剔除版式噪声行：${stats.issues.noiseLinesRemoved} 行`);
    console.log(`  重复资料/重复片段：${stats.issues.duplicates.length} 处`);
    console.log(`  元数据缺失文件：${stats.issues.missingMeta.length} 个`);
    const file = saveRun("build", { stats });
    console.log(`\n已保存：${path.relative(process.cwd(), file)}`);
    return chunks;
  },

  async inspect() {
    h1("片段抽查（内容 + 元数据）");
    const { chunks } = loadKnowledge();
    const picks = [0, Math.floor(chunks.length / 2), chunks.length - 1];
    for (const idx of picks) {
      const c = chunks[idx];
      console.log(`\n[${c.chunkId}] ${c.docTitle}｜${c.issuer}｜${c.effective} 施行`);
      console.log(`小节：${c.section}｜字符数：${c.charLen}｜来源：${c.sourceUrl}`);
      console.log(line());
      console.log(c.text.length > 420 ? `${c.text.slice(0, 420)}…` : c.text);
    }
    const lens = chunks.map((c) => c.charLen);
    console.log(`\n共 ${chunks.length} 个片段，长度 ${Math.min(...lens)}—${Math.max(...lens)} 字符`);
  },

  async retrieve(args) {
    const question = args.filter((a) => !a.startsWith("--")).join(" ");
    if (!question) throw new Error('用法：node src/cli.mjs retrieve "问题"');
    const rt = getRetriever();
    const found = rt.search(question);
    h1(`只看检索（不调用模型）：${question}`);
    console.log(`查询词（${found.queryTokens.length}）：${found.queryTokens.join(" ")}`);
    console.log("\n排名 编号        混合分  BM25*   余弦    覆盖度 重合  相关  命中词 / 小节");
    for (const h of found.hits) {
      console.log(
        `${String(h.rank).padStart(3)}  ${h.chunkId.padEnd(10)} ${String(h.hybrid).padEnd(6)} ${String(h.bm25norm).padEnd(7)} ${String(h.cosine).padEnd(7)} ${String(h.coverageIdf).padEnd(6)} ${String(h.overlap).padStart(3)}   ${h.relevant ? "是" : "否"}   [${h.matchedTerms.join(" ")}] ${h.section}`
      );
    }
    console.log(`\n命中 ${found.gate.accepted} 个片段；门槛：实词命中 ≥ ${found.gate.minKeywordOverlap} 且加权覆盖度 ≥ ${found.gate.minCoverageIdf}`);
    if (found.gate.reason) console.log(`资料不足原因：${found.gate.reason}`);
    saveRun("retrieve", found);
  },

  async ask(args) {
    const question = args.filter((a) => !a.startsWith("--")).join(" ");
    if (!question) throw new Error('用法：node src/cli.mjs ask "问题" [--context] [--no-rerank] [--template v1]');
    assertConfigured();
    h1(`问题：${question}`);
    const useRerank = !args.includes("--no-rerank");
    const template = args.includes("--template") && args[args.indexOf("--template") + 1] === "v1" ? PROMPT_V1 : PROMPT_V2;
    const res = await askRag({ question, useRerank, template });
    printRetrieval(res, { showContext: args.includes("--context") });
    printAnswer(res);
    const file = saveRun("ask", res);
    console.log(`\n已保存：${path.relative(process.cwd(), file)}`);
  },

  async promptdiff(args) {
    assertConfigured();
    const question = args.filter((a) => !a.startsWith("--")).join(" ");
    if (!question) throw new Error('用法：node src/cli.mjs promptdiff "问题"');
    h1(`Prompt 版本对比：${question}`);
    const out = {};
    for (const [name, template] of [["v1", PROMPT_V1], ["v2", PROMPT_V2]]) {
      const res = await askRag({ question, template, useRerank: false });
      out[name] = res;
      h2(`模板 ${name}｜system ${template.system.length} 字符｜user ${res.prompt.messages[0].content.length} 字符｜上下文 ${res.context.length} 字符`);
      console.log(res.answer);
      console.log(
        `\n引用：${res.citations.cited.join("、") || "无"}｜输出 ${res.usage.output} tokens（推理 ${res.usage.thinking ?? 0}）｜耗时 ${res.latencyMs.total} ms｜截断：${res.truncated ? "是" : "否"}`
      );
    }
    const file = saveRun("promptdiff", { question, v1: out.v1, v2: out.v2 });
    console.log(`\n已保存：${path.relative(process.cwd(), file)}`);
  },

  async demo() {
    assertConfigured();
    h1("完整链路演示：问题输入 → 检索 → 上下文组织 → 模型调用 → 回答返回");
    const retriever = getRetriever();
    console.log(`知识库：${retriever.chunks.length} 个片段；模型：${config.model}；k = ${config.topK}`);

    const q1 = "不满16周岁的用户，未成年人模式默认每天能用多长时间？连续使用多久要发出休息提醒？";
    h1(`第 1 轮问题：${q1}`);
    const r1 = await askRag({ question: q1, retriever });
    printRetrieval(r1);
    printAnswer(r1);

    const q2 = "那青盾自己的软阈值是多少？和刚才这个规定是什么关系？";
    h1(`第 2 轮问题（带历史消息）：${q2}`);
    const history = [
      { role: "user", content: q1 },
      { role: "assistant", content: r1.answer }
    ];
    const r2 = await askRag({ question: q2, history, retriever });
    printRetrieval(r2);
    h2("本轮实际发送给模型的完整输入");
    console.log(`system：\n${r2.prompt.system}\n`);
    for (const m of r2.prompt.messages) {
      console.log(`[${m.role}] ${m.content.length > 1200 ? `${m.content.slice(0, 1200)}…（共 ${m.content.length} 字符）` : m.content}`);
      console.log(line("·"));
    }
    printAnswer(r2);
    const file = saveRun("demo", { q1, r1, q2, r2 });
    console.log(`\n已保存：${path.relative(process.cwd(), file)}`);
  },

  async inputs() {
    assertConfigured();
    const cases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "inputs-2.1.json"), "utf8")).cases;
    h1("2.1 三组输入测试：正常 / 缺少必要信息 / 超出任务范围");
    const rows = [];
    for (const c of cases) {
      h2(`${c.id}（${c.kind}）：${c.question}`);
      console.log(`期望：${c.expect}`);
      const res = await askRag({ question: c.question });
      console.log(`\n实际：${res.answer}`);
      console.log(`检索命中：${(res.retrieval?.accepted ?? []).map((x) => x.chunkId).join("、") || "无"}｜资料不足标记：${res.insufficient ? "是" : "否"}`);
      rows.push({ id: c.id, kind: c.kind, question: c.question, expect: c.expect, answer: res.answer, insufficient: res.insufficient, retrieved: (res.retrieval?.accepted ?? []).map((x) => x.chunkId), usage: res.usage, latencyMs: res.latencyMs });
    }
    const file = saveRun("inputs-2.1", rows);
    console.log(`\n已保存：${path.relative(process.cwd(), file)}`);
  },

  async eval(args) {
    assertConfigured();
    const limitIdx = args.indexOf("--limit");
    const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;
    h1("2.5 双组对比测试：直接模型组 vs RAG 组");
    console.log(`模型：${config.model}｜k = ${config.topK}｜重排：${config.useRerank ? "开" : "关"}｜题目数：${limit || loadQuestions().length}`);
    const { outDir, summary } = await runEval({ limit });
    h2("汇总");
    console.log(`直接组：成功 ${summary.direct.okCount}/${summary.questions}，Token ${summary.direct.totalTokens}（入 ${summary.direct.inputTokens} / 出 ${summary.direct.outputTokens}），平均耗时 ${summary.direct.avgLatencyMs} ms`);
    console.log(`RAG 组：成功 ${summary.rag.okCount}/${summary.questions}，资料不足 ${summary.rag.insufficientCount}，Token ${summary.rag.totalTokens}（入 ${summary.rag.inputTokens} / 出 ${summary.rag.outputTokens}），平均耗时 ${summary.rag.avgLatencyMs} ms`);
    console.log(`RAG 组耗时构成：检索 ${summary.rag.avgRetrieveMs} ms / 重排 ${summary.rag.avgRerankMs} ms / 生成 ${summary.rag.avgGenerateMs} ms；带引用 ${summary.rag.withCitation} 题，无效引用 ${summary.rag.withInvalidCitation} 题`);
    console.log(`\n结果目录：${path.relative(process.cwd(), outDir)}`);
  },

  async report() {
    console.log(renderTable());
  },

  async fail() {
    h1("失败处理测试：超时、连接失败、鉴权失败");
    const cases = [];

    const original = { ...config };
    // 1) 超时：把超时压到 800 ms，让请求必然被中止
    config.timeoutMs = 800;
    config.maxRetries = 0;
    h2("1) 超时（timeout = 800 ms，maxRetries = 0）");
    const timeoutRes = await callModel({ system: "你是助手。", messages: [{ role: "user", content: "请写一段 500 字的介绍。" }] });
    console.log(`返回：ok=${timeoutRes.ok} code=${timeoutRes.code} attempts=${timeoutRes.attempts}`);
    console.log(`消息：${timeoutRes.message}`);
    cases.push({ case: "timeout", ...timeoutRes });

    // 2) 连接失败：指向本机未监听的端口
    config.timeoutMs = 8000;
    config.baseUrl = "http://127.0.0.1:9";
    h2("2) 连接失败（baseUrl = http://127.0.0.1:9）");
    const netRes = await callModel({ messages: [{ role: "user", content: "你好" }] });
    console.log(`返回：ok=${netRes.ok} code=${netRes.code} attempts=${netRes.attempts}`);
    console.log(`消息：${netRes.message}`);
    cases.push({ case: "network", ...netRes });

    // 3) 鉴权失败：使用无效密钥
    config.baseUrl = original.baseUrl;
    config.apiKey = "sk-invalid-key-for-test";
    h2("3) 鉴权失败（使用无效密钥）");
    const authRes = await callModel({ messages: [{ role: "user", content: "你好" }] });
    console.log(`返回：ok=${authRes.ok} code=${authRes.code} attempts=${authRes.attempts}`);
    console.log(`消息：${authRes.message}`);
    cases.push({ case: "auth", ...authRes });

    Object.assign(config, original);
    h2("失败时的降级行为");
    console.log("callModel 不抛异常，返回 {ok:false, code, message}；askRag 在生成阶段失败时返回 stage=\"generate\"，");
    console.log("检索结果与上下文仍保留在日志中，界面层可直接展示“模型暂时不可用，以下为检索到的依据”。");
    const file = saveRun("fail", cases);
    console.log(`\n已保存：${path.relative(process.cwd(), file)}`);
  }
};

const [cmd, ...rest] = process.argv.slice(2);
const handler = commands[cmd];
if (!handler) {
  console.log(`用法：node src/cli.mjs <command>
  info      显示模型调用配置（密钥脱敏）
  build     构建知识库并输出统计
  inspect   抽查 3 个片段的内容与元数据
  retrieve  只做检索并打印 Top-k（不调用模型）
  ask "问题"  单次 RAG 问答（--context 显示上下文，--no-rerank 关闭重排）
  demo      完整链路 + 多轮对话演示
  promptdiff "问题"  同一问题分别用 Prompt v1 / v2 生成并对比
  inputs    2.1 三组输入测试
  eval      2.5 双组对比测试（--limit N 只跑前 N 题）
  report    打印对比结果表（合并人工判断）
  fail      失败处理测试`);
  process.exit(1);
}
try {
  await handler(rest);
} catch (err) {
  console.error(`\n执行失败：${err.message}`);
  process.exit(1);
}
