import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} = await import(pathToFileURL(
  "C:/Users/18394/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/docx/dist/index.mjs"
).href);

const root = path.resolve("D:/work/软件应用开发");
const markdownPath = path.join(root, "实验2-个人软件选题与需求分析.md");
const outputPath = path.join(root, "软工2班-24111302097-蔡春阳-实验2-个人软件选题与需求分析.docx");
const markdown = fs.readFileSync(markdownPath, "utf8").replace(/\r\n/g, "\n");
const lines = markdown.split("\n");

const normalFont = "Microsoft YaHei";
const monoFont = "Consolas";
const children = [];

function cleanInline(value) {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1（$2）")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<([^>]+)>/g, "$1");
}

function textParagraph(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment ?? AlignmentType.LEFT,
    spacing: { after: options.after ?? 110, line: 290 },
    indent: options.indent ? { left: options.indent } : undefined,
    shading: options.shading ? { type: ShadingType.CLEAR, fill: options.shading } : undefined,
    children: [
      new TextRun({
        text: cleanInline(text),
        font: options.font ?? normalFont,
        size: options.size ?? 20,
        bold: options.bold ?? false,
        italics: options.italics ?? false,
        color: options.color
      })
    ]
  });
}

function heading(text, level) {
  const sizes = { 1: 32, 2: 27, 3: 22, 4: 20 };
  const levels = {
    1: HeadingLevel.TITLE,
    2: HeadingLevel.HEADING_1,
    3: HeadingLevel.HEADING_2,
    4: HeadingLevel.HEADING_3
  };
  return new Paragraph({
    heading: levels[level] ?? HeadingLevel.HEADING_2,
    spacing: { before: level === 1 ? 0 : 220, after: 110 },
    keepNext: true,
    children: [
      new TextRun({
        text: cleanInline(text),
        font: normalFont,
        size: sizes[level] ?? 20,
        bold: true,
        color: level === 1 ? "153E75" : level === 2 ? "1F4E79" : "2F6690"
      })
    ]
  });
}

function parseTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cleanInline(cell.trim()));
}

function makeTable(tableLines) {
  const rows = tableLines.map(parseTableRow);
  const header = rows[0];
  const body = rows.slice(2);
  const allRows = [header, ...body].map((cells, rowIndex) =>
    new TableRow({
      tableHeader: rowIndex === 0,
      children: cells.map(cell =>
        new TableCell({
          shading: rowIndex === 0 ? { type: ShadingType.CLEAR, fill: "DCEAF5" } : undefined,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [
            new Paragraph({
              spacing: { after: 0, line: 235 },
              children: [
                new TextRun({
                  text: cell,
                  font: normalFont,
                  size: 15,
                  bold: rowIndex === 0,
                  color: rowIndex === 0 ? "17324D" : "1F2937"
                })
              ]
            })
          ]
        })
      )
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

function pngDimensions(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) return { width: 600, height: 400 };
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function addImage(relativePath, alt) {
  const imagePath = path.resolve(root, relativePath.replaceAll("/", path.sep));
  if (!fs.existsSync(imagePath)) {
    children.push(textParagraph(`[图片缺失：${alt}]`, { italics: true, color: "B91C1C" }));
    return;
  }
  const data = fs.readFileSync(imagePath);
  const dimensions = pngDimensions(data);
  const width = 600;
  const height = Math.round(width * dimensions.height / dimensions.width);
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 150 },
      children: [new ImageRun({ data, transformation: { width, height }, type: "png" })]
    })
  );
  children.push(textParagraph(alt, { alignment: AlignmentType.CENTER, size: 16, italics: true, color: "4B5563" }));
}

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (!line.trim()) {
    i += 1;
    continue;
  }
  if (/^---+$/.test(line.trim())) {
    children.push(new Paragraph({ spacing: { before: 90, after: 90 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "B7C7D6" } } }));
    i += 1;
    continue;
  }
  const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
  if (headingMatch) {
    children.push(heading(headingMatch[2], headingMatch[1].length));
    i += 1;
    continue;
  }
  if (line.startsWith("```")) {
    const codeLines = [];
    i += 1;
    while (i < lines.length && !lines[i].startsWith("```")) {
      codeLines.push(lines[i]);
      i += 1;
    }
    i += 1;
    children.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: "111827" },
        spacing: { before: 70, after: 120 },
        indent: { left: 110, right: 110 },
        children: [
          new TextRun({
            text: codeLines.join("\n"),
            font: monoFont,
            size: 15,
            color: "F9FAFB"
          })
        ]
      })
    );
    continue;
  }
  if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
    const tableLines = [line, lines[i + 1]];
    i += 2;
    while (i < lines.length && lines[i].startsWith("|")) {
      tableLines.push(lines[i]);
      i += 1;
    }
    children.push(makeTable(tableLines));
    children.push(new Paragraph({ spacing: { after: 60 } }));
    continue;
  }
  const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageMatch) {
    addImage(imageMatch[2], imageMatch[1]);
    i += 1;
    continue;
  }
  if (line.startsWith("**图") && line.endsWith("**")) {
    children.push(textParagraph(line.replaceAll("**", ""), { alignment: AlignmentType.CENTER, bold: true, size: 19, color: "1F4E79" }));
    i += 1;
    continue;
  }
  // 连续的引用行合并为一个引用块，避免逐行碎片化
  if (line.startsWith(">")) {
    const quoteLines = [];
    while (i < lines.length && lines[i].startsWith(">")) {
      quoteLines.push(lines[i].replace(/^>\s?/, ""));
      i += 1;
    }
    const text = quoteLines.filter(text2 => text2.trim()).join("\n");
    if (text) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 130, line: 275 },
          indent: { left: 220 },
          shading: { type: ShadingType.CLEAR, fill: "F2F7FB" },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: "7AA6C2" } },
          children: [new TextRun({ text: cleanInline(text), font: normalFont, size: 19, italics: true, color: "374151" })]
        })
      );
    }
    continue;
  }
  if (/^[-*]\s+/.test(line)) {
    children.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 65, line: 275 },
      children: [new TextRun({ text: cleanInline(line.replace(/^[-*]\s+/, "")), font: normalFont, size: 19 })]
    }));
    i += 1;
    continue;
  }
  if (/^\d+\.\s+/.test(line)) {
    children.push(new Paragraph({
      numbering: undefined,
      spacing: { after: 65, line: 275 },
      indent: { left: 220 },
      children: [new TextRun({ text: cleanInline(line), font: normalFont, size: 19 })]
    }));
    i += 1;
    continue;
  }
  children.push(textParagraph(line));
  i += 1;
}

const document = new Document({
  creator: "蔡春阳",
  title: "实验2：个人软件选题与需求分析",
  subject: "软件工程实验报告",
  styles: {
    default: {
      document: {
        run: { font: normalFont, size: 20, color: "1F2937" },
        paragraph: { spacing: { line: 290, after: 110 } }
      }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 850, right: 850, bottom: 950, left: 850 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "软工2班  24111302097  蔡春阳", font: normalFont, size: 15, color: "6B7280" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "实验2：个人软件选题与需求分析", font: normalFont, size: 15, color: "6B7280" })]
        })]
      })
    },
    children
  }]
});

const buffer = await Packer.toBuffer(document);
fs.writeFileSync(outputPath, buffer);
console.log(outputPath);
