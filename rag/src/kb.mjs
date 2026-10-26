// 知识库装载：解析元数据、清理乱码/重复/无关内容、切分、产出可复现的统计报告
import fs from "node:fs";
import path from "node:path";
import { KNOWLEDGE_DIR, DATA_DIR, config } from "./config.mjs";
import { chunkDocument, chunkStats } from "./chunk.mjs";
import { normalize } from "./tokenize.mjs";

const REQUIRED_FIELDS = ["docId", "title", "issuer", "sourceUrl", "retrieved", "permission", "privacy"];

// 与资料主题无关的版式文字（导航、版权、备案号等），装载时剔除
const NOISE_RE = /(版权所有|免责声明|京ICP备|京公网安备|主办单位|网站标识码|推荐阅读|上一篇|下一篇|相关稿件|打印本页|字号：默认|扫一扫)/;

export function parseFrontMatter(raw) {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text, hasFrontMatter: false };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: text.slice(m[0].length), hasFrontMatter: true };
}

export function loadKnowledge(options = {}) {
  const dir = options.dir ?? KNOWLEDGE_DIR;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const docs = [];
  const issues = { missingMeta: [], garbled: [], noiseLines: [], duplicates: [], encoding: [] };

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { meta, body, hasFrontMatter } = parseFrontMatter(raw);
    const missing = REQUIRED_FIELDS.filter((f) => !meta[f]);
    if (!hasFrontMatter || missing.length) {
      issues.missingMeta.push({ file, missing, hasFrontMatter });
      continue;
    }
    // 乱码与控制字符检查
    const garbled = (raw.match(/\uFFFD/g) ?? []).length;
    const control = (raw.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;
    if (garbled || control) issues.garbled.push({ file, replacementChars: garbled, controlChars: control });

    const keptLines = [];
    for (const line of body.split("\n")) {
      if (NOISE_RE.test(line)) {
        issues.noiseLines.push({ file, line: line.trim().slice(0, 60) });
        continue;
      }
      keptLines.push(line);
    }
    const cleanBody = keptLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    docs.push({
      file,
      docId: meta.docId,
      title: meta.title,
      issuer: meta.issuer,
      docNumber: meta.docNumber ?? "",
      published: meta.published ?? "",
      effective: meta.effective ?? "",
      sourceUrl: meta.sourceUrl,
      retrieved: meta.retrieved,
      permission: meta.permission,
      privacy: meta.privacy,
      form: meta.form ?? "",
      body: cleanBody,
      bodyChars: cleanBody.length,
      rawChars: raw.length
    });
  }

  // 文档级重复：正文归一化后完全相同的资料只保留一份
  const seenDocs = new Map();
  const uniqueDocs = [];
  for (const doc of docs) {
    const key = normalize(doc.body).replace(/\s+/g, "");
    if (seenDocs.has(key)) {
      issues.duplicates.push({ level: "document", kept: seenDocs.get(key), dropped: doc.docId });
      continue;
    }
    seenDocs.set(key, doc.docId);
    uniqueDocs.push(doc);
  }

  // 切分
  const rawChunks = uniqueDocs.flatMap((doc) => chunkDocument(doc, config.chunk));

  // 片段级重复：归一化文本完全相同的片段只保留一份
  const seenChunks = new Map();
  const chunks = [];
  for (const chunk of rawChunks) {
    const key = normalize(chunk.text).replace(/\s+/g, "");
    if (seenChunks.has(key)) {
      issues.duplicates.push({ level: "chunk", kept: seenChunks.get(key), dropped: chunk.chunkId });
      continue;
    }
    seenChunks.set(key, chunk.chunkId);
    const doc = uniqueDocs.find((d) => d.docId === chunk.docId);
    chunks.push({
      ...chunk,
      docTitle: doc.title,
      issuer: doc.issuer,
      effective: doc.effective,
      sourceUrl: doc.sourceUrl,
      permission: doc.permission
    });
  }

  const stats = {
    generatedAt: new Date().toISOString(),
    docCount: uniqueDocs.length,
    chunkCount: chunks.length,
    bodyChars: uniqueDocs.reduce((a, d) => a + d.bodyChars, 0),
    chunk: chunkStats(chunks),
    perDoc: uniqueDocs.map((d) => ({
      docId: d.docId,
      title: d.title,
      issuer: d.issuer,
      effective: d.effective,
      form: d.form,
      bodyChars: d.bodyChars,
      chunks: chunks.filter((c) => c.docId === d.docId).length
    })),
    issues: {
      garbled: issues.garbled,
      noiseLinesRemoved: issues.noiseLines.length,
      duplicates: issues.duplicates,
      missingMeta: issues.missingMeta
    }
  };

  return { docs: uniqueDocs, chunks, stats, issues };
}

/** 装载并落盘 chunks.json / kb-report.json，供检索与报告引用 */
export function buildKnowledgeBase() {
  const { docs, chunks, stats } = loadKnowledge();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, "chunks.json"), JSON.stringify({ stats, chunks }, null, 2), "utf8");
  fs.writeFileSync(path.join(DATA_DIR, "kb-report.json"), JSON.stringify(stats, null, 2), "utf8");
  return { docs, chunks, stats };
}

export function loadChunks() {
  const file = path.join(DATA_DIR, "chunks.json");
  if (!fs.existsSync(file)) return buildKnowledgeBase().chunks;
  return JSON.parse(fs.readFileSync(file, "utf8")).chunks;
}
