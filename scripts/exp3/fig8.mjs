import { svgWrap, box, text, arrow, band, note, C, renderPng } from "./diagram-kit.mjs";

const WF = {
  pg: (x, y, w, h, title, tag = "") => {
    const o = [];
    o.push(box({ x, y, w, h, text: "", fill: "#ffffff", edge: "#6b7c8f", r: 8 }));
    o.push(`<path d="M${x} ${y + 36} h${w}" stroke="#6b7c8f" stroke-width="1.2"/>`);
    o.push(`<circle cx="${x + 16}" cy="${y + 18}" r="4.5" fill="#c25b5b"/>`);
    o.push(`<circle cx="${x + 31}" cy="${y + 18}" r="4.5" fill="#c8912f"/>`);
    o.push(`<circle cx="${x + 46}" cy="${y + 18}" r="4.5" fill="#4e9a68"/>`);
    o.push(text({ x: x + 62, y: y + 23, s: title, fs: 13, fill: C.head, bold: true }));
    if (tag) o.push(text({ x: x + w - 12, y: y + 23, s: tag, fs: 11, fill: C.label, anchor: "end" }));
    return o.join("\n");
  },
  lb: (x, y, s, fs = 11, fill = C.sub) => text({ x, y, s, fs, fill }),
  inp: (x, y, w, h, ph, filled = false) => {
    let o = box({ x, y, w, h, text: "", fill: filled ? "#ffffff" : "#f7f9fb", edge: C.line, r: 4 });
    o += text({ x: x + 10, y: y + h / 2 + 4, s: ph, fs: 11.5, fill: filled ? C.ink : "#8b98a6" });
    return o;
  },
  btn: (x, y, w, h, s, primary = true) => {
    let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${primary ? C.head : "#ffffff"}" stroke="${primary ? C.head : C.line}" stroke-width="1.3"/>`;
    o += text({ x: x + w / 2, y: y + h / 2 + 4, s, fs: 12, fill: primary ? "#ffffff" : C.ink, bold: true, anchor: "middle" });
    return o;
  },
  row: (x, y, w, h, left, right, fill = "#ffffff") => {
    let o = box({ x, y, w, h, text: "", fill, edge: C.thin, r: 4 });
    o += text({ x: x + 10, y: y + h / 2 + 4, s: left, fs: 11, fill: C.ink });
    if (right) o += text({ x: x + w - 10, y: y + h / 2 + 4, s: right, fs: 10.5, fill: C.sub, anchor: "end" });
    return o;
  },
  tagRow: (x, y, w, name, w2, weight, src, x2) => {
    let o = box({ x, y, w, h: 34, text: "", fill: "#fbfdff", edge: C.blueEdge, r: 5 });
    o += text({ x: x + 12, y: y + 22, s: name, fs: 12, fill: C.ink, bold: true });
    o += text({ x: x + 130, y: y + 22, s: w2, fs: 10.5, fill: C.sub });
    o += text({ x: x + w - 12, y: y + 22, s: src, fs: 10, fill: C.label, anchor: "end" });
    return o;
  }
};

function fig8() {
  const W = 1320, H = 830;
  const body = [
    text({ x: 40, y: 32, s: "图8  关键界面原型 3：兴趣标签页（孩子端）与申诉页", fs: 19, fill: C.head, bold: true }),
    text({ x: 40, y: 54, s: "目标：让“系统如何推荐、家长能看到什么、我能怎么改”三件事在同一页面说清（对应 US-15、US-23、US-26、UC-19、NFR-V2）", fs: 12.5, fill: C.sub }),

    // 左：兴趣标签页
    WF.pg(50, 84, 420, 560, "我的兴趣标签", "孩子端"),
    WF.lb(74, 142, "系统按这些兴趣，把换掉的内容换成更合适的", 11.5),
    WF.lb(74, 174, "标签（粗粒度类别，不是搜索记录）", 12.5, C.head),
    WF.tagRow(74, 186, 372, "恐龙", "权重 0.8", "家长录入", 0),
    WF.tagRow(74, 226, 372, "篮球", "权重 0.6", "行为学习", 0),
    WF.tagRow(74, 266, 372, "乐高机器人", "权重 0.7", "我添加的", 0),
    WF.row(74, 306, 372, 34, "＋ 添加一个兴趣", "", "#f7f9fb"),
    WF.lb(74, 366, "本档位可见范围（11 岁 · 8—12 岁档）", 12.5, C.head),
    box({ x: 74, y: 378, w: 372, h: 76, text: "家长目前可以看到：上面三个标签、各自权重与来源", sub: ["到了 12 岁：家长只能看到标签名字，看不到权重", "到了 16 岁：家长看不到标签明细"], fill: C.amber, edge: C.amberEdge, fs: 12, subFs: 10.5 }),
    WF.lb(74, 480, "无论哪个年龄，家长都看不到：", 12, C.head),
    WF.lb(74, 502, "· 我搜过什么、看过哪一条具体的视频", 10.5),
    WF.lb(74, 522, "· 这些标签是怎么形成的（不对应到具体内容）", 10.5),
    WF.lb(74, 542, "· 我的聊天内容（本软件不读取聊天，也不申请通知权限）", 10.5),
    WF.btn(74, 574, 180, 34, "删除选中的标签", false),
    WF.btn(266, 574, 180, 34, "保存修改", true),
    WF.lb(74, 628, "标签只保存在本机，不上传；家长端没有导出入口。", 10.5),

    // 右：申诉页
    WF.pg(510, 84, 420, 560, "对这次干预提出申诉", "孩子端"),
    WF.lb(534, 142, "原干预记录（系统自动带出，不可编辑）", 12.5, C.head),
    WF.row(534, 154, 372, 32, "时间 / 应用", "20:14 · 短视频 App"),
    WF.row(534, 190, 372, 32, "系统判定", "不适龄（画面风格）"),
    WF.row(534, 226, 372, 44, "系统依据", "画面判定为成人向话题；置信度 0.86"),
    WF.row(534, 274, 372, 32, "系统动作", "已自动换掉这一条"),
    WF.lb(534, 336, "步骤 1 / 2　我认为这条内容的问题是", 12.5, C.head),
    box({ x: 534, y: 348, w: 372, h: 32, text: "✓ 这是科普内容，不是不适合我的内容", fill: C.green, edge: C.greenEdge, fs: 11.5, bold: false, align: "left", pad: 12 }),
    WF.row(534, 386, 372, 32, "○ 判定依据不对（例如画面判断错了）", "", "#fbfdff"),
    WF.row(534, 422, 372, 32, "○ 我是在搜索里主动找到它的", "", "#fbfdff"),
    WF.lb(534, 484, "步骤 2 / 2　补充说明（可选，最多 50 字）", 12.5, C.head),
    WF.inp(534, 496, 372, 34, "例如：这是生物课的科普视频", false),
    WF.lb(534, 552, "提交后：进入家长的待确认队列，家长可放行或维持。", 10.5),
    WF.lb(534, 572, "申诉本身不会触发实时报警；放行后 ≤60 秒在本机生效。", 10.5),
    WF.btn(534, 588, 180, 34, "提交申诉", true),
    WF.btn(726, 588, 180, 34, "返回继续浏览", false),

    // 右：家长端对应视角
    WF.pg(970, 84, 310, 560, "家长端（同一次申诉）", "家长端"),
    WF.lb(994, 142, "待处理：孩子申诉 1 条", 12.5, C.head),
    box({ x: 994, y: 156, w: 262, h: 118, text: "", fill: "#fbfdff", edge: C.amberEdge, r: 6 }),
    text({ x: 1006, y: 178, s: "时间 / 应用：20:14 · 短视频", fs: 10.5, fill: C.ink }),
    text({ x: 1006, y: 198, s: "系统判定：不适龄（置信度 0.86）", fs: 10.5, fill: C.ink }),
    text({ x: 1006, y: 218, s: "孩子理由：这是生物课的科普视频", fs: 10.5, fill: C.ink }),
    text({ x: 1006, y: 246, s: "处理选项（≤2 次点击）：", fs: 10.5, fill: C.sub, bold: true }),
    text({ x: 1006, y: 264, s: "· 放行 → 加入白名单，本机 1 分钟内生效", fs: 10, fill: C.sub }),
    WF.btn(994, 286, 122, 34, "放行", true),
    WF.btn(1126, 286, 130, 34, "维持拦截", false),
    WF.lb(994, 348, "另外两条待处理", 12, C.head),
    WF.row(994, 360, 262, 32, "中间区间内容，需确认", "20:41"),
    WF.row(994, 396, 262, 32, "中间区间内容，需确认", "19:06"),
    WF.lb(994, 454, "说明：待确认与申诉都汇入同一队列，", 10.5),
    WF.lb(994, 472, "家长在此一次性处理，避免分散在多个页面。", 10.5),
    WF.lb(994, 508, "本页不展示孩子的兴趣标签明细之外的", 10.5),
    WF.lb(994, 526, "任何浏览历史；申诉理由由孩子主动提供。", 10.5),
    WF.lb(994, 574, "若家长放行，孩子端立即显示", 10.5, C.label),
    WF.lb(994, 592, "“已放行，可以继续看了”。", 10.5, C.label),

    arrow({ from: [940, 330], to: [966, 330], label: "提交后", labelDy: -8 }),

    note({ x: 40, y: 680, s: "界面元素标注说明：", fs: 12.5, fill: C.head, bold: true }),
    note({ x: 40, y: 704, s: "· 用户输入元素：兴趣标签（可增删的标签行 + “＋添加一个兴趣”）、申诉理由类型（单选，绿底为当前选中）、补充说明（文本框，限 50 字）；", fs: 11.5 }),
    note({ x: 40, y: 724, s: "· 用户命令元素：标签页的主按钮“保存修改”（需孩子确认）与次按钮“删除选中”；申诉页的主按钮“提交申诉”与次按钮“返回继续浏览”；", fs: 11.5 }),
    note({ x: 40, y: 744, s: "· 静态元素：可见范围说明卡、原干预记录只读区；动态元素：标签增删后的权重显示、可见范围文案随年龄档变化、申诉提交后按钮变为“已提交（待家长处理）”；", fs: 11.5 }),
    note({ x: 40, y: 764, s: "· 状态覆盖：空（无标签时显示“还没有标签，可以自己加，或等家长在配置时录入”）；错误（保存失败提示“保存失败，请重试”，不回滚已删标签的显示，避免误以为已生效）；人工确认（申诉后等待家长处理，并显示“家长处理后你会看到结果”）；重新操作（家长维持拦截后，孩子可再次申诉，但同一内容的申诉间隔 ≥24 小时，防止反复提交）。", fs: 11.5 }),
    note({ x: 40, y: 800, s: "对应需求：US-15（可知可改兴趣标签）、US-17（申诉 ≤2 次点击）、US-23（明示家长可见范围）、US-26（只显示粗粒度类别）、UC-19（按档控制可见字段）、NFR-V2（家长端不展示、不导出明细）、NFR-U3（申诉与处理均 ≤2 次点击）。", fs: 11.5, fill: C.label }),
  ];
  return { svg: svgWrap({ w: W, h: H, body: body.join("\n") }), w: W, h: H };
}

const r8 = fig8();
const p8 = await renderPng({ name: "E3-图8-界面原型3-兴趣标签与申诉页", svg: r8.svg, w: r8.w, h: r8.h, scale: 2 });
console.log("生成:", p8.pngPath, (p8.bytes / 1024).toFixed(0) + " KB");
