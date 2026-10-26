import test from "node:test";
import assert from "node:assert/strict";
import { extractCitations, askRag, askDirect } from "../src/pipeline.mjs";
import { loadKnowledge } from "../src/kb.mjs";
import { createRetriever } from "../src/retrieve.mjs";

const { chunks } = loadKnowledge();
const retriever = createRetriever(chunks);

// 用一个不联网的假模型替代真实调用，验证链路的编排与失败分支
function stubCall({ rerankPick = ["K1-C07"], answer = "结论：不超过1小时 [K1-C07]", fail = null } = {}) {
  return async ({ system, messages }) => {
    const isRerank = String(system).includes("相关性判断器");
    if (isRerank) {
      // 从重排提示里取出候选顺序，把“想要的编号”换算成序号
      const listed = [...String(messages[0].content).matchAll(/(\d+)\. 编号 (K\d+-C\d+)/g)].map((m) => ({
        no: Number(m[1]),
        id: m[2]
      }));
      const relevant = listed.filter((x) => rerankPick.includes(x.id)).map((x) => ({ no: x.no, score: 1 }));
      return {
        ok: true,
        text: JSON.stringify({ relevant, reason: "stub" }),
        usage: { input: 10, output: 5 },
        model: "stub",
        latencyMs: 1
      };
    }
    if (fail) return { ok: false, code: fail, message: "模拟失败", attempts: 1 };
    return { ok: true, text: answer, usage: { input: 100, output: 20 }, model: "stub", latencyMs: 1 };
  };
}

test("完整链路：检索→上下文→生成→引用校验", async () => {
  const res = await askRag({
    question: "不满16周岁的用户，未成年人模式默认每天能用多长时间？",
    retriever,
    call: stubCall()
  });
  assert.equal(res.ok, true);
  assert.equal(res.insufficient, false);
  assert.ok(res.context.includes("K1-C07"));
  assert.deepEqual(res.citations.cited, ["K1-C07"]);
  assert.equal(res.citations.invalid.length, 0);
  assert.equal(res.usage.calls, 2); // 1 次重排 + 1 次生成
  assert.ok(res.latencyMs.total >= 0);
});

test("模型判断为空时返回资料不足，不再生成回答", async () => {
  const res = await askRag({
    question: "青盾 iOS 正式版什么时候发布？",
    retriever,
    call: stubCall({ rerankPick: [] })
  });
  assert.equal(res.ok, true);
  assert.equal(res.insufficient, true);
  assert.match(res.answer, /资料不足/);
  assert.equal(res.usage.calls, 1); // 只有重排调用，没有生成调用
});

test("生成阶段失败时返回结构化错误，保留检索结果", async () => {
  const res = await askRag({
    question: "不满16周岁的用户，未成年人模式默认每天能用多长时间？",
    retriever,
    call: stubCall({ fail: "TIMEOUT" })
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, "TIMEOUT");
  assert.equal(res.stage, "generate");
  assert.ok(res.retrieval.accepted.length > 0);
  assert.ok(res.context.length > 0);
});

test("关键词预筛失败时不做检索性生成，但仍让模型判断是追问还是超范围", async () => {
  let called = 0;
  let sawEmpty = false;
  const res = await askRag({
    question: "帮我写一段 Python 爬虫抓取视频。",
    retriever,
    call: async ({ system, messages }) => {
      called += 1;
      if (String(messages[0].content).includes("未命中任何资料片段")) sawEmpty = true;
      return { ok: true, text: "无法处理：这个问题超出知识库范围。", usage: { input: 10, output: 8 }, model: "stub", latencyMs: 1, stopReason: "end_turn" };
    }
  });
  assert.equal(called, 1);
  assert.equal(sawEmpty, true);
  assert.equal(res.insufficient, true);
  assert.equal(res.retrieval.emptyRetrieval, true);
  assert.equal(res.context, "");
});

test("直接模型组不检索、不做引用校验", async () => {
  const res = await askDirect({ question: "未成年人模式默认时长？", call: stubCall() });
  assert.equal(res.ok, true);
  assert.equal(res.retrieval, null);
  assert.equal(res.citations.cited[0], "K1-C07"); // 文本里出现也算，但未与片段比对
  assert.equal(res.citations.invalid.length, 0);
});

test("引用校验能识别无效编号", () => {
  const provided = [{ chunkId: "K1-C07" }];
  const result = extractCitations("结论 [K1-C07] 另外 [K9-C99]", provided);
  assert.deepEqual(result.cited, ["K1-C07", "K9-C99"]);
  assert.deepEqual(result.invalid, ["K9-C99"]);
});
