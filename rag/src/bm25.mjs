// BM25 关键词打分 + TF-IDF 余弦（同一分词空间）
import { tokenize } from "./tokenize.mjs";

const idfOf = (N, df) => Math.log(1 + (N - df + 0.5) / (df + 0.5));

/** 建立倒排索引：一次分词，供 BM25 与向量模型共用 */
export function buildIndex(chunks) {
  const tokensList = chunks.map((c) => tokenize(`${c.docTitle ?? ""}\n${c.text}`));
  const N = chunks.length;
  const df = new Map();
  const postings = new Map(); // token -> Map(chunkIdx -> tf)
  tokensList.forEach((tokens, i) => {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [t, c] of tf) {
      df.set(t, (df.get(t) ?? 0) + 1);
      if (!postings.has(t)) postings.set(t, new Map());
      postings.get(t).set(i, c);
    }
  });
  const lengths = tokensList.map((t) => t.length);
  const avgdl = lengths.reduce((a, b) => a + b, 0) / (N || 1);

  // TF-IDF 向量（子线性词频 + L2 归一化）
  const vectors = tokensList.map((tokens, i) => {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const vec = new Map();
    for (const [t, c] of tf) {
      const w = (1 + Math.log(c)) * idfOf(N, df.get(t) ?? 0);
      if (w > 0) vec.set(t, w);
    }
    let norm = 0;
    for (const w of vec.values()) norm += w * w;
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of vec) vec.set(t, w / norm);
    return vec;
  });

  return { chunks, tokensList, N, df, postings, lengths, avgdl, vectors };
}

/** BM25：返回每个片段的分数（与 chunks 下标对齐） */
export function bm25Scores(index, queryTokens, { k1 = 1.5, b = 0.75 } = {}) {
  const scores = new Float64Array(index.N);
  const qCount = new Map();
  for (const t of queryTokens) qCount.set(t, (qCount.get(t) ?? 0) + 1);
  for (const [t, qtf] of qCount) {
    const posting = index.postings.get(t);
    if (!posting) continue;
    const idf = idfOf(index.N, index.df.get(t) ?? 0);
    for (const [i, tf] of posting) {
      const dl = index.lengths[i];
      const norm = 1 - b + (b * dl) / (index.avgdl || 1);
      scores[i] += idf * ((tf * (k1 + 1)) / (tf + k1 * norm)) * Math.min(qtf, 3);
    }
  }
  return Array.from(scores);
}

/** TF-IDF 余弦相似度：查询向量使用同一套 idf */
export function cosineScores(index, queryTokens) {
  const qCount = new Map();
  for (const t of queryTokens) qCount.set(t, (qCount.get(t) ?? 0) + 1);
  const qvec = new Map();
  for (const [t, c] of qCount) {
    const df = index.df.get(t) ?? 0;
    if (!df) continue; // 未登录词不参与向量（对关键词检索仍可见）
    const w = (1 + Math.log(c)) * idfOf(index.N, df);
    if (w > 0) qvec.set(t, w);
  }
  let qnorm = 0;
  for (const w of qvec.values()) qnorm += w * w;
  qnorm = Math.sqrt(qnorm) || 1;
  const scores = new Float64Array(index.N);
  if (!qvec.size) return Array.from(scores);
  for (const [t, w] of qvec) {
    const posting = index.postings.get(t);
    if (!posting) continue;
    const qw = w / qnorm;
    for (const [i, tf] of posting) {
      const dv = index.vectors[i].get(t) ?? 0;
      scores[i] += qw * dv;
    }
  }
  return Array.from(scores);
}

export { idfOf };
