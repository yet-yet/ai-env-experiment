import { svgWrap, box, text, arrow, band, note, C, renderPng } from "./diagram-kit.mjs";

const W = 1320, H = 890;

const body = [
  text({ x: 40, y: 32, s: "图1  软件与外部环境关系图（系统上下文图）", fs: 19, fill: C.head, bold: true }),
  text({ x: 40, y: 54, s: "实线框＝本软件（本项目开发）；虚线框＝外部依赖；粗虚线为系统边界", fs: 12.5, fill: C.sub }),

  // ---------- 角色 ----------
  box({ x: 40, y: 100, w: 196, h: 76, text: "家长 / 监护人", sub: ["主要用户", "配置策略、接收报警、裁决申诉"], fill: C.green, edge: C.greenEdge }),
  box({ x: 40, y: 226, w: 196, h: 76, text: "被监护的未成年人", sub: ["次要用户", "使用设备、接收提示、发起申诉"], fill: C.green, edge: C.greenEdge }),

  // ---------- 系统边界 ----------
  band({ x: 300, y: 76, w: 620, h: 760, title: "系统边界：青少年上网内容净化与监护管理助手（青盾）", edge: C.label, dash: true, fs: 14 }),

  // ① 安卓客户端
  band({ x: 320, y: 108, w: 580, h: 232, title: "① 安卓客户端（Kotlin，运行在子女设备上）", fill: "#f9fcff", edge: C.blueEdge, dash: false }),
  box({ x: 340, y: 146, w: 262, h: 64, text: "无障碍服务", sub: ["识别推荐流位置 / 执行刷新换一批"], fill: C.blue }),
  box({ x: 618, y: 146, w: 262, h: 64, text: "遮罩与提示层", sub: ["遮盖、原因说明、适龄引导入口"], fill: C.blue }),
  box({ x: 340, y: 226, w: 262, h: 64, text: "前台服务", sub: ["时长统计 / 连续段 / 睡眠时段"], fill: C.blue }),
  box({ x: 618, y: 226, w: 262, h: 64, text: "本地数据库（SQLite）", sub: ["策略·干预·报警·画像·审计"], fill: C.purple, edge: C.purpleEdge }),

  // ② 本地模型
  band({ x: 320, y: 368, w: 580, h: 142, title: "② 本地模型能力（设备内推理，原始画面与画像不出设备）", fill: "#fbf8ff", edge: C.purpleEdge, dash: false }),
  box({ x: 340, y: 404, w: 170, h: 62, text: "风险分类", sub: ["色情/赌博/毒品…"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),
  box({ x: 524, y: 404, w: 170, h: 62, text: "价值评级", sub: ["有信息量/一般/低质"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),
  box({ x: 708, y: 404, w: 172, h: 62, text: "兴趣匹配", sub: ["引导入口排序"], fill: C.purple, edge: C.purpleEdge, fs: 13.5 }),
  note({ x: 340, y: 492, s: "亮度：三层降级 —— 模型可用 → 规则降级（价值/兴趣停用）→ 兜底（遮盖 + 时长与失效报警）", fs: 11.5 }),

  // ③ 浏览器扩展
  band({ x: 320, y: 538, w: 580, h: 108, title: "③ 浏览器扩展（Chrome Manifest V3，Windows 端）", fill: "#f9fcff", edge: C.blueEdge, dash: false }),
  box({ x: 340, y: 572, w: 262, h: 60, text: "页面拦截", sub: ["域名 + 页面级分档拦截"], fill: C.blue }),
  box({ x: 618, y: 572, w: 262, h: 60, text: "新标签页适龄入口", sub: ["桌面端最完整的引导形态"], fill: C.blue }),

  // ④ 家长端
  band({ x: 320, y: 674, w: 580, h: 142, title: "④ 家长端网页（设备内本地 HTTP 服务提供，家庭局域网访问）", fill: "#f9fcff", edge: C.blueEdge, dash: false }),
  box({ x: 340, y: 708, w: 170, h: 60, text: "策略配置", sub: ["问答式分档 + 预览"], fill: C.blue, fs: 13.5 }),
  box({ x: 524, y: 708, w: 170, h: 60, text: "分级报警", sub: ["L1/L2/L3 队列"], fill: C.blue, fs: 13.5 }),
  box({ x: 708, y: 708, w: 172, h: 60, text: "统计与加白", sub: ["时间构成 / 申诉处理"], fill: C.blue, fs: 13.5 }),

  // ---------- 外部依赖 ----------
  band({ x: 960, y: 76, w: 320, h: 760, title: "外部依赖（非本项目开发）", edge: C.greyEdge, dash: true, fs: 14 }),
  box({ x: 982, y: 126, w: 276, h: 82, text: "Android 系统能力", sub: ["AccessibilityService / 前台服务 /", "本地通知（系统公开接口）"], fill: C.grey, edge: C.greyEdge, fs: 13.5 }),
  box({ x: 982, y: 232, w: 276, h: 82, text: "内容平台 App", sub: ["抖音 / 快手 / 小红书 / B站", "（仅通过界面操作，无私有接口）"], fill: C.grey, edge: C.greyEdge, fs: 13.5 }),
  box({ x: 982, y: 338, w: 276, h: 74, text: "Chrome / Edge 浏览器", sub: ["扩展运行宿主"], fill: C.grey, edge: C.greyEdge, fs: 13.5 }),
  box({ x: 982, y: 436, w: 276, h: 82, text: "推送 / 通知通道", sub: ["本地通知为主；", "可选第三方推送（离线补发）"], fill: C.amber, edge: C.amberEdge, fs: 13.5 }),
  box({ x: 982, y: 542, w: 276, h: 82, text: "家长浏览器", sub: ["Windows 上的 Chrome / Edge", "（局域网内访问家长端网页）"], fill: C.green, edge: C.greenEdge, fs: 13.5 }),
  box({ x: 982, y: 648, w: 276, h: 92, text: "开发期可选：云端 LLM API", sub: ["仅用于标注辅助与效果对照，", "不进入产品运行路径"], fill: C.red, edge: C.redEdge, fs: 13.5 }),
  note({ x: 982, y: 762, s: "说明：本地模型属于本项目集成与调用的能力，但以“进程内推理”方式运行，", fs: 11.5 }),
  note({ x: 982, y: 780, s: "因此画在系统边界之内；云端 LLM 仅在开发期使用，属边界之外。", fs: 11.5 }),

  // ---------- 箭头 ----------
  // 角色 → 系统
  arrow({ from: [236, 134], to: [320, 152], label: "配置 / 处理报警", labelDy: -9 }),
  arrow({ from: [320, 264], to: [236, 264], label: "提示 / 引导 / 申诉", labelDy: -9 }),
  // 系统内部
  arrow({ from: [471, 290], to: [471, 368], label: "分类请求与结果（进程内调用）", labelDx: 0, labelDy: -8 }),
  arrow({ from: [749, 290], to: [749, 674], label: "策略读写 / 统计落库", labelDx: 0, labelDy: -8, dash: true }),
  // 系统 → 外部
  arrow({ from: [900, 178], to: [982, 168], label: "无障碍读取与刷新" }),
  arrow({ from: [900, 258], to: [982, 273], label: "界面操作（滚动 / 点击）", labelDy: -9 }),
  arrow({ from: [900, 592], to: [982, 380], label: "扩展注入", curve: -30 }),
  arrow({ from: [900, 738], to: [982, 480], label: "报警推送", curve: -20 }),
  arrow({ from: [982, 583], to: [900, 700], label: "局域网 HTTP 请求 / 响应", dash: true, labelDy: 16 }),
  arrow({ from: [982, 694], to: [900, 560], label: "开发期调用（不进入运行路径）", dash: true, color: C.redEdge, curve: 20, labelDy: 16 }),

  // 关键约束
  note({ x: 40, y: 380, s: "关键约束（设计前提）", fs: 13.5, fill: C.head, bold: true }),
  note({ x: 40, y: 404, s: "① 不使用 Root、不注入代码、", fs: 11.5 }),
  note({ x: 40, y: 422, s: "   不调用平台私有接口", fs: 11.5 }),
  note({ x: 40, y: 448, s: "② 原始画面与兴趣画像", fs: 11.5 }),
  note({ x: 40, y: 466, s: "   仅在本机处理，不上传", fs: 11.5 }),
  note({ x: 40, y: 492, s: "③ 不读取聊天内容，", fs: 11.5 }),
  note({ x: 40, y: 510, s: "   不申请通知读取权限", fs: 11.5 }),
  note({ x: 40, y: 536, s: "④ 不锁机：时长只产生", fs: 11.5 }),
  note({ x: 40, y: 554, s: "   提醒与报警", fs: 11.5 }),

  note({ x: 40, y: 862, s: "说明：①②③④ 四个模块共用同一份“策略对象”与同一套判定规则；本地数据库与本地模型均运行在子女设备进程内，因此画在系统边界之内，不构成云端依赖。", fs: 11.5 }),
];

const svg = svgWrap({ w: W, h: H, body: body.join("\n") });
const r = await renderPng({ name: "E3-图1-软件与外部环境关系图", svg, w: W, h: H, scale: 2 });
console.log("生成:", r.pngPath, (r.bytes / 1024).toFixed(0) + " KB");
