import { svgWrap, box, text, arrow, band, note, C, renderPng } from "./diagram-kit.mjs";

// ===================== 图5：页面结构与导航关系 =====================
function fig5() {
  const W = 1400, H = 790;
  const pg = (x, y, w, h, title, items, fill = C.blue, edge = C.blueEdge, tag = "") => {
    const o = [];
    o.push(box({ x, y, w, h, text: "", fill: "#ffffff", edge, r: 8 }));
    o.push(`<path d="M${x} ${y + 34} h${w}" stroke="${edge}" stroke-width="1.2"/>`);
    o.push(`<circle cx="${x + 14}" cy="${y + 17}" r="4" fill="${edge}"/>`);
    o.push(`<circle cx="${x + 28}" cy="${y + 17}" r="4" fill="${edge}" opacity="0.55"/>`);
    o.push(text({ x: x + 42, y: y + 22, s: title, fs: 12.5, fill: C.head, bold: true }));
    if (tag) o.push(text({ x: x + w - 8, y: y + 22, s: tag, fs: 10.5, fill: C.label, anchor: "end" }));
    items.forEach((it, i) => o.push(text({ x: x + 14, y: y + 54 + i * 19, s: it, fs: 11, fill: C.ink })));
    return o.join("\n");
  };

  const body = [
    text({ x: 40, y: 32, s: "图5  页面结构与导航关系图", fs: 19, fill: C.head, bold: true }),
    text({ x: 40, y: 54, s: "实线＝主要前进路径；虚线＝返回/跨端回写；★＝需家长验证（NFR-S1）；所有页面均可一键回到模式状态页", fs: 12.5, fill: C.sub }),

    band({ x: 40, y: 82, w: 440, h: 236, title: "入口层", edge: C.label, dash: true, fs: 13 }),
    pg(70, 116, 180, 152, "孩子设备：通知栏常驻", ["监护模式状态", "今日干预次数", "待确认 1 条", "申诉入口"], C.blue, C.blueEdge, "安卓"),
    pg(272, 116, 180, 152, "家长：浏览器书签", ["局域网地址", "已配对设备", "未读报警数"], C.green, C.greenEdge, "网页"),
    pg(70, 282, 382, 30, "桌面端：新标签页（扩展替换为适龄入口）", [], C.blue, C.blueEdge, "扩展"),

    band({ x: 40, y: 334, w: 440, h: 344, title: "孩子端（日常使用，无家长验证）", edge: C.label, dash: true, fs: 13 }),
    pg(70, 368, 180, 134, "遮罩 / 拦截页", ["跳过原因一句话", "适龄引导入口 ×3—5", "自动“换一批”已完成", "申请家长确认"], C.blue, C.blueEdge),
    pg(272, 368, 180, 134, "兴趣标签页", ["标签列表（粗粒度）", "显示本档家长可见范围", "可增 / 可删"], C.purple, C.purpleEdge),
    pg(70, 520, 382, 136, "申诉页", ["原内容分类与判定依据", "填写理由（≤2 次点击提交）", "提交后进入家长待处理队列", "状态：待处理 / 已放行 / 维持"], C.amber, C.amberEdge),

    band({ x: 520, y: 82, w: 420, h: 596, title: "家长端（改变策略均需家长验证）", edge: C.label, dash: true, fs: 13 }),
    pg(550, 116, 360, 146, "首次配置向导（5 步 ≤3 分钟）", [
      "① 子女年龄 → 年龄档", "② 软阈值 90min / 连续阈值 180min",
      "③ 睡眠时段 22:30—07:00 + 即时/静默", "④ 低质减量开关 + 兴趣方向 2—3 个",
      "⑤ 预览：拦截 / 减量 / 报警示例 → 确认生效"
    ], C.green, C.greenEdge, "★"),
    pg(550, 280, 360, 130, "报警首页", ["未读 L3 高优先级队列", "L2 当日汇总", "每条：时间 · 应用 · 分类 · 依据", "一键：加白名单 / 维持 / 调阈值"], C.green, C.greenEdge),
    pg(550, 428, 170, 124, "统计页", ["总使用时长", "学习 / 娱乐 / 低质占比", "不适龄刷新次数", "报警条数"], C.green, C.greenEdge),
    pg(740, 428, 170, 124, "策略与例外", ["阈值调整 ★", "白名单管理", "豁免应用 / 站点", "兴趣方向管理"], C.green, C.greenEdge, "★"),
    pg(550, 570, 360, 86, "待确认队列与申诉处理", ["中间区间内容确认（放行 / 维持）", "孩子申诉 → 一键放行 → 1 分钟内生效"], C.amber, C.amberEdge),

    band({ x: 970, y: 82, w: 390, h: 596, title: "异常与恢复路径（不得静默失效）", edge: C.redEdge, dash: true, fs: 13, fill: "#fffafa" }),
    box({ x: 1000, y: 116, w: 330, h: 96, text: "权限被关闭 / 应用被卸载", sub: ["孩子端屏幕显式提示“监护模式已失效”", "家长端 1 分钟内 L3 报警（区分两种原因）", "提供“重新启用”引导"], fill: C.red, edge: C.redEdge, fs: 13, subFs: 11 }),
    box({ x: 1000, y: 232, w: 330, h: 96, text: "推送通道失败", sub: ["本地留存 + 重试 ≤3 次（指数退避）", "仍失败 → 家长端未读高优先级队列", "报警本地留存 ≥30 天"], fill: C.red, edge: C.redEdge, fs: 13, subFs: 11 }),
    box({ x: 1000, y: 348, w: 330, h: 96, text: "模型不可用 / 超时", sub: ["降级为规则判定，界面标注“降级判断”", "引导入口回退为该年龄档通用候选", "超时与失效报警不依赖模型，照常触发"], fill: C.amber, edge: C.amberEdge, fs: 13, subFs: 11 }),
    box({ x: 1000, y: 464, w: 330, h: 96, text: "刷新失败或触发闸门", sub: ["立即改为遮盖 + 引导（不静默放行）", "同类连续 2 条即收敛，避免刷新循环", "当日上限 10 次后只遮盖"], fill: C.amber, edge: C.amberEdge, fs: 13, subFs: 11 }),
    box({ x: 1000, y: 580, w: 330, h: 78, text: "加载 / 空数据 / 错误", sub: ["统计为空 → “本周期暂无干预记录”", "断网 → 显示“离线：判定在本机完成”"], fill: C.grey, edge: C.greyEdge, fs: 13, subFs: 11 }),

    arrow({ from: [160, 268], to: [160, 368], label: "点击常驻通知", labelDy: -6 }),
    arrow({ from: [362, 200], to: [550, 320], label: "打开书签 → 未读报警", labelDy: -8, curve: 18 }),
    arrow({ from: [250, 502], to: [250, 520], label: "申请确认", labelDy: -6 }),
    arrow({ from: [180, 368], to: [780, 118], label: "首次使用跳转", dash: true, curve: -60, labelDx: -40, labelDy: -10 }),
    arrow({ from: [910, 262], to: [910, 280], label: "" }),
    note({ x: 916, y: 274, s: "确认生效", fs: 10.5, fill: C.sub }),
    arrow({ from: [730, 552], to: [730, 570], label: "" }),
    note({ x: 736, y: 565, s: "点击待处理", fs: 10.5, fill: C.sub }),
    arrow({ from: [550, 600], to: [452, 590], label: "放行结果回写孩子端（≤60 秒生效）", dash: true, labelDy: 16 }),

    note({ x: 40, y: 758, s: "说明：① 孩子端不出现任何家长验证入口，能改变策略的动作只在家长端且需验证（NFR-S1）；② 右侧五类异常路径在每个页面均可触达，保证“失效可见”而非静默；③ 页面共 11 个（孩子端 3、家长端 5、扩展 1、入口 2），未超出个人项目可完成范围。", fs: 11.5 }),
  ];
  return { svg: svgWrap({ w: W, h: H, body: body.join("\n") }), w: W, h: H };
}

// ===================== 线框助手 =====================
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
  chip: (x, y, w, s, fill = C.blue, edge = C.blueEdge) =>
    box({ x, y, w, h: 26, text: s, fill, edge, r: 13, fs: 11, bold: false }),
  card: (x, y, w, h, title, sub) => {
    let o = box({ x, y, w, h, text: "", fill: "#fbfdff", edge: C.blueEdge, r: 6 });
    o += text({ x: x + 12, y: y + 22, s: title, fs: 12, fill: C.ink, bold: true });
    if (sub) o += text({ x: x + 12, y: y + 41, s: sub, fs: 10.5, fill: C.sub });
    return o;
  },
  row: (x, y, w, h, left, right, fill = "#ffffff") => {
    let o = box({ x, y, w, h, text: "", fill, edge: C.thin, r: 4 });
    o += text({ x: x + 10, y: y + h / 2 + 4, s: left, fs: 11, fill: C.ink });
    o += text({ x: x + w - 10, y: y + h / 2 + 4, s: right, fs: 10.5, fill: C.sub, anchor: "end" });
    return o;
  }
};

// ===================== 图6：家长端配置向导 =====================
function fig6() {
  const W = 1320, H = 880;
  const body = [
    text({ x: 40, y: 32, s: "图6  关键界面原型 1：家长端首次配置向导（入口页 / 核心任务页）", fs: 19, fill: C.head, bold: true }),
    text({ x: 40, y: 54, s: "目标：5 步内、3 分钟内完成配置；每步给出可读说明；第 5 步必须展示真实示例后才能生效（对应 US-01、US-02）", fs: 12.5, fill: C.sub }),

    WF.pg(40, 80, 430, 570, "青盾 · 家长端", "步骤 1—4"),
    WF.lb(66, 144, "步骤 1 / 5　孩子的年龄", 13, C.head),
    WF.lb(66, 164, "年龄决定分档：不满 3 / 3—8 / 8—12 / 12—16 / 16—18 岁", 10.5),
    WF.chip(66, 178, 96, "不满 3 岁"), WF.chip(174, 178, 88, "3—8 岁"),
    WF.chip(274, 178, 100, "8—12 岁 ✓", C.green, C.greenEdge), WF.chip(386, 178, 76, "12—16"),
    WF.chip(66, 212, 76, "16—18"),
    WF.lb(66, 268, "步骤 2 / 5　时长阈值（只报警，不锁机）", 13, C.head),
    WF.inp(66, 282, 190, 34, "每日软阈值：90 分钟", true),
    WF.inp(268, 282, 186, 34, "连续使用阈值：180 分钟", true),
    WF.lb(66, 334, "超阈值只提醒与报警；到点不会禁用应用或锁屏。", 10.5),
    WF.lb(66, 374, "步骤 3 / 5　睡眠时段", 13, C.head),
    WF.inp(66, 388, 156, 34, "22:30", true),
    WF.lb(230, 410, "至", 12),
    WF.inp(252, 388, 156, 34, "07:00", true),
    WF.lb(66, 440, "该时段累计使用 > 30 分钟即报警；通讯类应用不计入。", 10.5),
    WF.lb(66, 466, "通知方式："),
    WF.chip(142, 448, 170, "即时推送 ✓", C.green, C.greenEdge), WF.chip(324, 448, 130, "静默（次日汇总）"),
    WF.lb(66, 514, "步骤 4 / 5　低质减量与兴趣方向", 13, C.head),
    WF.chip(66, 528, 210, "启用低质内容减量 ✓", C.green, C.greenEdge),
    WF.inp(66, 562, 388, 34, "兴趣方向（2—3 个）：恐龙 / 篮球 / 乐高机器人", true),
    WF.lb(66, 614, "兴趣标签仅存本机；孩子可自行增删；家长可见范围随年龄递减。", 10.5),

    WF.pg(500, 80, 400, 570, "预览与确认", "步骤 5 / 5"),
    WF.lb(524, 144, "策略生效前，请确认以下示例符合你的预期", 12.5, C.head),
    WF.card(524, 160, 352, 62, "会被换掉的（示例）", "赌博引流内容 → 自动刷新换一批 + 实时 L3 报警"),
    WF.card(524, 232, 352, 62, "会被减量的（示例）", "连续 5 条标题党 → 降低曝光 + 一次温和提示（不拦截）"),
    WF.card(524, 304, 352, 62, "会报警的（示例）", "连续使用满 180 分钟 → L3；睡眠时段 > 30 分钟 → L3"),
    WF.card(524, 376, 352, 62, "不会被影响的", "搜索查题、网课、词典；主动搜索不受低质规则影响"),
    WF.lb(524, 458, "⚠ 上网课连续 3 小时也会触发“连续使用”报警（可自行调高阈值）", 10.5, "#a8761f"),
    WF.btn(524, 482, 176, 38, "确认并生效（需家长验证）"),
    WF.btn(712, 482, 164, 38, "返回调整", false),
    WF.lb(524, 546, "确认后设备进入监护模式，孩子端显示“当前处于监护模式”。", 10.5),

    WF.pg(930, 80, 350, 570, "模式状态（孩子端可见）", "常驻通知"),
    WF.lb(954, 144, "青盾 · 监护模式运行中", 12.5, C.head),
    WF.card(954, 160, 302, 58, "今日已跳过 3 条", "最近一次：20:14　短视频 · 不适龄"),
    WF.card(954, 228, 302, 58, "今日时长 62 分钟", "学习 18 · 娱乐 40 · 低质 4 分钟"),
    WF.card(954, 296, 302, 78, "1 条待家长确认", "已通知家长；你可以先看别的"),
    WF.btn(954, 388, 302, 36, "查看我的兴趣标签", false),
    WF.btn(954, 432, 302, 36, "对某次干预提出申诉", false),
    WF.lb(954, 494, "本档位（11 岁）家长可以看到：你的兴趣标签与权重。", 10),
    WF.lb(954, 514, "你可以随时删除或新增标签。", 10),
    WF.lb(954, 560, "本页不做任何家长验证；改变策略只能由家长端完成。", 10),

    note({ x: 40, y: 684, s: "界面元素标注说明：", fs: 12.5, fill: C.head, bold: true }),
    note({ x: 40, y: 708, s: "· 用户输入元素：年龄档（单选 chip）、软阈值与连续阈值（数字输入，带单位与默认值）、睡眠时段（时间输入）、兴趣方向（文本输入）；阈值输入限制为 15—600 的整数，睡眠时段结束须晚于开始（跨零点按次日处理）。", fs: 11.5 }),
    note({ x: 40, y: 728, s: "· 用户命令元素：主按钮“确认并生效（需家长验证）”与次按钮“返回调整”，主次以填充色区分；孩子端按钮均为次要样式（只读与申诉，不改变策略）。", fs: 11.5 }),
    note({ x: 40, y: 748, s: "· 静态元素：步骤指示、说明文字、卡片式示例；动态元素：chip 选中态、阈值随年龄档联动的默认值、预览卡片实时更新；操作反馈：确认时显示进度，成功提示“已生效，1 分钟内下发到设备”。", fs: 11.5 }),
    note({ x: 40, y: 768, s: "· 加载 / 空 / 错误状态：预览无强制拦截项时显示“当前档位无强制拦截项”；家长验证失败提示“验证未通过，配置未保存”；断网时显示“离线：配置将在恢复后下发”。", fs: 11.5 }),
    note({ x: 40, y: 790, s: "对应需求：US-01（问答式配置）、US-02（生效前预览）、US-07（不限制时间只报警）、US-27/28（连续与睡眠阈值）、US-29（即时/静默）、NFR-U1（≤3 分钟 ≤5 步）、NFR-S1（家长验证）。", fs: 11.5, fill: C.label }),
  ];
  return { svg: svgWrap({ w: W, h: H, body: body.join("\n") }), w: W, h: H };
}

// ===================== 图7：孩子端日常使用与拦截页 =====================
function fig7() {
  const W = 1320, H = 850;
  const body = [
    text({ x: 40, y: 32, s: "图7  关键界面原型 2：孩子端日常使用与拦截页（核心任务页）", fs: 19, fill: C.head, bold: true }),
    text({ x: 40, y: 54, s: "目标：被换掉/遮住时孩子立刻知道“为什么”和“还能看什么”，且全程不使用贬义措辞（对应 US-12、US-13、NFR-U2）", fs: 12.5, fill: C.sub }),

    WF.pg(60, 84, 380, 640, "抖音 · 推荐流（命中后同位置弹出）", "手机"),
    WF.inp(84, 140, 332, 34, "搜索：恐龙 科普", false),
    box({ x: 84, y: 186, w: 332, h: 148, text: "此内容已自动换掉", sub: ["原因：画面可能不适合你的年龄", "已通知家长（系统自动）"], fill: C.amber, edge: C.amberEdge, fs: 13, subFs: 11 }),
    WF.lb(96, 356, "要不要换个方向看看？", 12, C.head),
    WF.card(84, 368, 332, 48, "恐龙的 10 个冷知识", "搜索词 · 与你最近的兴趣相关"),
    WF.card(84, 424, 332, 48, "三步学会变向运球", "话题 · 与你最近的兴趣相关"),
    WF.card(84, 480, 332, 48, "乐高机械结构入门", "白名单作者 · 家长已允许"),
    WF.card(84, 536, 332, 48, "自然科学知识区", "平台适龄入口"),
    WF.btn(84, 596, 332, 36, "申请家长确认这条内容", false),
    WF.lb(84, 656, "本页不阻断搜索与底部菜单；“换一批”由系统自动完成，无需你操作。", 10.5),
    WF.lb(84, 676, "若刷新不可用，此页改为遮盖并保留上述引导入口（NFR-C3）。", 10.5),
    WF.lb(84, 702, "连续被换掉 3 次后暂停刷新 60 秒，避免内容流来回跳动。", 10, "#a8761f"),

    WF.pg(500, 84, 380, 320, "同一设备的模式状态页", "孩子端"),
    WF.lb(524, 144, "当前：监护模式运行中（8—12 岁档）", 12.5, C.head),
    WF.row(524, 158, 332, 34, "今日已换掉", "3 条"),
    WF.row(524, 196, 332, 34, "今日使用时长", "62 分钟（软阈值 90，未超）"),
    WF.row(524, 234, 332, 34, "连续使用", "46 分钟（阈值 180）"),
    WF.row(524, 272, 332, 34, "睡眠时段累计", "0 分钟（22:30 起算）"),
    WF.lb(524, 322, "本档位家长可以看到：兴趣标签与权重；看不到你搜过什么。", 10.5),
    WF.lb(524, 344, "系统不读取聊天内容；通讯类应用不计入睡眠时段统计。", 10.5),
    WF.lb(524, 374, "★ 反例设计：此处不出现“表现评价”“排名”等评价性内容。", 10, "#a8761f"),

    WF.pg(500, 424, 380, 300, "家长端报警卡片（对应的结果页）", "家长端"),
    box({ x: 524, y: 440, w: 332, h: 30, text: "L3 实时报警 · 未读（高优先级）", fill: C.red, edge: C.redEdge, fs: 11.5, bold: true }),
    WF.row(524, 478, 332, 30, "时间 / 应用", "20:14 · 短视频 App"),
    WF.row(524, 510, 332, 30, "分类", "赌博引流"),
    WF.row(524, 542, 332, 44, "判定依据", "标题含引流话术；画面为赔率截图"),
    WF.row(524, 588, 332, 30, "处置动作", "已刷新换一批 + 已通知家长"),
    WF.btn(524, 628, 158, 34, "加入白名单", false),
    WF.btn(700, 628, 156, 34, "维持拦截", true),
    WF.lb(524, 682, "报警正文不含截图、不含评价性文字（NFR-V1、NFR-U2）。", 10.5),
    WF.lb(524, 702, "同类内容在 10 分钟去重窗口内只推送 1 条，正文标注合并计数。", 10.5),

    arrow({ from: [440, 400], to: [500, 400], label: "同一次事件", labelDy: -8 }),

    note({ x: 40, y: 756, s: "界面元素标注说明：左侧为孩子端核心任务页（换掉 + 引导 + 申诉），右上为模式状态页（对应选题边界“可告知”），右下为家长端结果页——两者是同一次事件的两个视角。", fs: 11.5 }),
    note({ x: 40, y: 776, s: "状态覆盖：加载（内容流换新时显示浅色骨架）／空（引导入口不可用时显示“暂无可用推荐，可去搜索”）／错误（刷新失败提示“已遮盖，不影响使用”）／重新操作（申诉后可返回继续浏览）。", fs: 11.5 }),
    note({ x: 40, y: 796, s: "对应需求：US-03/08（自动换掉）、US-10/13（换后有可看内容）、US-12（知道原因）、US-16（已通知家长）、US-17（申诉）、NFR-U2（一句话无贬义）、NFR-U3（申诉 ≤2 次点击）。", fs: 11.5, fill: C.label }),
  ];
  return { svg: svgWrap({ w: W, h: H, body: body.join("\n") }), w: W, h: H };
}

const r5 = fig5();
const p5 = await renderPng({ name: "E3-图5-页面结构与导航图", svg: r5.svg, w: r5.w, h: r5.h, scale: 2 });
console.log("生成:", p5.pngPath, (p5.bytes / 1024).toFixed(0) + " KB");

const r6 = fig6();
const p6 = await renderPng({ name: "E3-图6-界面原型1-家长端配置向导", svg: r6.svg, w: r6.w, h: r6.h, scale: 2 });
console.log("生成:", p6.pngPath, (p6.bytes / 1024).toFixed(0) + " KB");

const r7 = fig7();
const p7 = await renderPng({ name: "E3-图7-界面原型2-孩子端拦截与引导", svg: r7.svg, w: r7.w, h: r7.h, scale: 2 });
console.log("生成:", p7.pngPath, (p7.bytes / 1024).toFixed(0) + " KB");
