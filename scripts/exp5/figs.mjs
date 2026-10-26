// 实验5 图表生成：SVG → Chrome 无头截图 → PNG；数据全部读自 runs/ 下的真实运行记录
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { C, box, text, arrow, band, svgWrap, renderPng, esc } from "../exp3/diagram-kit.mjs";

const ROOT = path.resolve("D:/work/软件应用开发");
const OUT = path.join(ROOT, "素材");
const RUNS = path.join(ROOT, "rag", "runs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// ---------- 渲染任意 HTML 为 PNG（终端输出截图用） ----------
function renderHtmlPng({ name, html, w, h, scale = 2 }) {
  const tmp = path.join(ROOT, ".figtmp");
  fs.mkdirSync(tmp, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  const htmlPath = path.join(tmp, `${name}.html`);
  const pngPath = path.join(OUT, `${name}.png`);
  fs.writeFileSync(htmlPath, html, "utf8");
  execFileSync(
    CHROME,
    [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--hide-scrollbars",
      `--user-data-dir=${path.join(tmp, "chrome-profile")}`,
      `--window-size=${w},${h}`,
      `--force-device-scale-factor=${scale}`,
      `--screenshot=${pngPath}`,
      `file:///${htmlPath.replace(/\\/g, "/")}`
    ],
    { stdio: "ignore", timeout: 120000 }
  );
  fs.rmSync(htmlPath, { force: true });
  return pngPath;
}

// ============ 图1：模型调用与失败处理 ============
function fig1() {
  const w = 940, h = 560;
  const b = [];
  b.push(band({ x: 24, y: 56, w: 892, h: 150, title: "调用侧（pipeline）", fill: "#f8fbfd" }));
  b.push(box({ x: 52, y: 96, w: 220, h: 76, text: ["askRag / askDirect"], sub: ["组装 system + messages", "选取模板 v1/v2"], fill: C.blue, edge: C.blueEdge }));
  b.push(box({ x: 312, y: 96, w: 250, h: 76, text: ["callModel()"], sub: ["max_tokens=2500", "temperature=0", "超时 60s / 重试 2 次"], fill: C.green, edge: C.greenEdge }));
  b.push(box({ x: 602, y: 96, w: 286, h: 76, text: ["POST {base}/v1/messages"], sub: ["x-api-key / anthropic-version", "请求体：model、system、messages"], fill: C.amber, edge: C.amberEdge }));
  b.push(arrow({ from: [272, 134], to: [310, 134] }));
  b.push(arrow({ from: [562, 134], to: [600, 134] }));

  b.push(band({ x: 24, y: 232, w: 892, h: 196, title: "错误分类与处理策略（错误码决定是否重试）", fill: "#fffdf8" }));
  const codes = [
    ["TIMEOUT", "AbortError：超过 60s 中止", "重试", C.red, C.redEdge],
    ["NETWORK", "DNS/连接失败/端口不可达", "重试", C.red, C.redEdge],
    ["RATE_LIMIT", "HTTP 429", "重试", C.amber, C.amberEdge],
    ["SERVER", "HTTP 5xx", "重试", C.amber, C.amberEdge],
    ["AUTH", "HTTP 401/403：密钥无权", "不重试", C.purple, C.purpleEdge],
    ["BAD_REQUEST", "HTTP 400/422：参数错误", "不重试", C.purple, C.purpleEdge],
    ["EMPTY", "返回内容为空", "不重试", C.purple, C.purpleEdge]
  ];
  const colW = 258, colH = 62;
  codes.forEach((c, i) => {
    const x = 52 + (i % 3) * (colW + 16);
    const y = 276 + Math.floor(i / 3) * (colH + 16);
    b.push(box({ x, y, w: colW, h: colH, text: c[0], sub: [c[1]], subFs: 11, fs: 13, fill: c[3], edge: c[4] }));
    b.push(text({ x: x + 12, y: y + colH - 8, s: c[2], fs: 11.5, fill: c[2] === "重试" ? "#1f4e79" : "#7a3b3b", bold: true }));
  });

  b.push(band({ x: 24, y: 452, w: 892, h: 86, title: "统一返回结构：不抛异常，由上层决定降级方式", fill: "#f7faf8" }));
  b.push(box({ x: 52, y: 484, w: 400, h: 40, text: ['成功 {ok:true, text, usage, stopReason, latencyMs}'], fs: 12, fill: C.green, edge: C.greenEdge }));
  b.push(box({ x: 476, y: 484, w: 412, h: 40, text: ['失败 {ok:false, code, message, attempts}'], fs: 12, fill: C.red, edge: C.redEdge }));
  return renderPng({ name: "E5-图1-模型调用与失败处理", w, h, svg: svgWrap({ w, h, body: b.join("\n"), title: "图1  模型调用链路与错误分类处理" }) });
}

// ============ 图2：RAG 最小链路 ============
function fig2() {
  const w = 1000, h = 640;
  const b = [];
  // 知识库侧
  b.push(band({ x: 24, y: 56, w: 952, h: 150, title: "知识库准备（离线，可重复执行）", fill: "#f8fbfd" }));
  const kbBoxes = [
    ["knowledge/*.md", ["5 份资料 + YAML 元数据", "来源、施行日期、权限、隐私"]],
    ["清理", ["噪声行 / 乱码 / 重复", "元数据缺失剔除"]],
    ["切分", ["标题分段 + 段落合并", "目标 520 / 上限 780 字符"]],
    ["chunks.json", ["34 个片段", "编号 K1-C01 … K5-C06"]]
  ];
  kbBoxes.forEach((bx, i) => {
    const x = 52 + i * 232;
    b.push(box({ x, y: 96, w: 200, h: 78, text: bx[0], sub: bx[1], fs: 13, subFs: 11, fill: i === 3 ? C.green : C.blue, edge: i === 3 ? C.greenEdge : C.blueEdge }));
    if (i < 3) b.push(arrow({ from: [x + 202, 135], to: [x + 230, 135] }));
  });

  // 在线链路
  b.push(band({ x: 24, y: 232, w: 952, h: 356, title: "在线链路：一次问答的 7 个步骤", fill: "#fffdf8" }));
  const steps = [
    ["① 问题输入", "只传问题文本"],
    ["② 分词", "词典 + 二元回退"],
    ["③ 混合打分", "BM25×0.65 + 余弦×0.35"],
    ["④ Top-8 候选", "关键词预筛"],
    ["⑤ 模型判断", "只留支撑回答的片段"],
    ["⑥ 上下文拼装", "Top-k=4，带编号与来源"],
    ["⑦ 生成与校验", "Prompt v2，校验引用"]
  ];
  steps.forEach((s, i) => {
    const y = 276 + i * 44;
    b.push(box({ x: 52, y, w: 300, h: 36, text: s[0], fs: 13, fill: i >= 4 ? C.amber : C.blue, edge: i >= 4 ? C.amberEdge : C.blueEdge }));
    b.push(text({ x: 368, y: y + 24, s: s[1], fs: 12, fill: C.sub }));
    if (i < steps.length - 1) b.push(arrow({ from: [202, y + 38], to: [202, y + 42] , lw: 1.2 }));
  });

  // 右侧：上下文与引用示例
  b.push(band({ x: 660, y: 268, w: 300, h: 296, title: "送入模型的上下文（节选）", fill: "#ffffff", dash: false }));
  const lines = [
    "【资料1｜编号 K1-C07】",
    "《移动互联网未成年人",
    "  模式建设指南》",
    "国家互联网信息办公室",
    "2024-11-15 施行",
    "小节：使用时长管理 ›",
    "  使用时长管理",
    "",
    "1. 移动智能终端应当为不同",
    "   年龄段的未成年人用户提供",
    "   差异化的使用时长管理服务",
    "   …",
    "",
    "→ 回答必须标注 [K1-C07]"
  ];
  lines.forEach((l, i) => b.push(text({ x: 678, y: 300 + i * 18, s: l, fs: 11, fill: i === 0 ? C.head : C.sub, bold: i === 0 })));
  b.push(arrow({ from: [566, 452], to: [656, 400], label: "拼装", labelDy: -6 }));

  b.push(box({ x: 52, y: 596, w: 900, h: 30, text: ["检索无命中 → 交由模型判断：缺信息提示补充 / 超范围说明无法处理 / 资料不足则明说；生成失败 → 保留依据、返回错误码"], fs: 11.5, fill: C.grey, edge: C.greyEdge, bold: false }));
  return renderPng({ name: "E5-图2-RAG最小链路与模块调用", w, h, svg: svgWrap({ w, h, body: b.join("\n"), title: "图2  RAG 最小链路与模块调用关系" }) });
}

// ============ 图3：知识库与切分统计（真实数据） ============
function fig3() {
  const report = readJson(path.join(ROOT, "rag", "data", "kb-report.json"));
  const w = 900, h = 480;
  const b = [];
  const maxChars = Math.max(...report.perDoc.map((d) => d.bodyChars));
  const rowH = 58;
  report.perDoc.forEach((d, i) => {
    const y = 92 + i * rowH;
    const barW = Math.round((d.bodyChars / maxChars) * 430);
    b.push(text({ x: 40, y: y + 26, s: `${d.docId}  ${d.title.length > 26 ? `${d.title.slice(0, 26)}…` : d.title}`, fs: 12.5, fill: C.ink, bold: true }));
    b.push(text({ x: 40, y: y + 44, s: `${d.issuer}｜${d.effective} 施行`, fs: 11, fill: C.sub }));
    b.push(`<rect x="470" y="${y + 8}" width="${barW}" height="22" rx="3" fill="${C.blue}" stroke="${C.blueEdge}"/>`);
    b.push(text({ x: 470 + barW + 10, y: y + 25, s: `${d.bodyChars} 字符 / ${d.chunks} 片段`, fs: 11.5, fill: C.sub }));
  });
  const boxY = 92 + report.perDoc.length * rowH + 8;
  b.push(band({ x: 40, y: boxY, w: 820, h: 96, title: "切分结果统计", fill: "#f8fbfd" }));
  const stats = report.chunk;
  const cells = [
    ["片段总数", `${stats.count}`],
    ["平均长度", `${stats.avgChars} 字符`],
    ["长度区间", `${stats.minChars}—${stats.maxChars}`],
    ["中位数", `${stats.p50} 字符`],
    ["相邻重叠", `${stats.overlapChars} 字符`],
    ["正文合计", `${report.bodyChars} 字符`]
  ];
  cells.forEach((c, i) => {
    const x = 56 + i * 136;
    b.push(text({ x, y: boxY + 52, s: c[0], fs: 11, fill: C.sub }));
    b.push(text({ x, y: boxY + 76, s: c[1], fs: 14, fill: C.head, bold: true }));
  });
  return renderPng({ name: "E5-图3-知识库构成与切分统计", w, h, svg: svgWrap({ w, h, body: b.join("\n"), title: "图3  知识库构成与切分统计（脚本输出）" }) });
}

// ============ 图4：Top-8 检索排序依据（真实数据） ============
function fig4() {
  const evalData = readJson(path.join(RUNS, "eval-latest.json"));
  // 取 Q4（与正文 2.4.2 的 Top-k 表一致）
  const target = evalData.results.find((r) => r.id === "Q4") ?? evalData.results[0];
  const cands = target.rag.candidates.slice(0, 8);
  const w = 940, h = 120 + cands.length * 44 + 60;
  const b = [];
  const maxScore = 1;
  const barMax = 420;
  b.push(text({ x: 40, y: 84, s: `问题：${target.question.slice(0, 46)}…`, fs: 12, fill: C.sub }));
  cands.forEach((c, i) => {
    const y = 104 + i * 44;
    const len = Math.round((c.hybrid / maxScore) * barMax);
    const fill = c.relevant ? C.green : C.grey;
    const edge = c.relevant ? C.greenEdge : C.greyEdge;
    b.push(text({ x: 40, y: y + 18, s: `${c.rank}. ${c.chunkId}`, fs: 12, fill: C.ink, bold: true }));
    b.push(`<rect x="150" y="${y + 2}" width="${len}" height="22" rx="3" fill="${fill}" stroke="${edge}"/>`);
    b.push(text({ x: 158 + len, y: y + 18, s: `混合分 ${c.hybrid.toFixed(3)}${c.relevant ? "" : "（预筛未通过）"}`, fs: 11, fill: C.sub }));
  });
  const legendY = 104 + cands.length * 44 + 12;
  b.push(text({ x: 40, y: legendY + 18, s: "混合分 = 0.65 × BM25归一化 + 0.35 × TF-IDF余弦；绿色为通过关键词预筛、进入模型判断的片段", fs: 11.5, fill: C.sub }));
  b.push(text({ x: 40, y: legendY + 40, s: "k = 4：最终进入上下文的片段数；本题实际使用片段与引用见 2.5 对比表", fs: 11.5, fill: C.sub }));
  return renderPng({ name: "E5-图4-一次查询的候选排序", w, h, svg: svgWrap({ w, h, body: b.join("\n"), title: "图4  一次查询的 Top-8 候选与排序依据（真实运行数据）" }) });
}

// ============ 图5：双组对比耗时与 token（真实数据） ============
function fig5() {
  const evalData = readJson(path.join(RUNS, "eval-latest.json"));
  const rows = evalData.results;
  const w = 940, h = 660;
  const b = [];
  const maxMs = Math.max(...rows.flatMap((r) => [r.direct.latencyMs?.total ?? 0, r.rag.latencyMs?.total ?? 0]));
  const barMax = 300;
  const groupW = 108;
  const base = 454;
  rows.forEach((r, i) => {
    const x = 60 + i * groupW;
    const dh = Math.round(((r.direct.latencyMs?.total ?? 0) / maxMs) * barMax);
    const rh = Math.round(((r.rag.latencyMs?.total ?? 0) / maxMs) * barMax);
    b.push(`<rect x="${x}" y="${base - dh}" width="34" height="${dh}" fill="${C.blue}" stroke="${C.blueEdge}"/>`);
    b.push(`<rect x="${x + 40}" y="${base - rh}" width="34" height="${rh}" fill="${C.amber}" stroke="${C.amberEdge}"/>`);
    b.push(text({ x: x + 17, y: base - dh - 6, s: `${Math.round((r.direct.latencyMs?.total ?? 0) / 1000)}s`, fs: 10.5, fill: C.sub, anchor: "middle" }));
    b.push(text({ x: x + 57, y: base - rh - 6, s: `${Math.round((r.rag.latencyMs?.total ?? 0) / 1000)}s`, fs: 10.5, fill: C.sub, anchor: "middle" }));
    b.push(text({ x: x + 37, y: base + 20, s: r.id, fs: 12, fill: C.ink, bold: true, anchor: "middle" }));
    const mark = r.rag.insufficient ? "资料不足" : (r.rag.truncated ? "截断" : `${r.rag.citations?.cited?.length ?? 0}引`);
    b.push(text({ x: x + 37, y: base + 38, s: mark, fs: 10, fill: r.rag.insufficient ? "#9a3412" : C.sub, anchor: "middle" }));
  });
  b.push(`<line x1="40" y1="454" x2="900" y2="454" stroke="${C.line}" stroke-width="1.2"/>`);
  // 图例
  b.push(`<rect x="60" y="60" width="14" height="14" fill="${C.blue}" stroke="${C.blueEdge}"/>`);
  b.push(text({ x: 80, y: 72, s: "直接模型组（不提供资料）", fs: 12, fill: C.ink }));
  b.push(`<rect x="300" y="60" width="14" height="14" fill="${C.amber}" stroke="${C.amberEdge}"/>`);
  b.push(text({ x: 320, y: 72, s: "RAG 组（检索 + 引用）", fs: 12, fill: C.ink }));
  b.push(text({ x: 560, y: 72, s: `柱顶数字为单题总耗时；下方标注 RAG 组结果（引用条数/资料不足/截断）`, fs: 11, fill: C.sub }));
  b.push(text({ x: 40, y: 92, s: "单题耗时（秒），同一问题、同一模型与参数；8 题 × 2 组，各次独立上下文", fs: 11.5, fill: C.sub }));

  // 汇总
  const s = evalData.summary;
  b.push(band({ x: 40, y: 556, w: 860, h: 88, title: "汇总（脚本统计）", fill: "#f8fbfd" }));
  const cells = [
    ["直接组平均耗时", `${(s.direct.avgLatencyMs / 1000).toFixed(1)} s`],
    ["RAG组平均耗时", `${(s.rag.avgLatencyMs / 1000).toFixed(1)} s`],
    ["RAG 检索/重排/生成", `${s.rag.avgRetrieveMs}/${(s.rag.avgRerankMs / 1000).toFixed(1)}s/${(s.rag.avgGenerateMs / 1000).toFixed(1)}s`],
    ["直接组调用次数", `${s.direct.totalCalls}`],
    ["RAG 组调用次数", `${s.rag.totalCalls}`],
    ["带引用/无效引用", `${s.rag.withCitation} / ${s.rag.withInvalidCitation}`]
  ];
  cells.forEach((c, i) => {
    const x = 56 + i * 142;
    b.push(text({ x, y: 596, s: c[0], fs: 10.5, fill: C.sub }));
    b.push(text({ x, y: 618, s: c[1], fs: 13, fill: C.head, bold: true }));
  });
  return renderPng({ name: "E5-图5-双组对比耗时与结果", w, h, svg: svgWrap({ w, h, body: b.join("\n"), title: "图5  双组对比：单题耗时与结果标记（真实运行数据）" }) });
}

// ============ 图6：命令行运行截图（真实日志） ============
function fig6() {
  const logFile = process.argv[2] ?? path.join(RUNS, "cli-demo.log");
  if (!fs.existsSync(logFile)) {
    console.log(`跳过图6：未找到 ${logFile}`);
    return null;
  }
  const raw = fs.readFileSync(logFile, "utf8").replace(/\u001b\[[0-9;]*m/g, "");
  const lines = raw.split(/\r?\n/).slice(0, 60);
  const esc2 = (s) => esc(s).replace(/ /g, "&nbsp;");
  const body = lines
    .map((l) => {
      const isHead = /^[═─]/.test(l);
      const isBadge = /资料不足|失败|错误|⚠/.test(l);
      const isCite = /\[K\d+-C\d+\]/.test(l);
      const color = isHead ? "#6b7f95" : isBadge ? "#f0a35e" : isCite ? "#7ec699" : "#d7e0ea";
      return `<div style="color:${color}">${esc2(l) || "&nbsp;"}</div>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#0f172a}
  .win{width:1240px;background:#0f172a}
  .bar{height:34px;background:#1e293b;display:flex;align-items:center;padding:0 14px;gap:8px;border-bottom:1px solid #334155}
  .dot{width:11px;height:11px;border-radius:50%}
  .title{color:#94a3b8;font:12px "Microsoft YaHei",sans-serif;margin-left:10px}
  pre{margin:0;padding:16px 18px;color:#d7e0ea;font:13.2px/1.5 Consolas,"Courier New",monospace;white-space:pre-wrap}
  </style></head><body>
  <div class="win">
    <div class="bar">
      <span class="dot" style="background:#f87171"></span>
      <span class="dot" style="background:#fbbf24"></span>
      <span class="dot" style="background:#34d399"></span>
      <span class="title">node src/cli.mjs ask "…" — 青盾 RAG 命令行入口</span>
    </div>
    <pre>${body}</pre>
  </div></body></html>`;
  const h = 34 + lines.length * 20 + 40;
  return renderHtmlPng({ name: "E5-图6-命令行运行输出", html, w: 1240, h });
}

const which = process.argv[3] ?? "all";
const jobs = { fig1, fig2, fig3, fig4, fig5, fig6 };
const targets = which === "all" ? Object.values(jobs) : [jobs[which]].filter(Boolean);
for (const job of targets) {
  const res = await job();
  if (res) console.log(`${path.basename(res.pngPath ?? res)}  ${(res.bytes ?? fs.statSync(res).size)} bytes`);
}

