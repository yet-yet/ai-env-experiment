import { svgWrap, box, text, arrow, band, note, C, renderPng } from "./diagram-kit.mjs";

const W = 1340, H = 980;
const P = 26;

const body = [
  text({ x: 40, y: 32, s: "图2  软件总体架构图（分层风格 + 模块结构）", fs: 19, fill: C.head, bold: true }),
  text({ x: 40, y: 54, s: "箭头方向＝依赖与调用方向；虚线箭头＝事件回调/反向通知；每层只允许依赖其下层", fs: 12.5, fill: C.sub }),

  band({ x: 40, y: 76, w: 900, h: 856, title: "青盾（本软件）", edge: C.label, dash: true, fs: 14 }),

  // ---------- 展示层 ----------
  band({ x: 60, y: 108, w: 860, h: 150, title: "展示层  Presentation", fill: "#f9fcff", edge: C.blueEdge, dash: false }),
  box({ x: 60 + P, y: 142, w: 188, h: 66, text: "遮罩与提示视图", sub: ["拦截原因 · 状态提示"], fill: C.blue, fs: 13.5 }),
  box({ x: 60 + P + 200, y: 142, w: 188, h: 66, text: "适龄引导视图", sub: ["3—5 条入口渲染"], fill: C.blue, fs: 13.5 }),
  box({ x: 60 + P + 400, y: 142, w: 188, h: 66, text: "申诉与兴趣页", sub: ["孩子端可看可改"], fill: C.blue, fs: 13.5 }),
  box({ x: 60 + P + 600, y: 142, w: 200, h: 66, text: "家长端网页", sub: ["配置·报警·统计"], fill: C.green, edge: C.greenEdge, fs: 13.5 }),
  note({ x: 60 + P, y: 240, s: "职责：只负责“显示什么、怎么点”，不含任何判定规则；文案由应用层下发，视图不自行措辞（保证 NFR-U2 无贬义措辞）", fs: 11.5 }),

  // ---------- 应用层 ----------
  band({ x: 60, y: 274, w: 860, h: 176, title: "应用层  Application（用例编排）", fill: "#f9fcff", edge: C.blueEdge, dash: false }),
  box({ x: 60 + P, y: 310, w: 196, h: 64, text: "策略编排", sub: ["配置问答→策略对象"], fill: C.blue, fs: 13.5 }),
  box({ x: 60 + P + 208, y: 310, w: 196, h: 64, text: "干预决策", sub: ["刷新/遮盖/减量"], fill: C.blue, fs: 13.5 }),
  box({ x: 60 + P + 416, y: 310, w: 196, h: 64, text: "报警分级与去重", sub: ["L1/L2/L3 + 限流"], fill: C.amber, edge: C.amberEdge, fs: 13.5 }),
  box({ x: 60 + P + 624, y: 310, w: 176, h: 64, text: "时长与睡眠统计", sub: ["连续段/时段累计"], fill: C.blue, fs: 13.5 }),
  box({ x: 60 + P, y: 386, w: 196, h: 50, text: "适龄引导组装", sub: ["入口生成与排序"], fill: C.blue, fs: 13 }),
  box({ x: 60 + P + 208, y: 386, w: 196, h: 50, text: "申诉与待确认队列", sub: ["人工确认闭环"], fill: C.blue, fs: 13 }),
  box({ x: 60 + P + 416, y: 386, w: 196, h: 50, text: "报警送达与重试", sub: ["不丢失 / 未读队列"], fill: C.amber, edge: C.amberEdge, fs: 13 }),
  box({ x: 60 + P + 624, y: 386, w: 176, h: 50, text: "失效检测与审计", sub: ["绕过后通知家长"], fill: C.blue, fs: 13 }),

  // ---------- 领域层 ----------
  band({ x: 60, y: 474, w: 860, h: 128, title: "领域层  Domain（纯逻辑，可单独单元测试，不依赖安卓 API）", fill: "#f9fcff", edge: C.purpleEdge, dash: false }),
  box({ x: 60 + P, y: 508, w: 200, h: 74, text: "分档策略引擎", sub: ["5 档 × 阈值矩阵", "纯函数：输入年龄+时段"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),
  box({ x: 60 + P + 212, y: 508, w: 200, h: 74, text: "干预规则", sub: ["触发枚举 + 四道闸门", "刷新优先，失败降级"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),
  box({ x: 60 + P + 424, y: 508, w: 200, h: 74, text: "报警规则", sub: ["分级·去重键·上限", "时长类去重"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),
  box({ x: 60 + P + 636, y: 508, w: 164, h: 74, text: "可见性规则", sub: ["兴趣分档可见", "任何档位不可追溯"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),

  // ---------- AI 适配层 ----------
  band({ x: 60, y: 626, w: 860, h: 122, title: "AI 能力适配层  AI Adapter（隔离模型实现，便于降级与替换）", fill: "#fbf8ff", edge: C.purpleEdge, dash: false }),
  box({ x: 60 + P, y: 660, w: 246, h: 70, text: "分类器接口 ClassifierPort", sub: ["classify(frame?, text) → 六元组", "超时/不可用即抛出，由上层降级"], fill: C.purple, edge: C.purpleEdge, fs: 13 }),
  box({ x: 60 + P + 258, y: 660, w: 246, h: 70, text: "本地推理实现", sub: ["轻量模型（设备内进程）", "原始画面不出设备（NFR-V1）"], fill: C.purple, edge: C.purpleEdge, fs: 13 }),
  box({ x: 60 + P + 516, y: 660, w: 284, h: 70, text: "规则降级实现", sub: ["关键词 + 白黑名单", "价值与兴趣在此层停用"], fill: C.grey, edge: C.greyEdge, fs: 13 }),

  // ---------- 数据层 ----------
  band({ x: 60, y: 772, w: 860, h: 136, title: "数据层  Data（SQLite + 本机文件）", fill: "#f9fcff", edge: C.blueEdge, dash: false }),
  box({ x: 60 + P, y: 806, w: 168, h: 66, text: "策略库", sub: ["policy / 阈值矩阵"], fill: C.blue, fs: 12.5 }),
  box({ x: 60 + P + 180, y: 806, w: 168, h: 66, text: "干预与报警库", sub: ["event / alert / 去重"], fill: C.blue, fs: 12.5 }),
  box({ x: 60 + P + 360, y: 806, w: 168, h: 66, text: "画像库（敏感）", sub: ["interest_tag 仅本机"], fill: C.red, edge: C.redEdge, fs: 12.5 }),
  box({ x: 60 + P + 540, y: 806, w: 168, h: 66, text: "审计与申诉", sub: ["audit_log / appeal"], fill: C.blue, fs: 12.5 }),
  box({ x: 60 + P + 720, y: 806, w: 108, h: 66, text: "白名单", sub: ["whitelist"], fill: C.blue, fs: 12.5 }),

  // ---------- 层间依赖箭头（内容盒右侧空白带 x=922） ----------
  arrow({ from: [922, 258], to: [922, 274], label: "" }),
  arrow({ from: [922, 450], to: [922, 474], label: "" }),
  arrow({ from: [922, 602], to: [922, 626], label: "" }),
  arrow({ from: [922, 748], to: [922, 772], label: "" }),
  note({ x: 930, y: 273, s: "调用↓", fs: 11.5, fill: C.label }),
  note({ x: 930, y: 470, s: "调用↓", fs: 11.5, fill: C.label }),
  note({ x: 930, y: 622, s: "调用↓", fs: 11.5, fill: C.label }),
  note({ x: 930, y: 768, s: "调用↓", fs: 11.5, fill: C.label }),

  // 反向事件回调：走 x=48 最左侧空白通道；标签放在两段之间的空白带，避免压到任何文字
  arrow({ from: [48, 500], to: [48, 250], label: "", dash: true }),
  arrow({ from: [48, 800], to: [48, 500], label: "", dash: true }),
  text({ x: 56, y: 462, s: "事件回调：时长 / 失效 / 新干预", fs: 11.5, fill: C.sub }),

  // ---------- 右侧 ----------
  band({ x: 968, y: 76, w: 340, h: 250, title: "运行环境与外部依赖", edge: C.greyEdge, dash: true, fs: 14 }),
  box({ x: 988, y: 112, w: 300, h: 76, text: "Android 系统", sub: ["AccessibilityService / 前台服务 / 通知"], fill: C.grey, edge: C.greyEdge, fs: 13 }),
  box({ x: 988, y: 200, w: 300, h: 76, text: "内容平台 App", sub: ["仅界面级操作，无私有接口（ADR-003）"], fill: C.grey, edge: C.greyEdge, fs: 13 }),
  note({ x: 988, y: 296, s: "⚠ 依赖替代方案见 ADR-005：安卓无障碍不可用时，", fs: 11.5, fill: C.redEdge }),
  note({ x: 988, y: 314, s: "   退化为“遮盖 + 时长报警”的弱化模式。", fs: 11.5, fill: C.redEdge }),

  band({ x: 968, y: 350, w: 340, h: 250, title: "并列模块（与安卓客户端同构）", edge: C.blueEdge, dash: true, fs: 14 }),
  box({ x: 988, y: 386, w: 300, h: 88, text: "浏览器扩展（MV3）", sub: ["内容脚本 + 声明式规则", "复用领域层规则（同构移植到 JS）"], fill: C.blue, fs: 13 }),
  box({ x: 988, y: 488, w: 300, h: 88, text: "家长端网页 + 本地 HTTP 服务", sub: ["设备内 Node 运行；局域网访问", "只读 API + 配置下发"], fill: C.green, edge: C.greenEdge, fs: 13 }),

  band({ x: 968, y: 624, w: 340, h: 308, title: "架构风格与取舍", edge: C.label, dash: false, fs: 14 }),
  note({ x: 988, y: 660, s: "采用：分层 + 端口-适配器（六边形）混合", fs: 12.5, fill: C.head, bold: true }),
  note({ x: 988, y: 686, s: "① 分层：展示/应用/领域/数据四层，依赖单向向下；", fs: 11.5 }),
  note({ x: 988, y: 706, s: "② 端口-适配器：模型、无障碍、通知、数据库均为", fs: 11.5 }),
  note({ x: 988, y: 724, s: "   适配器，领域层只依赖接口，便于降级与测试；", fs: 11.5 }),
  note({ x: 988, y: 744, s: "③ 三端同构：安卓端与浏览器扩展共用同一套规则语义，", fs: 11.5 }),
  note({ x: 988, y: 762, s: "   避免同一策略在两个端行为不一致。", fs: 11.5 }),
  note({ x: 988, y: 796, s: "为什么不选 MVC / 微服务：", fs: 12, fill: C.head, bold: true }),
  note({ x: 988, y: 818, s: "· 无 Web 后端与数据库服务器，MVC 的模型-视图-控制器", fs: 11.5 }),
  note({ x: 988, y: 836, s: "  划分对本项目的用例编排帮助有限；", fs: 11.5 }),
  note({ x: 988, y: 858, s: "· 微服务需要常驻服务端，与判定不出设备的隐私要求", fs: 11.5 }),
  note({ x: 988, y: 876, s: "  直接冲突，且一人无法在 17 周内维护多服务部署。", fs: 11.5 }),

  note({ x: 40, y: 960, s: "说明：领域层为纯函数逻辑（可用 Node.js 单元测试先行验证，对应实验2 第 3 周计划）；AI 适配层使模型不可用成为可测试的正常分支，而非异常崩溃。", fs: 11.5 }),
];

const svg = svgWrap({ w: W, h: H, body: body.join("\n") });
const r = await renderPng({ name: "E3-图2-总体架构图", svg, w: W, h: H, scale: 2 });
console.log("生成:", r.pngPath, (r.bytes / 1024).toFixed(0) + " KB");
