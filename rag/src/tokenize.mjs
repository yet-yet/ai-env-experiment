// 中文分词（词典最长匹配 + 二元回退）+ 号码/条款号抽取
// 说明：本项目不引入第三方分词依赖，改用“领域词典 + 字符二元”的混合分词，
// 目的是让关键词检索能按词语匹配，同时对未登录词仍有召回。

// 领域词典：来自知识库文本的高频名词与法律用语（人工整理，按长度排序后匹配）
const LEXICON = [
  "可能影响未成年人身心健康的信息", "移动互联网未成年人模式建设指南", "未成年人网络保护条例",
  "儿童个人信息网络保护规定", "个人信息保护影响评估", "未成年人模式", "未成年人专区",
  "敏感个人信息", "儿童个人信息", "个人信息处理者", "网络产品和服务提供者", "智能终端产品",
  "移动智能终端", "应用程序分发平台", "网络保护软件", "未成年人", "监护人", "家长", "孩子",
  "个人信息", "单独同意", "监护人同意", "知情同意", "撤回同意", "最小授权", "最小范围",
  "网络素养", "防沉迷", "沉迷网络", "网络游戏", "网络直播", "网络音视频", "网络社交",
  "在线教育", "教育服务", "内容池", "专属内容池", "适龄", "分龄", "年龄档", "年龄段",
  "使用时长", "使用时段", "连续使用", "休息提醒", "时长管理", "睡眠时段", "软阈值",
  "报警", "硬报警", "软报警", "分级报警", "拦截", "刷新", "换一批", "适龄引导", "兴趣标签",
  "无障碍", "无障碍服务", "申诉", "白名单", "去重", "匿名化", "去标识化", "自动化决策",
  "影响评估", "合规审计", "三方联动", "一键启动", "防绕过", "验证同意", "暂停使用", "豁免",
  "显著提示", "明确告知", "投诉", "举报", "查阅", "复制", "更正", "删除", "保存期限",
  "必要性", "充分必要", "严格保护措施", "专门规则", "专门个人信息处理规则", "安全评估",
  "应急预案", "淫秽", "色情", "赌博", "自残", "自伤", "违法信息", "网络欺凌", "危害",
  "显著方式", "清晰易懂", "目的明确", "正当必要", "诚信", "透明", "合法", "正当", "必要",
  "法律", "行政法规", "部门规章", "指南", "条例", "规定", "标准", "情形", "义务", "责任",
  "设备", "本机", "云端", "上传", "本地", "功能", "权限", "模式", "设置", "默认", "推荐",
  "限制", "频率", "冷却", "闸门", "置信度", "误拦", "误触发", "分类", "判定", "依据"
];

const SORTED_LEXICON = [...new Set(LEXICON)].sort((a, b) => b.length - a.length);
const MAX_TERM = SORTED_LEXICON[0].length;

const STOPWORDS = new Set([
  "的", "了", "和", "与", "及", "或", "在", "是", "有", "我", "你", "他", "她", "它", "请",
  "问", "吗", "呢", "啊", "吧", "把", "被", "对", "从", "到", "为", "以", "就", "都", "也",
  "这", "那", "个", "上", "下", "中", "里", "会", "要", "能", "可", "很", "更", "最", "一个",
  "什么", "怎么", "如何", "哪些", "多少", "是否", "可以", "需要", "应该", "能否", "一下",
  "如果", "然后", "而且", "但是", "因为", "所以", "比如", "例如", "以及", "还有"
]);

const UNIT = "小时|分钟|周岁|岁|时|次|条|天|个月|周|%|元|人|款|项";
const CLAUSE_RE = /^第[一二三四五六七八九十百零〇]+条/;
const NUM_UNIT_RE = new RegExp(`^(\\d+(?:\\.\\d+)?)(${UNIT})`);
const NUM_RE = /^\d+(?:\.\d+)?/;
const ASCII_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*/;

const isCjk = (ch) => /[\u3400-\u4dbf\u4e00-\u9fff]/.test(ch);

export function normalize(text) {
  return String(text).normalize("NFKC").replace(/\u3000/g, " ").toLowerCase();
}

/**
 * 分词：返回按出现顺序排列的 token 数组（含重复），用于 BM25 词频统计。
 */
export function tokenize(text) {
  const s = normalize(text);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);

    // 条款号：第二十八条
    if (isCjk(s[i]) && s[i] === "第") {
      const m = rest.match(CLAUSE_RE);
      if (m) {
        tokens.push(m[0]);
        i += m[0].length;
        continue;
      }
    }

    // 数量 + 单位：180分钟 / 22时 / 12周岁
    const numUnit = rest.match(NUM_UNIT_RE);
    if (numUnit) {
      tokens.push(numUnit[1] + numUnit[2]);
      tokens.push(numUnit[1]);
      i += numUnit[0].length;
      continue;
    }
    const numOnly = rest.match(NUM_RE);
    if (numOnly) {
      tokens.push(numOnly[0]);
      i += numOnly[0].length;
      continue;
    }

    // 西文与数字标识
    const ascii = rest.match(ASCII_RE);
    if (ascii) {
      tokens.push(ascii[0]);
      i += ascii[0].length;
      continue;
    }

    if (isCjk(s[i])) {
      // 词典最长匹配
      let matched = null;
      const maxLen = Math.min(MAX_TERM, s.length - i);
      for (let len = maxLen; len >= 2; len -= 1) {
        const cand = s.slice(i, i + len);
        if (SORTED_LEXICON.includes(cand)) {
          matched = cand;
          break;
        }
      }
      if (matched) {
        tokens.push(matched);
        i += matched.length;
        continue;
      }
      // 二元回退：与下一个汉字组成二元词
      if (i + 1 < s.length && isCjk(s[i + 1])) {
        tokens.push(s.slice(i, i + 2));
        i += 1;
        continue;
      }
      tokens.push(s[i]);
      i += 1;
      continue;
    }

    i += 1; // 标点、空白、其他符号丢弃
  }
  return tokens.filter((t) => {
    if (/\d/.test(t)) return true; // 含数字的词元一律保留
    if (STOPWORDS.has(t)) return false;
    // 由两个停用字组成的二元词（如“的了”“用的”）没有检索价值
    if (t.length === 2 && isCjk(t[0]) && isCjk(t[1]) && STOPWORDS.has(t[0]) && STOPWORDS.has(t[1])) return false;
    return true;
  });
}

/** 去重后的词集合，用于计算查询与片段的关键词重合 */
export function tokenSet(text) {
  return new Set(tokenize(text));
}

/** 拆成句子（保留句末标点），用于切分与引用定位 */
export function splitSentences(text) {
  return text
    .split(/(?<=[。！？；])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const __test = { SORTED_LEXICON, STOPWORDS };
