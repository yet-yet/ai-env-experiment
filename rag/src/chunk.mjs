// 切分：标题分段 + 段落合并 + 句子兜底，片段之间不重叠
import { splitSentences } from "./tokenize.mjs";

const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/;
const BULLET_RE = /^\s*(?:[-*+]|\d+[.、])\s+/;

/**
 * 把一个文档正文切成块。
 * 规则：
 *  1. 以 ## / ### 标题为一级边界，片段不跨小节（保证来源章节可追溯）；
 *  2. 小节内按空行分段，按顺序累加到目标长度；
 *  3. 单段超过上限时按句子边界再分（句子不拆开）；
 *  4. 相邻片段不重叠：句子边界已对齐，重叠会带来重复引用与冗余 token。
 */
export function splitBlocks(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let parent = "";
  let current = { title: "正文", blocks: [] };
  let buffer = [];

  const flushBuffer = () => {
    const text = buffer.join("\n").trim();
    if (text) current.blocks.push(text);
    buffer = [];
  };

  for (const line of lines) {
    const h = line.match(HEADING_RE);
    if (h) {
      flushBuffer();
      if (current.blocks.length) sections.push(current);
      const level = h[1].length;
      if (level === 2) {
        parent = h[2];
        current = { title: parent, blocks: [] };
      } else {
        // 三级标题保留上级标题，便于“来源对应原资料”
        current = { title: parent ? `${parent} › ${h[2]}` : h[2], blocks: [] };
      }
      continue;
    }
    if (!line.trim()) {
      flushBuffer();
      if (current.blocks.length && !buffer.length) {
        // 段落之间的空行：仅作为分段信号
      }
      continue;
    }
    if (BULLET_RE.test(line) && buffer.length && !BULLET_RE.test(buffer[buffer.length - 1])) {
      // 列表开始新的一块，避免与上一个正文段落粘连
      flushBuffer();
    }
    buffer.push(line);
  }
  flushBuffer();
  if (current.blocks.length) sections.push(current);
  return sections;
}

export function chunkDocument(doc, options = {}) {
  const { targetChars = 520, maxChars = 780 } = options;
  const chunks = [];
  for (const section of splitBlocks(doc.body)) {
    let buffer = [];
    let length = 0;
    const push = () => {
      const text = buffer.join("\n").trim();
      if (text) {
        chunks.push({ docId: doc.docId, section: section.title, text });
      }
      buffer = [];
      length = 0;
    };
    for (const block of section.blocks) {
      const blockLength = block.length;
      if (blockLength > maxChars) {
        // 超长段落：先冲掉已有内容，再按句子切
        if (buffer.length) push();
        let piece = "";
        for (const sentence of splitSentences(block)) {
          if (piece.length + sentence.length > maxChars && piece.length >= targetChars) {
            chunks.push({ docId: doc.docId, section: section.title, text: piece.trim() });
            piece = "";
          }
          piece += sentence;
        }
        if (piece.trim()) chunks.push({ docId: doc.docId, section: section.title, text: piece.trim() });
        continue;
      }
      if (length + blockLength > maxChars && length >= targetChars * 0.55) push();
      buffer.push(block);
      length += blockLength + 1;
    }
    if (buffer.length) push();
  }
  // 编号与标签
  const counters = new Map();
  return chunks.map((c) => {
    const n = (counters.get(c.docId) ?? 0) + 1;
    counters.set(c.docId, n);
    const chunkId = `${c.docId}-C${String(n).padStart(2, "0")}`;
    return { ...c, chunkId, label: `【${chunkId}】`, charLen: c.text.length };
  });
}

export function chunkStats(chunks) {
  const lens = chunks.map((c) => c.charLen).sort((a, b) => a - b);
  const sum = lens.reduce((a, b) => a + b, 0);
  const at = (p) => (lens.length ? lens[Math.min(lens.length - 1, Math.floor(p * lens.length))] : 0);
  return {
    count: lens.length,
    totalChars: sum,
    avgChars: lens.length ? Math.round(sum / lens.length) : 0,
    minChars: lens[0] ?? 0,
    maxChars: lens[lens.length - 1] ?? 0,
    p50: at(0.5),
    overlapChars: 0
  };
}
