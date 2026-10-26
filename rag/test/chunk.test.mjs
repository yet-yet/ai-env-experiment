import test from "node:test";
import assert from "node:assert/strict";
import { splitBlocks, chunkDocument, chunkStats } from "../src/chunk.mjs";
import { loadKnowledge } from "../src/kb.mjs";

const doc = {
  docId: "T1",
  title: "测试资料",
  body: `## 一、总则

第一段内容。这里有两句话。

第二段内容，稍长一些，用来测试段落合并。再补一句让长度更接近目标值。

## 二、分则

### （一）细则

第三条　这是细则正文。第二条句子用于测试句子边界。
`
};

test("按标题切分为独立小节，三级标题保留上级标题", () => {
  const sections = splitBlocks(doc.body);
  assert.deepEqual(
    sections.map((s) => s.title),
    ["一、总则", "二、分则 › （一）细则"]
  );
});

test("片段不跨小节，且带编号与字符数", () => {
  const chunks = chunkDocument(doc, { targetChars: 60, maxChars: 120 });
  assert.ok(chunks.length >= 2);
  for (const c of chunks) {
    assert.match(c.chunkId, /^T1-C\d{2}$/);
    assert.equal(c.charLen, c.text.length);
  }
  const sections = new Set(chunks.map((c) => c.section));
  assert.ok(sections.has("一、总则"));
  assert.ok(sections.has("二、分则 › （一）细则"));
});

test("单段超过上限时按句子切分，不截断句子", () => {
  const long = { docId: "T2", title: "长段", body: `## 段\n\n${"这是一句测试文本。".repeat(40)}` };
  const chunks = chunkDocument(long, { targetChars: 100, maxChars: 200 });
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(c.charLen <= 220, `片段过长：${c.charLen}`);
    assert.ok(c.text.endsWith("。"), "片段应以句号结束");
  }
});

test("真实知识库：片段长度在设定范围内且不含乱码", () => {
  const { chunks } = loadKnowledge();
  assert.ok(chunks.length >= 20);
  const stats = chunkStats(chunks);
  assert.ok(stats.maxChars <= 780);
  for (const c of chunks) {
    assert.ok(!c.text.includes("\uFFFD"), `片段 ${c.chunkId} 含乱码`);
    assert.ok(c.text.trim().length > 0);
  }
});
