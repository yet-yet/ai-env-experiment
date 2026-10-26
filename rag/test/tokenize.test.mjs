import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, splitSentences, normalize } from "../src/tokenize.mjs";

test("领域词按整词切分，而不是拆成单字", () => {
  const tokens = tokenize("未成年人模式下的个人信息");
  assert.ok(tokens.includes("未成年人模式"));
  assert.ok(tokens.includes("个人信息"));
});

test("数量与单位合并成一个词元", () => {
  const tokens = tokenize("连续使用超过30分钟要提醒");
  assert.ok(tokens.includes("30分钟"));
});

test("条款号被识别为独立词元", () => {
  const tokens = tokenize("依据第二十八条的规定");
  assert.ok(tokens.includes("第二十八条"));
});

test("停用词被过滤，数字保留", () => {
  const tokens = tokenize("的了和与16");
  assert.deepEqual(tokens, ["16"]);
});

test("全角与大小写归一化", () => {
  assert.equal(normalize("ＡＰＰ　Ｓｔｏｒｅ"), "app store");
});

test("句子切分保留句末标点", () => {
  const sentences = splitSentences("第一句。第二句；第三句！");
  assert.deepEqual(sentences, ["第一句。", "第二句；", "第三句！"]);
});
