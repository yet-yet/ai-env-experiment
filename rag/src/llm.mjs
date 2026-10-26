// 模型调用客户端：超时、重试、错误分类，失败时返回结构化结果而不是抛异常给调用方
import { config, redactKey } from "./config.mjs";

export class LlmError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "LlmError";
    this.code = code; // CONFIG | NETWORK | TIMEOUT | AUTH | RATE_LIMIT | SERVER | BAD_REQUEST | EMPTY
    this.detail = detail;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function classifyStatus(status) {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMIT";
  if (status === 400 || status === 422) return "BAD_REQUEST";
  if (status >= 500) return "SERVER";
  return "SERVER";
}

function retryable(code) {
  return code === "TIMEOUT" || code === "NETWORK" || code === "RATE_LIMIT" || code === "SERVER";
}

/** 兼容 Anthropic Messages 协议的原始 HTTP 调用 */
async function requestOnce({ system, messages, maxTokens, temperature }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const body = {
    model: config.model,
    max_tokens: maxTokens,
    messages
  };
  if (system) body.system = system;
  if (temperature !== null) body.temperature = temperature;

  const startedAt = process.hrtime.bigint();
  try {
    const res = await fetch(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": config.anthropicVersion
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const message = json?.error?.message ?? text.slice(0, 300);
      throw new LlmError(classifyStatus(res.status), `接口返回 ${res.status}：${message}`, {
        status: res.status,
        latencyMs
      });
    }
    const content = Array.isArray(json?.content)
      ? json.content.filter((p) => p.type === "text").map((p) => p.text).join("")
      : "";
    if (!content.trim()) throw new LlmError("EMPTY", "接口返回空内容", { status: res.status, latencyMs });
    return {
      text: content,
      usage: {
        input: json?.usage?.input_tokens ?? 0,
        output: json?.usage?.output_tokens ?? 0,
        thinking: json?.usage?.output_tokens_details?.thinking_tokens ?? 0
      },
      model: json?.model ?? config.model,
      latencyMs,
      stopReason: json?.stop_reason ?? null
    };
  } catch (err) {
    if (err instanceof LlmError) throw err;
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (err.name === "AbortError") {
      throw new LlmError("TIMEOUT", `请求超过 ${config.timeoutMs} ms 未返回，已中止`, { latencyMs });
    }
    throw new LlmError("NETWORK", `网络请求失败：${err.message}`, { latencyMs, cause: String(err.cause ?? "") });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用模型，带重试。
 * @returns {Promise<{ok:true,text,usage,model,latencyMs,attempts}|{ok:false,code,message,detail,attempts}>}
 */
export async function callModel({ system, messages, maxTokens = config.maxTokens, temperature = config.temperature, retries = config.maxRetries }) {
  if (!config.apiKey) {
    return { ok: false, code: "CONFIG", message: "未配置 LLM_API_KEY", detail: { key: redactKey() }, attempts: 0 };
  }
  if (temperature === null) temperature = undefined;
  let last = null;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const result = await requestOnce({ system, messages, maxTokens, temperature: temperature ?? null });
      return { ok: true, ...result, attempts: attempt };
    } catch (err) {
      last = err;
      const code = err instanceof LlmError ? err.code : "SERVER";
      const detail = { ...(err.detail ?? {}), message: err.message, code };
      if (!retryable(code) || attempt > retries) {
        return { ok: false, code, message: err.message, detail, attempts: attempt };
      }
      await sleep(600 * attempt);
    }
  }
  return { ok: false, code: "SERVER", message: last?.message ?? "未知错误", detail: {}, attempts: retries + 1 };
}

/** 仅取文本的便捷封装；失败抛出带 code 的错误，便于上层快速失败 */
export async function callModelOrThrow(options) {
  const res = await callModel(options);
  if (!res.ok) throw new LlmError(res.code, res.message, res.detail);
  return res;
}

export const describeConfig = () => ({
  baseUrl: config.baseUrl,
  model: config.model,
  key: redactKey(),
  timeoutMs: config.timeoutMs,
  maxRetries: config.maxRetries,
  maxTokens: config.maxTokens,
  temperature: config.temperature
});
