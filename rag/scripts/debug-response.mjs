// 调试：打印一次原始响应的结构与用量字段，确认是否有 thinking 块与截断
import { config } from "../src/config.mjs";

const body = {
  model: config.model,
  max_tokens: 300,
  temperature: 0,
  system: "你是助手，回答简短。",
  messages: [{ role: "user", content: "用三句话说明什么是未成年人模式。" }]
};
const res = await fetch(`${config.baseUrl}/v1/messages`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": config.apiKey,
    "anthropic-version": config.anthropicVersion
  },
  body: JSON.stringify(body)
});
const json = await res.json();
console.log("status", res.status);
console.log("stop_reason", json.stop_reason);
console.log("usage", JSON.stringify(json.usage));
console.log("content blocks", json.content?.map((c) => ({ type: c.type, len: (c.text ?? c.thinking ?? "").length })));
console.log("text", json.content?.filter((c) => c.type === "text").map((c) => c.text).join("").slice(0, 400));
