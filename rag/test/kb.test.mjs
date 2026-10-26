import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadKnowledge, parseFrontMatter } from "../src/kb.mjs";

const META = `---
docId: TX
title: 临时资料
issuer: 测试
sourceUrl: https://example.com
retrieved: 2026-10-26
permission: 可引用
privacy: 无个人信息
---
`;

test("元数据解析：分隔符与字段", () => {
  const { meta, body, hasFrontMatter } = parseFrontMatter(`${META}\n正文内容。\n`);
  assert.equal(hasFrontMatter, true);
  assert.equal(meta.docId, "TX");
  assert.equal(body.trim(), "正文内容。");
});

test("剔除导航与版权等无关行", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-"));
  fs.writeFileSync(
    path.join(dir, "a.md"),
    `${META}\n## 正文\n\n有效内容一句话。\n\n版权所有 京ICP备00000000号\n主办单位：测试\n推荐阅读\n`,
    "utf8"
  );
  const { docs, issues } = loadKnowledge({ dir });
  assert.equal(docs.length, 1);
  assert.ok(!docs[0].body.includes("京ICP备"));
  assert.equal(issues.noiseLines.length, 3);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("元数据缺失的文件被跳过并记录", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-"));
  fs.writeFileSync(path.join(dir, "b.md"), "## 无元数据\n\n正文。\n", "utf8");
  const { docs, issues } = loadKnowledge({ dir });
  assert.equal(docs.length, 0);
  assert.equal(issues.missingMeta.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("正文完全相同的资料只保留一份", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-"));
  const body = `${META}\n## 正文\n\n重复的正文内容，用于测试去重。\n`;
  fs.writeFileSync(path.join(dir, "c1.md"), body, "utf8");
  fs.writeFileSync(path.join(dir, "c2.md"), body.replace("docId: TX", "docId: TY"), "utf8");
  const { docs, issues } = loadKnowledge({ dir });
  assert.equal(docs.length, 1);
  assert.equal(issues.duplicates.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("真实知识库：5 份资料、元数据齐全、无乱码", () => {
  const { docs, stats } = loadKnowledge();
  assert.equal(docs.length, 5);
  assert.equal(stats.issues.missingMeta.length, 0);
  assert.equal(stats.issues.garbled.length, 0);
  for (const d of docs) {
    assert.ok(d.sourceUrl.startsWith("http") || d.sourceUrl.includes("本仓库"), d.docId);
    assert.ok(d.permission.length > 0);
    assert.ok(d.privacy.length > 0);
  }
});
