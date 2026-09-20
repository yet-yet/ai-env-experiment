import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { marked } = await import(pathToFileURL(
  "C:/Users/18394/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js"
).href);

const root = path.resolve("D:/work/软件应用开发");
const markdownPath = path.join(root, "实验3-软件架构与界面设计.md");
const htmlPath = path.join(root, "实验3-软件架构与界面设计.html");
const title = "软工2班-24111302097-蔡春阳-实验3-软件架构与界面设计";

const markdown = fs.readFileSync(markdownPath, "utf8");
const body = marked.parse(markdown, { gfm: true, breaks: true });
const baseHref = pathToFileURL(`${root}${path.sep}`).href;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <base href="${baseHref}">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 15mm 14mm 16mm; }
    * { box-sizing: border-box; }
    body { color: #1f2937; font-family: "Microsoft YaHei","Noto Sans CJK SC","Segoe UI",sans-serif; font-size: 10pt; line-height: 1.6; margin: 0 auto; max-width: 182mm; }
    h1 { color: #153e75; font-size: 22pt; line-height: 1.25; margin: 0 0 16pt; }
    h2 { color: #1f4e79; font-size: 15pt; margin: 20pt 0 8pt; border-bottom: 1.5pt solid #9bbad4; padding-bottom: 3pt; page-break-after: avoid; }
    h3 { color: #2f6690; font-size: 12pt; margin: 14pt 0 5pt; page-break-after: avoid; }
    h4 { color: #2f6690; font-size: 10.5pt; margin: 11pt 0 4pt; page-break-after: avoid; }
    p { margin: 5pt 0 7pt; }
    blockquote { margin: 7pt 0; padding: 5pt 10pt; border-left: 3pt solid #7aa6c2; background: #f2f7fb; color: #374151; }
    blockquote p { margin: 3pt 0; }
    code { font-family: Consolas,"Courier New",monospace; font-size: 8.6pt; background: #f3f4f6; padding: 1pt 3pt; border-radius: 2pt; }
    pre { background: #111827; color: #f9fafb; padding: 9pt 11pt; border-radius: 4pt; white-space: pre-wrap; font-size: 8.2pt; line-height: 1.45; }
    pre code { background: transparent; color: inherit; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin: 7pt 0 11pt; font-size: 7.8pt; }
    th { background: #dceaf5; color: #17324d; font-weight: 700; }
    th, td { border: 0.6pt solid #9caec0; padding: 4pt 5pt; vertical-align: top; word-break: break-word; }
    tr:nth-child(even) td { background: #f8fbfd; }
    thead { display: table-header-group; }
    ul, ol { margin-top: 4pt; margin-bottom: 7pt; padding-left: 19pt; }
    li { margin: 2pt 0; }
    img { display: block; max-width: 100%; height: auto; margin: 8pt auto 12pt; border: 0.6pt solid #9caec0; }
    hr { border: 0; border-top: 1pt solid #b7c7d6; margin: 16pt 0; }
    a { color: #155e9a; text-decoration: none; word-break: break-all; }
    @media print { h2, h3, h4 { break-after: avoid; } table, pre, blockquote { break-inside: avoid; } table { break-inside: auto; } }
  </style>
</head>
<body>${body}</body>
</html>`;

fs.writeFileSync(htmlPath, html, "utf8");
console.log(htmlPath);
