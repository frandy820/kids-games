/* ================= sortsize 大小排序 游戏数据（章配置 / emoji 库 / 大小阶梯 / 题面句 / 图标）
   r19 难度改造（2026-09-18，AUDIT-56 #15 黄款）：6-7 物相近档 + 双属性排序（先大小再颜色
   稳定双键）+「第 N 大」序数题（AUDIT 建议 L93 三条全上）。
   玩法三型（q.kind）：
   - sort 全排序：题面语音给方向（从最大的开始/从最小的开始），下方 6-7 个同种 emoji
     （font-size 级差缩放，相近档梯度收窄——需逐对比较而非一眼极值），按方向逐个点选。
   - dual 双属性：6 物=3 档尺寸×红蓝两色（每档恰一红一蓝），先按大小排、一样大的按
     题面指定色序（红前/蓝前）——多重排序规则：(尺寸,颜色) 对互异 → 全序唯一（SPEC 先验）。
   - ord 序数：不整排，只点「第 N 大/N 小」的那一个（rank∈[2,n-2]，显示乱序非单调——
     防视觉位置与尺寸序混淆）；题面语音+题面卡 size 序锚圈共同承载。
   点对=emoji 飞入排序条下一格；点错=晃动（不灰化可重点，SPEC §3）；答错零惩罚。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材；生成关 flat≥20 随机章参数）
   r19：ch1 6-7 物相近档（方向恒 big 隔离新负荷）/ ch2 +方向混合 / ch3 双属性 / ch4 序数+混排
   hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '排长队',   hint: '下一次，两头都能开始排哦' },
  2: { name: '两头排队', hint: '下一次，红球蓝球一起排' },
  3: { name: '双色排队', hint: '下一次，找一找第几大' },
  4: { name: '第几大',   hint: '新一轮大小排排队' }
};
const GEN_HINTS = ['排六个七个大小', '从最大的开始排', '从最小的开始排', '大小相近看仔细'];
const CH_LEN = 5;          // 5 题 = 1 关（r19 键基不变：旧档/共享驱动种档兼容）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（5 条 clip 与 voice/clips/manifest.json 严格一致，禁改 key/text）
   题面方向/双属性/序数句=r19 clip 化（sor_q_* 家族，gen_clips.py 零手抄登记）；
   wrong=T46 阶段2（09-19）clip 化 sor_wrong 在册（豁免窗=estMs(本句)+300=4350 冻结契约 I 不动） */
const VOICE = {
  watch: { key: 'sor_tut_watch', text: '看！大个小个排排队' },
  turn:  { key: 'sor_tut_turn',  text: '你来排一排' },
  hint:  { key: 'sor_hint',      text: '比一比大小，排一排试试哦' },
  wrong: { key: 'sor_wrong',     text: '再想一想，先点哪个呀' }   /* 纠错轻语音 sayW（10s 节流 flat≥3）；T46 阶段2（09-19）keyless→clip 化（豁免窗 estMs(10)+300=4350 冻结契约不动，clip 2976ms+300≤4350 联动核过） */
};
/* ---------- 题面整句（读题/救援/重听共用；r19 三型题面句族）
   sort 方向句 2（既有）/ dual 双属性句 4（方向×首色）/ ord 序数句 8（方向×N） */
const Q_BIG = '从最大的开始，排一排';
const Q_SMALL = '从最小的开始，排一排';
const Q_DUAL = {
  br: '从最大的开始排，一样大的，红皮球排在前面',
  bb: '从最大的开始排，一样大的，蓝皮球排在前面',
  sr: '从最小的开始排，一样大的，红皮球排在前面',
  sb: '从最小的开始排，一样大的，蓝皮球排在前面'
};
const ORD_CN = { 2: '二', 3: '三', 4: '四', 5: '五' };   /* 序数域 2-5（SPEC §-r19 序数域） */
const ordText = (order, rank) =>
  '从最' + (order === 'big' ? '大' : '小') + '的开始数，第' + ORD_CN[rank] + '个，是哪一个呀';
const qSpeech = q =>
  q.kind === 'dual' ? Q_DUAL[q.order[0] + q.first] :
  q.kind === 'ord' ? ordText(q.order, q.rank) :
  (q.order === 'big' ? Q_BIG : Q_SMALL);
/* 题面句 clip 键（queue 段；缺 clip 时 core 走 TTS 兜底——build 对账 manifest 全在场） */
const qKeyOf = q =>
  q.kind === 'dual' ? 'sor_q_d' + q.order[0] + q.first :
  q.kind === 'ord' ? 'sor_q_o' + q.order[0] + q.rank :
  'sor_q_' + q.order;

/* ---------- emoji 库（8 种；sort/ord 题一题一种；dual 用双色皮球） */
const KINDS = {
  cat:     { e: '🐱', name: '小猫' },
  dog:     { e: '🐶', name: '小狗' },
  bear:    { e: '🐻', name: '小熊' },
  rabbit:  { e: '🐰', name: '小兔' },
  apple:   { e: '🍎', name: '苹果' },
  ball:    { e: '⚽', name: '皮球' },
  balloon: { e: '🎈', name: '气球' },
  star:    { e: '⭐', name: '星星' }
};
const KIND_IDS = Object.keys(KINDS);
const DUAL_KIND = 'duo';
const DUAL_COLORS = {
  r: { e: '🔴', name: '红皮球' },
  b: { e: '🔵', name: '蓝皮球' }
};

/* ---------- 大小阶梯 SIZE_LADDER（SPEC §-r19 梯度表；级差保证视觉可判）
   值=emoji font-size px。先验：相邻线性差 ≥6px；相近档比 ≈1.16-1.19（≥3× Weber 分数
   ~5% 线性 JND）→ 收窄但仍人眼可判序，禁数学不可解；明显档比 ≥1.40。
   dual 阶梯=3 档，每档恰出 2 物（一红一蓝）→ (尺寸,颜色) 对互异 → 双键全序唯一 */
const SIZE_LADDER = {
  obv6:      [19, 27, 39, 55, 77, 108],
  close6:    [34, 40, 47, 55, 64, 75],
  close7:    [32, 38, 44, 52, 61, 71, 84],
  dualObv:   [30, 45, 68],
  dualClose: [40, 47, 55]
};
/* 级差合格带（verify/structWhy 断言：相邻比落带内；明显 ≥1.40 / 相近 1.1-1.26） */
const RATIO_BAND = { obvious: [1.4, 1.62], close: [1.1, 1.26] };
const tierBand = t => (t === 'obv6' || t === 'dualObv') ? RATIO_BAND.obvious : RATIO_BAND.close;

/* ---------- 每章题面计划 QUIZ_PLAN（qi=题序 0 基；r19 三机制爬坡）
   热身律（承家族约定）：每章 qi0 给已学形态/明显档样本——新机制首现不带新负荷叠加。
   ord 字段=方向覆写（'small'）；缺省 big。dual first 缺省=随机（qi0 热身固定 'r'）。
   ord rank 缺省=按章规则随机（qi1-2 ∈2-5 / qi3 ∈2-3；qi0 热身固定 2）。 */
const QUIZ_PLAN = {
  1: [ { kind: 'sort', n: 6, tier: 'obv6' },                        /* 热身：明显档 6 物 */
       { kind: 'sort', n: 6, tier: 'close6' },
       { kind: 'sort', n: 6, tier: 'close6' },
       { kind: 'sort', n: 7, tier: 'close7' },
       { kind: 'sort', n: 7, tier: 'close7' } ],
  2: [ { kind: 'sort', n: 6, tier: 'close6' },                      /* 热身 */
       { kind: 'sort', n: 6, tier: 'close6', ord: 'small' },        /* 从小到大首现放第 2 题 */
       { kind: 'sort', n: 7, tier: 'close7' },
       { kind: 'sort', n: 7, tier: 'close7' },
       { kind: 'sort', n: 7, tier: 'close7' } ],
  3: [ { kind: 'dual', n: 6, tier: 'dualObv', first: 'r' },         /* 热身：明显档隔离颜色规则 */
       { kind: 'dual', n: 6, tier: 'dualClose' },
       { kind: 'dual', n: 6, tier: 'dualClose' },
       { kind: 'dual', n: 6, tier: 'dualClose' },
       { kind: 'dual', n: 6, tier: 'dualClose' } ],
  4: [ { kind: 'ord', n: 6, tier: 'obv6', rank: 2 },                /* 热身：明显档第 2 大 */
       { kind: 'ord', n: 7, tier: 'close7' },
       { kind: 'ord', n: 7, tier: 'close7' },
       { kind: 'ord', n: 7, tier: 'close7', ord: 'small' },         /* 第 N 小首现 */
       { kind: 'dual', n: 6, tier: 'dualClose' } ]                  /* 混排回顾 */
};
/* 方向混合章（qi≥1 的 sort/dual 题随机方向；ch1 恒 big 隔离；ch4 序数题方向走计划覆写） */
const MIXED_CH = { 1: false, 2: true, 3: true, 4: true };

/* ---------- 认知时长模型（r19 §-r19 §4；verify+selftest 双钉禁约数）
   estMs=家族 T 全字符口径（SAPI ~345ms/字 + 600 落定余量；吃字符串禁传 .length 数字）
   STEP_MS=每放对一步的决策时长（按档：相近档 6/7 物逐对比较 / dual 双键核验）
   ORD_MS=序数题单决策（在 n 物中确立第 N rank 需部分排序扫描）
   关时长=Σ题[estMs(题句)+steps×STEP_MS 或 ORD_MS+SWITCH_MS]
   静态关：ch1=88650 / ch2=95750 / ch3=137900 / ch4=82760 → SPEC_MODELED_MIN=82760 */
const estMs = s => s.length * 345 + 600;
const STEP_MS = { obv6: 1500, close6: 2100, close7: 2300, dualObv: 2800, dualClose: 3400 };
const ORD_MS = { obv6: 4200, close7: 7600 };
const SWITCH_MS = 400;
const quizDurMs = q => estMs(qSpeech(q)) +
  (q.kind === 'ord' ? ORD_MS[q.tier] : q.items.length * STEP_MS[q.tier]) + SWITCH_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);
const modeled = flat => levelDurMs(genLevel(flat | 0));

/* ---------- 方向渐变示意（零文字依赖，SPEC §3 方向视觉承载）
   从大到小 = 🐘大→🐜小（字号递减）；从小到大 = 🐜小→🐘大（字号递增）
   scale：题面卡用 1.15（大号指令区），排序条起点徽章用 0.95（小号冗余） */
const DIR_SEQ = {
  big:   [{ e: '🐘', s: 34 }, { e: '🐘', s: 25 }, { e: '🐜', s: 17 }, { e: '🐜', s: 12 }],
  small: [{ e: '🐜', s: 12 }, { e: '🐜', s: 17 }, { e: '🐘', s: 25 }, { e: '🐘', s: 34 }]
};
const dirHtml = (order, scale) =>
  '<span class="dir-glyphs">' +
  DIR_SEQ[order].map(g =>
    '<span class="d" style="font-size:' + Math.round(g.s * scale) + 'px">' + g.e + '</span>').join('') +
  '<span class="d-arrow">' + ICONS.arrow + '</span></span>';
/* 双属性色序徽章（SPEC §-r19 双属性规则呈现：首色→次色 + 小箭头，与题面句同向） */
const legendHtml = (first, scale) =>
  '<span class="d-legend">' +
  '<span class="lg" style="font-size:' + Math.round(18 * scale) + 'px">' + DUAL_COLORS[first].e + '</span>' +
  '<span class="lg-arrow">' + ICONS.arrowS + '</span>' +
  '<span class="lg" style="font-size:' + Math.round(18 * scale) + 'px">' + DUAL_COLORS[first === 'r' ? 'b' : 'r'].e + '</span>' +
  '</span>';
/* 序数题面锚（SPEC §-r19 序数域：n 个 size 序圆点，第 rank 位套圈高亮——视觉序=尺寸序，
   与展示乱序区隔，防「第 N 个」位置混淆；big=从大到小排 / small=从小到大排） */
const ordAnchorHtml = (q, scale) => {
  const asc = q.items.slice().sort((a, b) => a - b);
  const row = q.order === 'big' ? asc.slice().reverse() : asc;
  const lo = Math.min.apply(null, row), hi = Math.max.apply(null, row);
  const px = v => Math.round((16 + 22 * (v - lo) / (hi - lo || 1)) * scale);
  return '<span class="ord-anchor">' + row.map((v, i) =>
    '<span class="oa' + (i === q.rank - 1 ? ' ring' : '') + '" style="font-size:' + px(v) + 'px">●</span>'
  ).join('') + '</span>';
};

/* ---------- 图标（内嵌 SVG 描线风；emoji 系统字体渲染，无外链） */
const ICONS = {
  /* logo：暖底圆牌 + 大橙圆→小绿圆 + 箭头（大小排序母题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="13.5" cy="22" r="7.5" fill="#E8975A"/>' +
    '<path d="M21 22 H29 M26 17.5 L31.5 22 L26 26.5" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="34.5" cy="22" r="3.4" fill="#8FBF7F"/></svg>',
  /* 方向箭头（方向示意右端，指向排序条；填充风与暖橙主色一致） */
  arrow: '<svg viewBox="0 0 26 24" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M2 12 H16 M12 6 L21 12 L12 18" stroke="#E8873A" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 色序小箭头（双属性徽章内，红/蓝之间；灰蓝色不与球色混淆） */
  arrowS: '<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M2 8 H11 M8 4 L14 8 L8 12" stroke="#8A9BAE" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
