import test from "node:test";
import assert from "node:assert/strict";
import { buildContext, buildMessages, PROMPT_V1, PROMPT_V2, PROMPT_DIRECT } from "../src/prompt.mjs";

const picked = [
  {
    chunkId: "K1-C07",
    docTitle: "移动互联网未成年人模式建设指南",
    issuer: "国家互联网信息办公室",
    effective: "2024-11-15",
    section: "（二）使用时长管理",
    text: "默认推荐使用总时长不超过1小时。"
  },
  {
    chunkId: "K5-C03",
    docTitle: "青盾需求摘要",
    issuer: "本项目组",
    effective: "2026-10-20",
    section: "报警分级",
    text: "每日软阈值 90 分钟。"
  }
];

test("上下文包含编号、来源、施行日期与正文", () => {
  const context = buildContext(picked);
  assert.match(context, /编号 K1-C07/);
  assert.match(context, /国家互联网信息办公室/);
  assert.match(context, /2024-11-15 施行/);
  assert.match(context, /默认推荐使用总时长不超过1小时/);
  assert.ok(context.indexOf("K1-C07") < context.indexOf("K5-C03"));
});

test("v1 与 v2 都把任务要求与用户问题分开", () => {
  const context = buildContext(picked);
  const v1 = buildMessages({ template: PROMPT_V1, question: "问题A", context });
  const v2 = buildMessages({ template: PROMPT_V2, question: "问题A", context });
  assert.ok(v1[0].content.includes("资料：") && v1[0].content.includes("问题：问题A"));
  assert.ok(v2[0].content.includes("【资料】") && v2[0].content.includes("【问题】"));
  assert.ok(PROMPT_V2.system.includes("只能使用【资料】中的内容回答"));
  assert.ok(PROMPT_V2.system.includes("资料不足"));
});

test("v2 的输出格式要求引用编号", () => {
  const context = buildContext(picked);
  const [msg] = buildMessages({ template: PROMPT_V2, question: "问题A", context });
  assert.match(msg.content, /\[资料编号\]/);
  assert.match(msg.content, /【输出格式】/);
});

test("多轮历史按顺序放在当前问题之前", () => {
  const history = [
    { role: "user", content: "第一轮问题" },
    { role: "assistant", content: "第一轮回答" }
  ];
  const messages = buildMessages({ template: PROMPT_V2, question: "第二轮问题", context: "ctx", history });
  assert.equal(messages.length, 3);
  assert.equal(messages[0].content, "第一轮问题");
  assert.equal(messages[1].role, "assistant");
  assert.ok(messages[2].content.includes("第二轮问题"));
});

test("直接模型组模板不含资料占位", () => {
  const [msg] = buildMessages({ template: PROMPT_DIRECT, question: "问题A" });
  assert.ok(!msg.content.includes("【资料】"));
  assert.ok(msg.content.includes("【问题】"));
});
