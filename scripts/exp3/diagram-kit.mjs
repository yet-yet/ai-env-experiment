// 实验3 图形渲染管线：SVG 字符串 → HTML → Chrome headless 截图 → PNG
// 用法：node scripts/exp3/diagram-kit.mjs（自检）；被 make-figs.mjs 引用
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const ROOT = path.resolve("D:/work/软件应用开发");
export const OUTDIR = path.join(ROOT, "素材");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export const C = {
  ink: "#1f2937", sub: "#4b5563", line: "#9caec0", thin: "#c3cfdb",
  head: "#153e75", band: "#1f4e79", label: "#2f6690",
  blue: "#dceaf5", blueEdge: "#5b8db8",
  green: "#dff3e4", greenEdge: "#4e9a68",
  amber: "#fdf0d5", amberEdge: "#c8912f",
  red: "#fbe3e3", redEdge: "#c25b5b",
  purple: "#eae4f7", purpleEdge: "#7a63b8",
  grey: "#f1f3f6", greyEdge: "#9aa8b6",
  white: "#ffffff", dark: "#111827", darkText: "#f9fafb"
};

const FONT = `"Microsoft YaHei","Noto Sans CJK SC",sans-serif`;

// ---------- 基础绘制助手 ----------
export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function box({ x, y, w, h, text = "", sub = "", fill = C.blue, edge = C.blueEdge,
  r = 6, fs = 15, subFs = 12, bold = true, dash = false, align = "center", pad = 8 }) {
  const cx = align === "center" ? x + w / 2 : x + pad;
  const anchor = align === "center" ? "middle" : "start";
  const lines = Array.isArray(text) ? text : [text];
  const subLines = Array.isArray(sub) ? sub : (sub ? [sub] : []);
  const total = lines.length;
  const blockH = total * (fs + 4) + subLines.length * (subFs + 3);
  let ty = y + h / 2 - blockH / 2 + fs;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${edge}" stroke-width="1.4"${dash ? ' stroke-dasharray="6 4"' : ""}/>`;
  for (const ln of lines) {
    out += `<text x="${cx}" y="${ty}" font-family='${FONT}' font-size="${fs}" font-weight="${bold ? 700 : 400}" fill="${C.ink}" text-anchor="${anchor}">${esc(ln)}</text>`;
    ty += fs + 4;
  }
  for (const ln of subLines) {
    out += `<text x="${cx}" y="${ty}" font-family='${FONT}' font-size="${subFs}" fill="${C.sub}" text-anchor="${anchor}">${esc(ln)}</text>`;
    ty += subFs + 3;
  }
  return out;
}

export function text({ x, y, s, fs = 13, fill = C.ink, bold = false, anchor = "start", italic = false }) {
  return `<text x="${x}" y="${y}" font-family='${FONT}' font-size="${fs}"${bold ? ' font-weight="700"' : ""}${italic ? ' font-style="italic"' : ""} fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
}

// 箭头：支持实线/虚线、双向、带标签；自动在中点停一下给标签留位
export function arrow({ from, to, label = "", dash = false, double = false, color = C.sub,
  lw = 1.5, labelDx = 0, labelDy = -7, curve = 0, labelBg = C.white, anchor = "middle" }) {
  const [x1, y1] = from, [x2, y2] = to;
  let d;
  if (curve) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const nx = -(y2 - y1), ny = (x2 - x1);
    const len = Math.hypot(nx, ny) || 1;
    d = `M ${x1} ${y1} Q ${mx + (nx / len) * curve} ${my + (ny / len) * curve} ${x2} ${y2}`;
  } else {
    d = `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const marker = double ? ` marker-start="url(#ah)"` : "";
  let out = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${lw}"${dash ? ' stroke-dasharray="6 4"' : ""} marker-end="url(#ah)"${marker}/>`;
  if (label) {
    const tx = (x1 + x2) / 2 + labelDx, ty = (y1 + y2) / 2 + labelDy;
    const wpx = label.length * 7.2 + 10;
    out += `<rect x="${tx - wpx / 2}" y="${ty - 11}" width="${wpx}" height="15" fill="${labelBg}" opacity="0.92"/>`;
    out += text({ x: tx, y: ty, s: label, fs: 12, fill: C.sub, anchor });
  }
  return out;
}

export function band({ x, y, w, h, title, fill = "none", edge = C.thin, dash = true, titleColor = C.label, fs = 13 }) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${edge}" stroke-width="1.2"${dash ? ' stroke-dasharray="7 5"' : ""}/>`;
  if (title) out += text({ x: x + 12, y: y + 19, s: title, fs, fill: titleColor, bold: true });
  return out;
}

export function note({ x, y, s, fs = 11.5, fill = C.sub, anchor = "start", maxW = 0 }) {
  return text({ x, y, s, fs, fill, anchor });
}

export function svgWrap({ w, h, body, title = "" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <marker id="ah" markerWidth="10" markerHeight="10" refX="9" refY="3.2" orient="auto">
    <path d="M0,0 L9,3.2 L0,6.4 z" fill="${C.sub}"/>
  </marker>
</defs>
<rect width="${w}" height="${h}" fill="#ffffff"/>
${title ? text({ x: 20, y: 30, s: title, fs: 18, fill: C.head, bold: true }) : ""}
${body}
</svg>`;
}

// ---------- 渲染 ----------
// 流程：SVG → HTML → Chrome 无头截图（2x PNG）
// 说明：本项目的图形是“大色块 + 细文字”，实测 PNG（无损）反而比 JPEG 更小且文字更清晰，
// 因此保留 PNG，不做有损转换。
export async function renderPng({ name, svg, w, h, scale = 2, keepHtml = false }) {
  const tmpDir = path.join(ROOT, ".figtmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const htmlPath = path.join(tmpDir, `${name}.html`);
  const pngPath = path.join(OUTDIR, `${name}.png`);
  fs.mkdirSync(OUTDIR, { recursive: true });
  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>
</head><body>${svg}</body></html>`;
  fs.writeFileSync(htmlPath, html, "utf8");
  const profile = path.join(tmpDir, "chrome-profile");
  const args = [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`,
    `--force-device-scale-factor=${scale}`,
    `--screenshot=${pngPath}`,
    `file:///${htmlPath.replace(/\\/g, "/")}`
  ];
  execFileSync(CHROME, args, { stdio: "ignore", timeout: 120000 });
  if (!keepHtml) fs.rmSync(htmlPath, { force: true });
  return { pngPath, bytes: fs.statSync(pngPath).size };
}

export function cleanup() {
  const tmpDir = path.join(ROOT, ".figtmp");
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
