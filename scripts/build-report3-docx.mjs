import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun,
  Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType
} = await import(pathToFileURL(
  "C:/Users/18394/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/docx/dist/index.mjs"
).href);

const root = path.resolve("D:/work/软件应用开发");
const markdownPath = path.join(root, "实验3-软件架构与界面设计.md");
const outputPath = path.join(root, "软工2班-24111302097-蔡春阳-实验3-软件架构与界面设计.docx");
const markdown = fs.readFileSync(markdownPath, "utf8").replace(/\r\n/g, "\n");
const lines = markdown.split("\n");

const normalFont = "Microsoft YaHei";
const monoFont = "Consolas";
const children = [];

function cleanInline(v) {
  return v.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1（$2）")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<([^>]+)>/g, "$1");
}
function textParagraph(t, o = {}) {
  return new Paragraph({
    alignment: o.alignment ?? AlignmentType.LEFT,
    spacing: { after: o.after ?? 110, line: 290 },
    indent: o.indent ? { left: o.indent } : undefined,
    shading: o.shading ? { type: ShadingType.CLEAR, fill: o.shading } : undefined,
    children: [new TextRun({
      text: cleanInline(t), font: o.font ?? normalFont, size: o.size ?? 20,
      bold: o.bold ?? false, italics: o.italics ?? false, color: o.color
    })]
  });
}
function heading(t, level) {
  const sizes = { 1: 32, 2: 27, 3: 22, 4: 20 };
  const levels = { 1: HeadingLevel.TITLE, 2: HeadingLevel.HEADING_1, 3: HeadingLevel.HEADING_2, 4: HeadingLevel.HEADING_3 };
  return new Paragraph({
    heading: levels[level] ?? HeadingLevel.HEADING_2,
    spacing: { before: level === 1 ? 0 : 220, after: 110 }, keepNext: true,
    children: [new TextRun({
      text: cleanInline(t), font: normalFont, size: sizes[level] ?? 20, bold: true,
      color: level === 1 ? "153E75" : level === 2 ? "1F4E79" : "2F6690"
    })]
  });
}
const parseRow = l => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => cleanInline(c.trim()));
function makeTable(tableLines) {
  const rows = tableLines.map(parseRow);
  const allRows = [rows[0], ...rows.slice(2)].map((cells, ri) =>
    new TableRow({
      tableHeader: ri === 0,
      children: cells.map(cell => new TableCell({
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: "DCEAF5" } : undefined,
        margins: { top: 55, bottom: 55, left: 75, right: 75 },
        children: [new Paragraph({
          spacing: { after: 0, line: 230 },
          children: [new TextRun({
            text: cell, font: normalFont, size: 14.5, bold: ri === 0,
            color: ri === 0 ? "17324D" : "1F2937"
          })]
        })]
      }))
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "9CAEC0" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "9CAEC0" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "9CAEC0" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "9CAEC0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "B8C5D1" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "B8C5D1" }
    },
    rows: allRows
  });
}
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return { width: 1200, height: 800 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
// 架构图/原型较宽，缩到 560px 以适应 A4 正文宽度，避免被压得过小
const IMG_W = 560;
function addImage(rel, alt) {
  const p = path.resolve(root, rel.replaceAll("/", path.sep));
  if (!fs.existsSync(p)) { children.push(textParagraph(`[图片缺失：${alt}]`, { italics: true, color: "B91C1C" })); return; }
  const data = fs.readFileSync(p);
  const d = pngSize(data);
  const w = IMG_W;
  const h = Math.round(w * d.height / d.width);
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 90, after: 60 },
    children: [new ImageRun({ data, transformation: { width: w, height: h }, type: "png" })]
  }));
  children.push(textParagraph(alt, { alignment: AlignmentType.CENTER, size: 15, italics: true, color: "4B5563", after: 170 }));
}

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (!line.trim()) { i += 1; continue; }
  if (/^---+$/.test(line.trim())) {
    children.push(new Paragraph({ spacing: { before: 90, after: 90 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "B7C7D6" } } }));
    i += 1; continue;
  }
  const hm = line.match(/^(#{1,4})\s+(.+)$/);
  if (hm) { children.push(heading(hm[2], hm[1].length)); i += 1; continue; }
  if (line.startsWith("```")) {
    const code = []; i += 1;
    while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i += 1; }
    i += 1;
    children.push(new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: "111827" }, spacing: { before: 70, after: 120 },
      indent: { left: 110, right: 110 },
      children: [new TextRun({ text: code.join("\n"), font: monoFont, size: 14, color: "F9FAFB" })]
    }));
    continue;
  }
  if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
    const tl = [line, lines[i + 1]]; i += 2;
    while (i < lines.length && lines[i].startsWith("|")) { tl.push(lines[i]); i += 1; }
    children.push(makeTable(tl));
    children.push(new Paragraph({ spacing: { after: 60 } }));
    continue;
  }
  const im = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (im) { addImage(im[2], im[1]); i += 1; continue; }
  if (line.startsWith("**图") && line.endsWith("**")) {
    children.push(textParagraph(line.replaceAll("**", ""), { alignment: AlignmentType.CENTER, bold: true, size: 19, color: "1F4E79" }));
    i += 1; continue;
  }
  if (line.startsWith(">")) {
    const q = []; while (i < lines.length && lines[i].startsWith(">")) { q.push(lines[i].replace(/^>\s?/, "")); i += 1; }
    const t = q.filter(x => x.trim()).join("\n");
    if (t) children.push(new Paragraph({
      spacing: { before: 80, after: 130, line: 275 }, indent: { left: 220 },
      shading: { type: ShadingType.CLEAR, fill: "F2F7FB" },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: "7AA6C2" } },
      children: [new TextRun({ text: cleanInline(t), font: normalFont, size: 19, italics: true, color: "374151" })]
    }));
    continue;
  }
  if (/^[-*]\s+/.test(line)) {
    children.push(new Paragraph({
      bullet: { level: 0 }, spacing: { after: 65, line: 275 },
      children: [new TextRun({ text: cleanInline(line.replace(/^[-*]\s+/, "")), font: normalFont, size: 19 })]
    }));
    i += 1; continue;
  }
  if (/^\d+\.\s+/.test(line)) {
    children.push(new Paragraph({
      spacing: { after: 65, line: 275 }, indent: { left: 220 },
      children: [new TextRun({ text: cleanInline(line), font: normalFont, size: 19 })]
    }));
    i += 1; continue;
  }
  children.push(textParagraph(line));
  i += 1;
}

const doc = new Document({
  creator: "蔡春阳",
  title: "实验3：软件架构与界面设计",
  subject: "软件工程实验报告",
  styles: { default: { document: { run: { font: normalFont, size: 20, color: "1F2937" }, paragraph: { spacing: { line: 290, after: 110 } } } } },
  sections: [{
    properties: { page: { margin: { top: 850, right: 850, bottom: 950, left: 850 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "软工2班  24111302097  蔡春阳", font: normalFont, size: 15, color: "6B7280" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "实验3：软件架构与界面设计", font: normalFont, size: 15, color: "6B7280" })] })] }) },
    children
  }]
});
fs.writeFileSync(outputPath, await Packer.toBuffer(doc));
console.log(outputPath);
