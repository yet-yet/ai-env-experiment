// 对比测试运行器：同一问题、同一模型与参数，直接模型组 vs RAG 组，各次独立上下文
import fs from "node:fs";
import path from "node:path";
import { config, RUNS_DIR, DATA_DIR } from "./config.mjs";
import { askRag, askDirect } from "./pipeline.mjs";

const pad = (s, n) => {
  const w = [...String(s)].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);
  return String(s) + " ".repeat(Math.max(0, n - w));
};

export function loadQuestions(file = path.join(DATA_DIR, "questions.json")) {
  return JSON.parse(fs.readFileSync(file, "utf8")).questions;
}

export async function runEval({ limit = 0, useRerank = config.useRerank, topK = config.topK, call } = {}) {
  const all = loadQuestions();
  const questions = limit ? all.slice(0, limit) : all;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(RUNS_DIR, `eval-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (const [i, q] of questions.entries()) {
    process.stderr.write(`[${i + 1}/${questions.length}] ${q.id} 直接模型组…\n`);
    // 两组各次测试都使用独立上下文（不传 history），避免前一次结果影响后一次
    const direct = await askDirect({ question: q.question, call });
    process.stderr.write(`[${i + 1}/${questions.length}] ${q.id} RAG 组…\n`);
    const rag = await askRag({ question: q.question, useRerank, topK, call });

    results.push({
      id: q.id,
      type: q.type,
      question: q.question,
      expect: q.expect,
      direct: {
        ok: direct.ok,
        answer: direct.answer ?? null,
        code: direct.code ?? null,
        message: direct.message ?? null,
        usage: direct.usage ?? null,
        latencyMs: direct.latencyMs ?? null,
        truncated: direct.truncated ?? null,
        promptChars: direct.prompt ? JSON.stringify(direct.prompt).length : 0
      },
      rag: {
        ok: rag.ok,
        answer: rag.answer ?? null,
        code: rag.code ?? null,
        message: rag.message ?? null,
        insufficient: rag.insufficient ?? null,
        truncated: rag.truncated ?? null,
        usage: rag.usage ?? null,
        latencyMs: rag.latencyMs ?? null,
        promptChars: rag.prompt ? JSON.stringify(rag.prompt).length : 0,
        contextChars: rag.context ? rag.context.length : 0,
        citations: rag.citations ?? null,
        retrieved: (rag.retrieval?.accepted ?? []).map((c) => ({
          chunkId: c.chunkId,
          hybrid: c.hybrid,
          cosine: c.cosine,
          bm25norm: c.bm25norm,
          overlap: c.overlap,
          section: c.section,
          docTitle: c.docTitle
        })),
        candidates: (rag.retrieval?.hits ?? []).map((c) => ({
          chunkId: c.chunkId,
          rank: c.rank,
          hybrid: c.hybrid,
          relevant: c.relevant,
          matchedTerms: c.matchedTerms
        })),
        rerank: rag.retrieval?.rerank ?? null,
        gate: rag.retrieval?.gate ?? null
      }
    });
  }

  const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) ?? 0), 0);
  const summary = {
    questions: questions.length,
    model: config.model,
    topK,
    useRerank,
    direct: {
      okCount: results.filter((r) => r.direct.ok).length,
      totalCalls: sum(results, (r) => r.direct.usage?.calls),
      totalTokens: sum(results, (r) => r.direct.usage?.total),
      inputTokens: sum(results, (r) => r.direct.usage?.input),
      outputTokens: sum(results, (r) => r.direct.usage?.output),
      avgLatencyMs: Math.round(sum(results, (r) => r.direct.latencyMs?.total) / results.length)
    },
    rag: {
      okCount: results.filter((r) => r.rag.ok).length,
      insufficientCount: results.filter((r) => r.rag.insufficient).length,
      totalCalls: sum(results, (r) => r.rag.usage?.calls),
      totalTokens: sum(results, (r) => r.rag.usage?.total),
      inputTokens: sum(results, (r) => r.rag.usage?.input),
      outputTokens: sum(results, (r) => r.rag.usage?.output),
      avgLatencyMs: Math.round(sum(results, (r) => r.rag.latencyMs?.total) / results.length),
      avgRetrieveMs: Math.round(sum(results, (r) => r.rag.latencyMs?.retrieve) / results.length),
      avgRerankMs: Math.round(sum(results, (r) => r.rag.latencyMs?.rerank) / results.length),
      avgGenerateMs: Math.round(sum(results, (r) => r.rag.latencyMs?.generate) / results.length),
      withInvalidCitation: results.filter((r) => (r.rag.citations?.invalid?.length ?? 0) > 0).length,
      withCitation: results.filter((r) => r.rag.citations?.hasCitation).length
    }
  };

  fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2), "utf8");
  fs.writeFileSync(path.join(RUNS_DIR, "eval-latest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), summary, results, dir: outDir }, null, 2), "utf8");

  return { outDir, summary, results };
}

/** 把人工判断合并进对比表（judgement.json 由人工填写，脚本只做合并与排版） */
export function renderTable(judgementFile = path.join(DATA_DIR, "judgement.json"), resultsFile = path.join(RUNS_DIR, "eval-latest.json")) {
  const { results } = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
  const judgement = fs.existsSync(judgementFile) ? JSON.parse(fs.readFileSync(judgementFile, "utf8")) : { items: {} };
  const rows = results.map((r) => {
    const j = judgement.items?.[r.id] ?? {};
    const d = j.direct ?? {};
    const g = j.rag ?? {};
    const cites = r.rag.citations?.cited?.length ? r.rag.citations.cited.join("、") : "无";
    const invalid = r.rag.citations?.invalid?.length ? `（无效：${r.rag.citations.invalid.join("、")}）` : "";
    return `| ${r.id} | ${r.type} | ${d.level ?? "—"} | ${d.missing?.length ? d.missing.join("；") : "—"} | ${g.level ?? "—"} | ${g.missing?.length ? g.missing.join("；") : "—"} | ${cites}${invalid} | ${j.note ?? ""} |`;
  });
  const header = "| 题号 | 类型 | 直接组判定 | 直接组遗漏/无依据 | RAG组判定 | RAG组遗漏/无依据 | RAG引用 | 备注 |\n| --- | --- | --- | --- | --- | --- | --- | --- |";
  return `${header}\n${rows.join("\n")}`;
}

export { pad };
