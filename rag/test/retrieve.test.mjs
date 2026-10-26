import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledge } from "../src/kb.mjs";
import { createRetriever } from "../src/retrieve.mjs";

const { chunks } = loadKnowledge();
const retriever = createRetriever(chunks);

test("时间类问题：使用时长片段排第一，且通过相关性判定", () => {
  const found = retriever.search("不满16周岁的用户，未成年人模式默认每天能用多长时间？连续使用多久要发出休息提醒？");
  assert.equal(found.hits[0].chunkId, "K1-C07");
  assert.equal(found.hits[0].relevant, true);
  assert.equal(found.gate.insufficient, false);
});

test("条款号可以定位到具体片段（条款锚点）", () => {
  const found = retriever.search("第二十三条 可能影响未成年人身心健康的信息 提示");
  const top = found.hits[0];
  assert.ok(top.text.includes("第二十三条"));
  assert.equal(top.clauseHit, true);
});

test("超出范围的查询在关键词预筛阶段即被拦下，不调用模型", () => {
  const found = retriever.search("帮我写一段 Python 爬虫，抓取某短视频平台的推荐流视频。");
  assert.equal(found.gate.insufficient, true);
  assert.equal(found.accepted.length, 0);
});

test("排序依据可解释：混合分单调不增，且给出命中词", () => {
  const found = retriever.search("兴趣标签 家长可见性 年龄");
  const hybrids = found.hits.map((h) => h.hybrid);
  const sorted = [...hybrids].sort((a, b) => b - a);
  assert.deepEqual(hybrids, sorted);
  assert.ok(found.hits[0].matchedTerms.length > 0);
  assert.ok(found.hits[0].coverageIdf >= 0 && found.hits[0].coverageIdf <= 1);
});

test("k 的取值不超过候选数，且片段编号唯一", () => {
  const found = retriever.search("未成年人模式", { candidates: 5 });
  assert.ok(found.hits.length <= 5);
  const ids = new Set(found.hits.map((h) => h.chunkId));
  assert.equal(ids.size, found.hits.length);
});
