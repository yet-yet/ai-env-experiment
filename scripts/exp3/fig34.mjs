import { svgWrap, box, text, arrow, band, note, C, renderPng } from "./diagram-kit.mjs";

// ============ 图3：核心数据模型（类图 / ER 风格） ============
export function fig3() {
  const W = 1340, H = 1020;

  const entity = ({ x, y, w, title, fields, fill = C.blue, edge = C.blueEdge, sensitive = false }) => {
    const lineH = 20, headH = 30;
    const h = headH + fields.length * lineH + 12;
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${edge}" stroke-width="1.5"/>`;
    out += `<path d="M${x} ${y + headH} h${w}" stroke="${edge}" stroke-width="1.2"/>`;
    out += text({ x: x + w / 2, y: y + 20, s: title, fs: 13, fill: C.head, bold: true, anchor: "middle" });
    fields.forEach((f, i) => {
      const isKey = f.startsWith("*");
      out += text({ x: x + 10, y: y + headH + 15 + i * lineH, s: f.replace(/^\*/, ""), fs: 11, fill: isKey ? C.head : C.ink, bold: isKey });
    });
    if (sensitive) out += text({ x: x + w - 8, y: y + 20, s: "敏感", fs: 10, fill: C.redEdge, anchor: "end", bold: true });
    return { svg: out, h, x, y, w };
  };

  const E = [];
  // 第一列：配置与状态
  E.push(entity({ x: 70, y: 148, w: 230, title: "Policy 策略", fields: [
    "*policy_id  PK", "device_id  FK", "age_tier 年龄档 (1—5)", "strictness 严格/宽松",
    "soft_limit_min 软阈值", "continuous_limit_min 连续阈值", "sleep_start / sleep_end",
    "sleep_alert_mode 即时/静默", "value_reduce 低质减量开关", "version 版本号", "updated_at"
  ] }));
  const P = E[0];
  E.push(entity({ x: 70, y: 470, w: 230, title: "Device 设备", fields: [
    "*device_id  PK", "child_age 子女年龄", "pair_code_hash 配对码哈希", "mode_on 监护模式开关",
    "last_heartbeat 心跳", "created_at"
  ] }));

  // 第二列：判定与处置
  E.push(entity({ x: 340, y: 148, w: 290, title: "InterventionEvent 干预事件", fields: [
    "*event_id  PK", "policy_id  FK", "ts 发生时间", "app_pkg 应用包名",
    "source 来源(推荐流/搜索)", "risk_class 风险枚举", "age_fit 年龄段枚举",
    "value_rating 价值评级", "action 动作(刷新/遮盖/减量)", "refresh_ok 刷新是否成功",
    "reason 可读依据", "confidence 置信度"
  ] }));
  const IE = E[2];
  E.push(entity({ x: 340, y: 470, w: 290, title: "Alert 报警", fields: [
    "*alert_id  PK", "event_id  FK 可空", "level 级别 (L1/L2/L3)", "alert_class 分类",
    "dedup_key 去重键", "window_start 窗口", "count 合并计数", "delivery 送达状态",
    "retry_n 重试次数", "created_at / delivered_at"
  ] }));

  // 第三列：时长统计
  E.push(entity({ x: 680, y: 148, w: 270, title: "UsageSession 使用会话", fields: [
    "*session_id  PK", "device_id  FK", "start_ts / end_ts", "app_pkg",
    "is_foreground 前台可见", "gap_break 断段 (≥5min)", "in_sleep_window 睡眠时段",
    "is_comm_app 通讯类", "continuous_min 连续累计", "sleep_min 睡眠累计"
  ] }));

  // 第四列：画像 / 申诉 / 例外 / 审计
  E.push(entity({ x: 995, y: 148, w: 270, title: "InterestTag 兴趣标签", fields: [
    "*tag_id  PK", "child_id  FK", "name 粗粒度类别", "weight 权重 0—1",
    "source 录入/自填/行为学习", "created_at / updated_at"
  ], fill: C.red, edge: C.redEdge, sensitive: true }));
  E.push(entity({ x: 995, y: 340, w: 270, title: "Appeal 申诉", fields: [
    "*appeal_id  PK", "event_id  FK", "raised_by 孩子", "reason 申诉理由",
    "status 待处理/放行/维持", "handled_at / handler"
  ] }));
  E.push(entity({ x: 995, y: 528, w: 270, title: "Whitelist 白名单", fields: [
    "*id  PK", "kind 域名/作者/话题/应用", "value 值", "added_by 家长", "created_at"
  ] }));
  E.push(entity({ x: 995, y: 680, w: 270, title: "AuditLog 审计（不可删除）", fields: [
    "*log_id  PK", "actor 家长/系统/孩子", "action 策略/白名单/开关变更",
    "before / after", "ts", "retain_days ≥ 30"
  ], fill: C.grey, edge: C.greyEdge }));

  const body = [
    text({ x: 40, y: 32, s: "图3  核心数据模型（类图 / ER 混合，标 * 为主键）", fs: 19, fill: C.head, bold: true }),
    text({ x: 40, y: 54, s: "全部数据保存在设备本地 SQLite（NFR-V1）；红色标注为敏感数据，任何情况下不上传、不导出", fs: 12.5, fill: C.sub }),

    band({ x: 50, y: 100, w: 270, h: 640, title: "① 配置与状态", edge: C.thin, dash: true, fs: 12.5 }),
    band({ x: 320, y: 100, w: 330, h: 640, title: "② 判定与处置记录", edge: C.thin, dash: true, fs: 12.5 }),
    band({ x: 660, y: 100, w: 310, h: 340, title: "③ 时长统计", edge: C.thin, dash: true, fs: 12.5 }),
    band({ x: 975, y: 100, w: 310, h: 700, title: "④ 画像 / 申诉 / 例外 / 审计", edge: C.thin, dash: true, fs: 12.5 }),

    ...E.map(e => e.svg),

    // 关系（标签统一下移到实体之间的空白带，避免压到字段文字）
    arrow({ from: [300, 220], to: [340, 220], label: "", }),
    note({ x: 320, y: 210, s: "1:N", fs: 10.5, fill: C.sub, anchor: "middle" }),
    arrow({ from: [300, 500], to: [340, 300], label: "", curve: -22 }),
    note({ x: 318, y: 420, s: "1:N", fs: 10.5, fill: C.sub, anchor: "middle" }),
    arrow({ from: [630, 260], to: [680, 260], label: "" }),
    note({ x: 655, y: 250, s: "1:N", fs: 10.5, fill: C.sub, anchor: "middle" }),
    arrow({ from: [630, 520], to: [680, 330], label: "", curve: -18 }),
    note({ x: 618, y: 350, s: "会话聚合", fs: 10.5, fill: C.sub }),
    arrow({ from: [950, 200], to: [995, 200], label: "" }),
    note({ x: 972, y: 250, s: "1:N", fs: 10.5, fill: C.sub, anchor: "middle" }),
    arrow({ from: [1130, 300], to: [1130, 340], label: "" }),
    note({ x: 1136, y: 324, s: "被申诉", fs: 10.5, fill: C.sub }),
    arrow({ from: [950, 340], to: [995, 400], label: "", dash: true, curve: 16 }),

    box({ x: 50, y: 768, w: 940, h: 158, text: "关键约束（写进数据层实现，不只写在文档里）", sub: [
      "① interest_tag 库文件单独加密且不出设备；家长端 API 对 16—18 岁档永不返回 name+weight 组合（NFR-V2）",
      "② 睡眠时段只写 sleep_min 与 in_sleep_window，不写该时段的 app_pkg 明细；通讯类应用 is_comm_app=true 且不计入（NFR-V6）",
      "③ audit_log 仅追加、不提供删除接口，保留 ≥30 天（NFR-S2）；修改策略/白名单必须先通过家长验证（NFR-S1）",
      "④ intervention_event 不保存原始画面或截图，只保存 reason 文本与置信度；价值评级只用于统计，不作为阻断依据（NFR-V3）"
    ], fill: "#f9fcff", edge: C.label, fs: 13, subFs: 11.5, align: "left", pad: 14 }),

    box({ x: 1005, y: 830, w: 270, h: 96, text: "关系基数", sub: ["Policy 1—N InterventionEvent", "Policy 1—N UsageSession", "InterventionEvent 1—N Alert", "InterventionEvent 1—N Appeal"], fill: C.grey, edge: C.greyEdge, fs: 12, subFs: 11 }),

    note({ x: 40, y: 990, s: "说明：Policy 是唯一被三端共享的数据对象（安卓端 / 浏览器扩展 / 家长端读同一份语义）；UsageSession 是时长类报警的唯一事实来源，报警规则只读取其聚合结果，不重复计时。", fs: 11.5 }),
  ];

  return { svg: svgWrap({ w: W, h: H, body: body.join("\n") }), w: W, h: H };
}

// ============ 图4：核心流程顺序图 ============
export function fig4() {
  const W = 1420, H = 1170;
  const lanes = [
    { x: 90, title: "孩子", sub: "使用设备", fill: C.green, edge: C.greenEdge },
    { x: 300, title: "展示层", sub: "遮罩/引导视图", fill: C.blue, edge: C.blueEdge },
    { x: 520, title: "应用层", sub: "干预决策/报警", fill: C.amber, edge: C.amberEdge },
    { x: 740, title: "领域层", sub: "策略与规则", fill: C.purple, edge: C.purpleEdge },
    { x: 950, title: "AI 适配层", sub: "本地模型", fill: C.purple, edge: C.purpleEdge },
    { x: 1160, title: "家长端", sub: "报警接收", fill: C.green, edge: C.greenEdge }
  ];
  const TOP = 150, BOT = 1132;

  let out = [];
  out.push(text({ x: 40, y: 32, s: "图4  核心流程顺序图：一次“推荐流命中 → 刷新换一批 / 遮盖引导 → 分级报警”", fs: 19, fill: C.head, bold: true }));
  out.push(text({ x: 40, y: 54, s: "实线箭头＝调用；虚线箭头＝返回或异步事件；★ 标注为人工确认点；虚线框为失败与降级分支", fs: 12.5, fill: C.sub }));

  lanes.forEach(l => {
    out.push(box({ x: l.x, y: TOP - 62, w: 150, h: 52, text: l.title, sub: [l.sub], fill: l.fill, edge: l.edge, fs: 13.5, subFs: 10.5 }));
    out.push(`<path d="M${l.x + 75} ${TOP - 10} L${l.x + 75} ${BOT}" stroke="${C.thin}" stroke-width="1.2" stroke-dasharray="5 5"/>`);
  });

  const ROW = 40;
  const msg = (i, from, to, label, dash = false, color = C.sub, dy = 0) => {
    const y = TOP + 20 + i * ROW + dy;
    const x1 = lanes[from].x + 75, x2 = lanes[to].x + 75;
    if (from === to) {
      out.push(`<path d="M${x1} ${y} h40 v18 h-40" fill="none" stroke="${color}" stroke-width="1.4" marker-end="url(#ah)"${dash ? ' stroke-dasharray="6 4"' : ""}/>`);
      out.push(text({ x: x1 + 48, y: y + 5, s: label, fs: 11, fill: color }));
    } else {
      out.push(arrow({ from: [x1, y], to: [x2, y], label, dash, color }));
    }
  };

  // ---- 主流程 ----
  msg(0, 0, 1, "滑动推荐流（内容进入视野）");
  msg(1, 1, 2, "onContentDetected(节点文本, 来源=推荐流)", true);
  msg(2, 2, 3, "decide(context, 年龄档)");
  msg(3, 3, 3, "查策略阈值 + 命中风险/年龄段枚举？");
  msg(4, 3, 4, "classify(frame?, text) 请求判定");
  msg(5, 4, 3, "返回六元组 {风险类别, 价值, 动作建议, 依据, 置信度}", true, C.purpleEdge);
  msg(6, 3, 2, "返回决策（刷新 / 遮盖+引导 / 减量 / 待确认）", true);
  msg(7, 2, 2, "四道闸门检查（冷却 / 连续 / 单日 / 同类收敛）");
  msg(8, 2, 0, "执行刷新换一批 或 渲染遮盖 + 3—5 条适龄引导入口");

  // ---- 失败与降级分支（独立区域，不再与消息行重叠）----
  const fY = TOP + 20 + 9 * ROW + 6;
  out.push(band({ x: 300, y: fY, w: 620, h: 108, title: "失败与降级分支（必须显式处理，不得静默放行）", edge: C.redEdge, dash: true, fs: 12.5, fill: "#fffafa" }));
  out.push(note({ x: 312, y: fY + 46, s: "① 模型超时 / 不可用 → 降级为规则判定（价值与兴趣停用），界面标注“降级判断”；", fs: 11, fill: C.redEdge }));
  out.push(note({ x: 312, y: fY + 66, s: "② 刷新失败或触发闸门 → 立即改为遮盖 + 引导（NFR-C3），绝不退化为放行；", fs: 11, fill: C.redEdge }));
  out.push(note({ x: 312, y: fY + 86, s: "③ 置信度落在中间区间 → 遮盖 + 转人工确认，且不产生 L3 报警（AC-6）。", fs: 11, fill: C.redEdge }));

  // ---- 记录与报警 ----
  const base = 18;
  msg(base + 0, 2, 3, "recordEvent(干预事件, 动作, 刷新是否成功)");
  msg(base + 1, 3, 2, "报警分级：风险类 = L3 实时；不适龄类 = 仅统计", true);
  msg(base + 2, 2, 5, "pushAlert(L3, 去重键, 判定依据)");
  msg(base + 3, 5, 5, "送达校验与重试（≤3 次，失败入未读队列）");
  msg(base + 4, 5, 2, "★ 家长处理：加白名单 / 维持拦截 / 调整阈值", true, C.greenEdge);
  msg(base + 5, 2, 0, "策略变更 1 分钟内生效（含孩子端状态提示）");

  out.push(note({ x: 40, y: 1136, s: "说明：① AI 适配层只提供“建议 + 置信度”，动作由应用层与领域层决定，模型不直接决定拦截；② 人工确认点两处：中间区间待确认队列、家长对 L3 报警的处置；", fs: 11.5 }));
  out.push(note({ x: 40, y: 1156, s: "③ 连续使用满 180 分钟、睡眠时段累计超阈值时走同一条报警通道，仅事件来源不同。", fs: 11.5 }));

  return { svg: svgWrap({ w: W, h: H, body: out.join("\n") }), w: W, h: H };
}

const r3 = fig3();
const p3 = await renderPng({ name: "E3-图3-核心数据模型图", svg: r3.svg, w: r3.w, h: r3.h, scale: 2 });
console.log("生成:", p3.pngPath, (p3.bytes / 1024).toFixed(0) + " KB");

const r4 = fig4();
const p4 = await renderPng({ name: "E3-图4-核心流程顺序图", svg: r4.svg, w: r4.w, h: r4.h, scale: 2 });
console.log("生成:", p4.pngPath, (p4.bytes / 1024).toFixed(0) + " KB");
