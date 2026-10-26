// 配置与密钥读取：优先环境变量，其次 rag/.env.local（该文件被 .gitignore 忽略）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
export const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
export const DATA_DIR = path.join(ROOT, "data");
export const RUNS_DIR = path.join(ROOT, "runs");

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(path.join(ROOT, ".env.local"));

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  // ---- 模型服务 ----
  baseUrl: (process.env.LLM_BASE_URL ?? "https://api.a6api.com").replace(/\/+$/, ""),
  model: process.env.LLM_MODEL ?? "claude-opus-5-5",
  apiKey: process.env.LLM_API_KEY ?? "",
  anthropicVersion: process.env.LLM_ANTHROPIC_VERSION ?? "2023-06-01",
  timeoutMs: num(process.env.LLM_TIMEOUT_MS, 60000),
  maxRetries: num(process.env.LLM_MAX_RETRIES, 2),
  maxTokens: num(process.env.LLM_MAX_TOKENS, 2500),
  temperature: num(process.env.LLM_TEMPERATURE, 0),

  // ---- 检索 ----
  candidates: num(process.env.RAG_CANDIDATES, 8), // 进入重排的候选数
  topK: num(process.env.RAG_TOPK, 4), // 最终进入上下文的片段数
  minCoverageIdf: num(process.env.RAG_MIN_COVERAGE_IDF, 0.3), // 相关性阈值（按IDF加权的关键词覆盖度，经抽查标定）
  minKeywordOverlap: num(process.env.RAG_MIN_KEYWORD_OVERLAP, 2), // 关键词命中个数门槛
  bm25: { k1: 1.5, b: 0.75 },
  weightBm25: num(process.env.RAG_W_BM25, 0.65),
  weightVector: num(process.env.RAG_W_VECTOR, 0.35),
  chunk: { targetChars: num(process.env.RAG_CHUNK_TARGET, 520), maxChars: num(process.env.RAG_CHUNK_MAX, 780), overlapChars: 0 },
  useRerank: process.env.RAG_RERANK !== "0"
};

export function assertConfigured() {
  const missing = [];
  if (!config.apiKey) missing.push("LLM_API_KEY");
  if (!config.model) missing.push("LLM_MODEL");
  if (!config.baseUrl) missing.push("LLM_BASE_URL");
  if (missing.length) {
    throw new Error(`缺少配置：${missing.join("、")}。请复制 .env.example 为 .env.local 并填写。`);
  }
}

export function redactKey(key = config.apiKey) {
  if (!key) return "(未配置)";
  if (key.length <= 10) return "***";
  return `${key.slice(0, 6)}…${key.slice(-4)}（共 ${key.length} 字符）`;
}
