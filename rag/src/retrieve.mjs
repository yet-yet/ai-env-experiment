// 检索：关键词(BM25) + 向量(TF-IDF 余弦) 混合排序，含相关性门槛与“模型判断”重排
import { buildIndex, bm25Scores, cosineScores, idfOf } from "./bm25.mjs";
import { tokenize } from "./tokenize.mjs";
import { config } from "./config.mjs";

const CLAUSE_RE = /第[一二三四五六七八九十百零〇]+条/;

export function createRetriever(chunks, options = {}) {
  const index = buildIndex(chunks);
  return {
    index,
    chunks,
    search: (query, opts = {}) => search(index, chunks, query, { ...options, ...opts })
  };
}

/**
 * 混合检索。
 * 排序依据：hybrid = w1 * BM25归一化 + w2 * TF-IDF余弦。
 * 相关性判定（两道门槛，任一不满足即视为不相关）：
 *   ① hybrid ≥ minHybrid（经抽查片段标定的相似度阈值）
 *   ② 关键词重合数 ≥ minKeywordOverlap（按词语匹配）
 * 例外：问题里出现“第X条”，且片段正文含该条款号时，直接判为相关（条款锚点）。
 */
export function search(index, chunks, query, opts = {}) {
  const {
    candidates = config.candidates,
    minCoverageIdf = config.minCoverageIdf,
    minKeywordOverlap = config.minKeywordOverlap,
    weightBm25 = config.weightBm25,
    weightVector = config.weightVector,
    bm25 = config.bm25
  } = opts;

  const queryTokens = tokenize(query);
  const rawBm25 = bm25Scores(index, queryTokens, bm25);
  const rawCos = cosineScores(index, queryTokens);
  const bm25Max = Math.max(...rawBm25, 1e-9);
  const querySet = new Set(queryTokens);
  const clauseQuery = query.match(CLAUSE_RE)?.[0] ?? null;
  // 查询实词（长度≥2 或含数字）及其 IDF 权重：用于计算“按信息量加权”的覆盖度
  const realQueryTokens = [...querySet].filter((t) => t.length >= 2 || /\d/.test(t));
  const queryIdfTotal = realQueryTokens.reduce((a, t) => a + (index.df.get(t) ? idfOf(index.N, index.df.get(t)) : 0), 0) || 1;

  const scored = chunks.map((chunk, i) => {
    const chunkTokens = index.tokensList[i];
    const chunkSet = new Set(chunkTokens);
    const overlapTokens = [...querySet].filter((t) => chunkSet.has(t));
    // 关键词重合只统计“实词”token（长度≥2 或含数字），避免单字噪声
    const realMatched = overlapTokens.filter((t) => t.length >= 2 || /\d/.test(t));
    const overlap = realMatched.length;
    const matchedIdf = realMatched.reduce((a, t) => a + (index.df.get(t) ? idfOf(index.N, index.df.get(t)) : 0), 0);
    const coverageIdf = matchedIdf / queryIdfTotal;
    const bm25n = rawBm25[i] / bm25Max;
    const cosine = rawCos[i];
    const hybrid = weightBm25 * bm25n + weightVector * cosine;
    const clauseHit = Boolean(clauseQuery && chunk.text.includes(clauseQuery));
    // 两级判定：
    //   relevant       = 关键词预筛（实词命中数达标），用于决定哪些片段进入模型判断；
    //   strongRelevant = 预筛 + 加权覆盖度达标，用于“模型判断不可用”时的回退判定。
    const relevant = clauseHit || overlap >= minKeywordOverlap;
    const strongRelevant = clauseHit || (overlap >= minKeywordOverlap && coverageIdf >= minCoverageIdf);
    return {
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      docTitle: chunk.docTitle,
      issuer: chunk.issuer,
      effective: chunk.effective,
      sourceUrl: chunk.sourceUrl,
      permission: chunk.permission,
      section: chunk.section,
      text: chunk.text,
      charLen: chunk.charLen,
      bm25raw: Number(rawBm25[i].toFixed(4)),
      bm25norm: Number(bm25n.toFixed(4)),
      cosine: Number(cosine.toFixed(4)),
      hybrid: Number(hybrid.toFixed(4)),
      overlap,
      coverageIdf: Number(coverageIdf.toFixed(4)),
      clauseHit,
      relevant,
      strongRelevant,
      matchedTerms: realMatched
        .sort((a, b) => (index.df.get(a) ?? 0) - (index.df.get(b) ?? 0))
        .slice(0, 8)
    };
  });

  const sorted = scored
    .filter((s) => s.hybrid > 0 || s.clauseHit)
    .sort((a, b) => b.hybrid - a.hybrid || b.overlap - a.overlap)
    .slice(0, candidates)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const accepted = sorted.filter((s) => s.relevant);
  const acceptedStrong = sorted.filter((s) => s.strongRelevant);
  const gate = {
    queryTokens: [...querySet],
    realQueryTokens,
    candidates: sorted.length,
    accepted: accepted.length,
    acceptedStrong: acceptedStrong.length,
    minCoverageIdf,
    minKeywordOverlap,
    insufficient: accepted.length === 0,
    reason: accepted.length
      ? null
      : sorted.length === 0
        ? "没有任何片段命中查询词"
        : `命中的实词不足 ${minKeywordOverlap} 个（最高片段命中 ${sorted[0].overlap} 个），未达到相关性要求`
  };
  return { queryTokens, hits: sorted, accepted, acceptedStrong, gate };
}

/**
 * “模型判断”重排：让模型在候选中挑出真正能支撑回答的片段。
 * 失败（网络/解析）时回退到词法排序，并在结果中标记 fallback。
 */
export async function rerankWithModel(candidates, question, callModel) {
  if (candidates.length <= 1) return { ids: candidates.map((c) => c.chunkId), fallback: false, raw: null, usage: null };
  const list = candidates
    .map((c, i) => `${i + 1}. 编号 ${c.chunkId}｜《${c.docTitle}》｜小节：${c.section}\n   ${c.text.replace(/\s+/g, " ").slice(0, 240)}`)
    .join("\n");
  const prompt = `下面是用户问题与候选资料片段。请判断“该片段是否包含回答问题所需的**部分或全部**信息”，不要回答问题本身。
判断要求：
1. 问题包含多个方面（例如同时问“规定是什么”“有什么不同”“需要什么前提”）时，每个方面对应的片段都应判为相关，多个片段可以共同支撑一个回答；
2. 只要片段含有与问题直接相关的规定、数字、定义或设计约束，就判为相关；只是话题相近但答不出问题的片段判为不相关；
3. 拿不准时倾向于保留（判为相关），由后续生成环节决定如何使用，不要因为片段只覆盖一部分就丢弃。
用户问题：${question}
候选片段：
${list}
只输出 JSON，不要解释，格式：{"relevant":[{"no":序号,"score":0到1}],"reason":"一句话"}
没有任何片段可用时输出 {"relevant":[],"reason":"..."}。`;
  const res = await callModel({
    system: "你是资料相关性判断器，只输出 JSON。",
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1200,
    temperature: 0
  });
  if (!res.ok) return { ids: candidates.map((c) => c.chunkId), fallback: true, error: res.message, usage: null, raw: null };
  const text = res.text.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let parsed = null;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    parsed = null;
  }
  if (!parsed || !Array.isArray(parsed.relevant)) {
    return { ids: candidates.map((c) => c.chunkId), fallback: true, error: "返回内容不是可解析的 JSON", usage: res.usage, raw: text.slice(0, 400) };
  }
  const picked = parsed.relevant
    .filter((r) => Number.isFinite(Number(r.no)) && Number(r.score) >= 0.5)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((r) => candidates[Number(r.no) - 1]?.chunkId)
    .filter(Boolean);
  return {
    ids: picked,
    fallback: false,
    reason: parsed.reason ?? "",
    usage: res.usage,
    latencyMs: res.latencyMs,
    raw: text.slice(0, 400)
  };
}
