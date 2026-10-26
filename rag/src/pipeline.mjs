// RAG 最小链路：问题输入 → 检索 → 上下文组织 → 模型调用 → 回答返回（含出处校验）
import { config } from "./config.mjs";
import { callModel } from "./llm.mjs";
import { loadChunks, buildKnowledgeBase } from "./kb.mjs";
import { createRetriever, rerankWithModel } from "./retrieve.mjs";
import { buildContext, buildMessages, PROMPT_V1, PROMPT_V2, PROMPT_DIRECT } from "./prompt.mjs";

const CITATION_RE = /\[(K\d+-C\d+)\]/g;

/** 从回答里抽取引用编号，并检查是否对应本次提供的片段 */
export function extractCitations(answer, providedChunks) {
  const provided = new Set(providedChunks.map((c) => c.chunkId));
  const cited = [];
  for (const m of String(answer).matchAll(CITATION_RE)) {
    if (!cited.includes(m[1])) cited.push(m[1]);
  }
  const checkable = provided.size > 0;
  return {
    cited,
    // 没有提供片段（直接模型组）时无法比对，不计为无效引用
    invalid: checkable ? cited.filter((id) => !provided.has(id)) : [],
    usedProvided: cited.filter((id) => provided.has(id)),
    hasCitation: cited.length > 0,
    checkable
  };
}

let shared = null;

/** 取得（并缓存）检索器；知识库文件更新后调用 resetRetriever() */
export function getRetriever(options = {}) {
  if (!shared) {
    let chunks = loadChunks();
    if (!chunks.length) chunks = buildKnowledgeBase().chunks;
    shared = createRetriever(chunks, options);
  }
  return shared;
}

export function resetRetriever() {
  shared = null;
}

/**
 * 完整 RAG 问答。
 * @returns 结构化结果；失败时 ok=false，附带 stage 与错误码，便于上层降级
 */
export async function askRag({
  question,
  history = [],
  topK = config.topK,
  useRerank = config.useRerank,
  template = PROMPT_V2,
  retriever,
  call = callModel
}) {
  const startedAt = Date.now();
  const rt = retriever ?? getRetriever();
  const t0 = Date.now();
  const found = rt.search(question);
  const retrieveMs = Date.now() - t0;

  if (found.gate.insufficient) {
    // 检索阶段没有任何片段命中：不直接拒绝，而是把“没有资料”这一事实交给模型，
    // 由模型区分“缺少必要信息（应追问）”“超出范围（应说明无法处理）”“资料不足”三种情况。
    const emptyNotice = "（本次检索未命中任何资料片段：知识库中没有与该问题直接相关的内容。）";
    const messages = buildMessages({ template, question, context: emptyNotice, history });
    const t0i = Date.now();
    const res = await call({ system: template.system, messages });
    const generateMs = Date.now() - t0i;
    const fallbackAnswer = `资料不足：知识库中没有检索到与该问题相关的片段（${found.gate.reason}）。`;
    return {
      ok: res.ok,
      group: "rag",
      question,
      answer: res.ok ? res.text : fallbackAnswer,
      insufficient: true,
      stage: res.ok ? undefined : "generate",
      code: res.ok ? undefined : res.code,
      retrieval: { hits: found.hits, accepted: [], acceptedStrong: [], gate: found.gate, rerank: { skipped: true }, emptyRetrieval: true },
      context: "",
      prompt: { system: template.system, messages },
      citations: { cited: [], invalid: [], hasCitation: false, checkable: true },
      usage: res.ok ? { input: res.usage.input, output: res.usage.output, thinking: res.usage.thinking ?? 0, total: res.usage.input + res.usage.output, calls: 1 } : { input: 0, output: 0, total: 0, calls: 1 },
      model: res.ok ? res.model : null,
      truncated: res.ok ? res.stopReason === "max_tokens" : null,
      latencyMs: { retrieve: retrieveMs, rerank: 0, generate: generateMs, total: Date.now() - startedAt }
    };
  }

  let rerank = { ids: found.hits.map((c) => c.chunkId), fallback: false, skipped: true };
  let rerankMs = 0;
  let extraCalls = 0;
  if (useRerank) {
    const t1 = Date.now();
    rerank = await rerankWithModel(found.hits, question, call);
    rerankMs = Date.now() - t1;
    extraCalls = 1;
  }

  // 模型判断可用时由它决定“哪些片段真的支持回答”，判定为空即资料不足；
  // 判断失败（fallback）或关闭重排时，回退到“关键词命中 + 加权覆盖度”的阈值判定。
  const useModelJudgement = useRerank && !rerank.fallback;
  const order = useModelJudgement ? rerank.ids : found.accepted.map((c) => c.chunkId);
  const picked = [];
  for (const id of order) {
    const hit = found.hits.find((h) => h.chunkId === id);
    if (!hit) continue;
    if (!useModelJudgement && !hit.strongRelevant) continue;
    if (!picked.some((p) => p.chunkId === id)) picked.push(hit);
    if (picked.length >= topK) break;
  }
  // 词法兜底：模型判断可能漏掉词法上最相关的片段（实测 Q3 漏掉了青盾自身的片段），
  // 因此当模型已经选中了至少一个片段、但没选中词法第一名时，把它一并放进上下文。
  // 若模型判定“全部不相关”，则尊重该结论，返回资料不足（不兜底），避免无答案的问题被硬答。
  const lexicalTop = found.acceptedStrong[0];
  if (useModelJudgement && rerank.ids.length && lexicalTop &&
      !picked.some((p) => p.chunkId === lexicalTop.chunkId) && picked.length < topK) {
    picked.push(lexicalTop);
  }
  if (!picked.length) {
    return {
      ok: true,
      group: "rag",
      question,
      answer: useModelJudgement
        ? "资料不足：候选片段经模型判断均不含回答该问题所需的信息，知识库没有覆盖这个问题。"
        : `资料不足：检索到的片段未达到相关性门槛（${found.gate.reason ?? "关键词覆盖度不足"}）。`,
      insufficient: true,
      retrieval: { hits: found.hits, accepted: [], acceptedStrong: found.acceptedStrong, gate: found.gate, rerank },
      context: "",
      citations: { cited: [], invalid: [], hasCitation: false },
      usage: { input: 0, output: 0, total: 0, calls: extraCalls },
      model: null,
      latencyMs: { retrieve: retrieveMs, rerank: rerankMs, generate: 0, total: Date.now() - startedAt }
    };
  }

  const context = buildContext(picked);
  const messages = buildMessages({ template, question, context, history });
  const t2 = Date.now();
  const res = await call({ system: template.system, messages });
  const generateMs = Date.now() - t2;

  if (!res.ok) {
    return {
      ok: false,
      group: "rag",
      stage: "generate",
      code: res.code,
      message: res.message,
      question,
      retrieval: { hits: found.hits, accepted: picked, gate: found.gate, rerank },
      context,
      prompt: { system: template.system, messages },
      attempts: res.attempts,
      latencyMs: { retrieve: retrieveMs, rerank: rerankMs, generate: generateMs, total: Date.now() - startedAt }
    };
  }

  return {
    ok: true,
    group: "rag",
    question,
    answer: res.text,
    insufficient: false,
    truncated: res.stopReason === "max_tokens",
    stopReason: res.stopReason,
    retrieval: { hits: found.hits, accepted: picked, used: picked.map((c) => c.chunkId), acceptedStrong: found.acceptedStrong, gate: found.gate, rerank },
    context,
    prompt: { system: template.system, messages },
    citations: extractCitations(res.text, picked),
    usage: {
      input: res.usage.input,
      output: res.usage.output,
      thinking: res.usage.thinking ?? 0,
      total: res.usage.input + res.usage.output,
      calls: 1 + extraCalls
    },
    model: res.model,
    latencyMs: { retrieve: retrieveMs, rerank: rerankMs, generate: generateMs, total: Date.now() - startedAt }
  };
}

/** 直接模型组：同一模型、同一参数、同一输出格式，但不提供检索资料 */
export async function askDirect({ question, history = [], template = PROMPT_DIRECT, call = callModel }) {
  const startedAt = Date.now();
  const messages = buildMessages({ template, question, history });
  const t0 = Date.now();
  const res = await call({ system: template.system, messages });
  const generateMs = Date.now() - t0;
  if (!res.ok) {
    return {
      ok: false,
      group: "direct",
      stage: "generate",
      code: res.code,
      message: res.message,
      question,
      attempts: res.attempts,
      latencyMs: { retrieve: 0, rerank: 0, generate: generateMs, total: Date.now() - startedAt }
    };
  }
  return {
    ok: true,
    group: "direct",
    question,
    answer: res.text,
    truncated: res.stopReason === "max_tokens",
    stopReason: res.stopReason,
    retrieval: null,
    context: "",
    prompt: { system: template.system, messages },
    citations: extractCitations(res.text, []),
    usage: {
      input: res.usage.input,
      output: res.usage.output,
      thinking: res.usage.thinking ?? 0,
      total: res.usage.input + res.usage.output,
      calls: 1
    },
    model: res.model,
    latencyMs: { retrieve: 0, rerank: 0, generate: generateMs, total: Date.now() - startedAt }
  };
}

export { PROMPT_V1, PROMPT_V2, PROMPT_DIRECT };
