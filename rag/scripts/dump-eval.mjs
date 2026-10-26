// 临时调试脚本：把对比测试结果打印成便于人工判断的文本
import fs from "node:fs";

const file = process.argv[2] ?? "runs/eval-latest.json";
const j = JSON.parse(fs.readFileSync(file, "utf8"));
for (const r of j.results) {
  console.log("=".repeat(100));
  console.log(`${r.id} [${r.type}] ${r.question}`);
  console.log(`-- 直接组 (${r.direct.latencyMs?.total}ms, ${r.direct.usage?.calls}次调用, ${r.direct.usage?.total}tok):`);
  console.log((r.direct.answer ?? "").replace(/\n{2,}/g, "\n"));
  console.log(
    `-- RAG组 (${r.rag.latencyMs?.total}ms, 检索${r.rag.latencyMs?.retrieve}ms 重排${r.rag.latencyMs?.rerank}ms 生成${r.rag.latencyMs?.generate}ms, ${r.rag.usage?.calls}次调用, ${r.rag.usage?.total}tok) 上下文${r.rag.contextChars}字符`
  );
  console.log(
    `   使用片段: ${(r.rag.retrieved ?? []).map((x) => x.chunkId).join(",")}  引用: ${(r.rag.citations?.cited ?? []).join(",") || "无"}  无效: ${(r.rag.citations?.invalid ?? []).join(",") || "无"}  资料不足: ${r.rag.insufficient}`
  );
  console.log((r.rag.answer ?? "").replace(/\n{2,}/g, "\n"));
}
console.log("=".repeat(100));
console.log(JSON.stringify(j.summary, null, 2));
