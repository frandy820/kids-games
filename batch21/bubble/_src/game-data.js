/* ================= bubble 游戏数据 v3（r9 难度改造 2026-09-14，AUDIT-56 #17 🔴）
   章配置 / 数词 / 颜色词 / 语音文案 / 图标 / 泡泡与云朵 SVG / 天空背景 / 时长模型 / 计时常量
   v2 机制（2026-09-13 落地）：顶部只显示目标数 N+目标色色卡（当前计数不显示——孩子心里数）；
   场上彩泡三色（蓝/黄/粉），只点目标色才计数；点够后点「好了」按钮提交判定；
   多点提交=wrong（清空重数+miss）/少点提交=wrong（不清空继续点）。
   r9 增量：章后段（每章第 4/5 关，lv>=TIMED_FROM_LV）温和倒计时收尾——每题先静默数数
   （QUIET_SEC(n)），后 12 秒可见倒计时（琥珀条收缩），超时泡泡缓浮不爆 3 秒后温和重来
   （计数清零、零 miss 零惩罚，bub_timeup 引导）；estMs 家族+单关 modeled >=40s 硬断言。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 中文数词 1-10（点数词 TTS 兜底用；ch3 N 上限 8，表给全值域 1-10） ---------- */
const NUM_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const numCn = k => NUM_CN[k - 1];

/* ---------- 颜色词（题面拼句 TTS 兜底；色 key 与钩子 quiz.color 一致） ---------- */
const ALL_COLORS = ['blue', 'yellow', 'pink'];
const COLOR_CN = { blue: '蓝色', yellow: '黄色', pink: '粉色' };
const HUE_OF = { yellow: 1, blue: 2, pink: 4 };               // BUB_COLORS 下标（色板仅取三色）
const COLOR_PAIRS = [['blue', 'yellow'], ['blue', 'pink'], ['yellow', 'pink']];  // ch4 两色场组合

/* ---------- 章配置 v2（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   nMin/nMax 目标点破数区间 / colors 场色板（null=按章规则 seeded：
   dch1 单色场每关抽 1 色、dch4 生成关抽 2-3 色；flat0 恒 ['blue'] 教学演示色）/
   cloudMax 同屏灰云朵上限 / riseMin-riseMax 穿屏秒数 / popMin-popMax 同屏彩泡保有数 /
   bigP 章 4 偶发大泡概率（视觉更大，计数仍 1）。
   name 供章末预告；hint=章末预告下一章文案 ---------- */
const CHAPTERS = {
  1: { name: '点泡泡', nMin: 3, nMax: 5, colors: null, cloudMax: 1,
       riseMin: 3.6, riseMax: 4.4, popMin: 4, popMax: 5, size: 62, bigP: 0,
       hint: '下次泡泡有两种颜色，听好点哪种' },
  2: { name: '两色泡', nMin: 4, nMax: 6, colors: ['blue', 'yellow'], cloudMax: 1,
       riseMin: 2.7, riseMax: 3.3, popMin: 4, popMax: 6, size: 58, bigP: 0,
       hint: '又多了一种颜色，数要更大啦' },
  3: { name: '三色泡', nMin: 5, nMax: 8, colors: ['blue', 'yellow', 'pink'], cloudMax: 2,
       riseMin: 2.2, riseMax: 2.7, popMin: 5, popMax: 6, size: 56, bigP: 0,
       hint: '泡泡有快有慢，数清楚了再按大对勾' },
  4: { name: '混色场', nMin: 3, nMax: 8, colors: null, cloudMax: 2,
       riseMin: 1.8, riseMax: 4.2, popMin: 5, popMax: 6, size: 56, bigP: 0.16,
       hint: '新一轮泡泡数数挑战' }
};
const GEN_HINTS = ['新一轮泡泡数数挑战', '更多泡泡快点一点', '听好颜色再点', '数够了就按大对勾'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案 v2/r9（与 voice/clips/manifest.json 严格一致，禁自造）
   watch/turn/hint/right/wrong_more/wrong_less 六条有 clip（2026-09-13 主线重合成
   完毕，verify ⑦ ±60ms 实长断言锁定）；r9 新增 timeup（倒计时超时温和重来引导）；
   bub_wrong 不建（承原——错误反馈按方向拆两条）；
   题面/数词/颜色词=动态 TTS 拼句兜底 ---------- */
const VOICE = {
  watch:     { key: 'bub_tut_watch',  text: '看！点蓝色的小泡泡' },
  turn:      { key: 'bub_tut_turn',   text: '你来点一点，点够了按大对勾' },
  hint:      { key: 'bub_hint',       text: '数着数，点够了就按大对勾' },
  right:     { key: 'bub_right',      text: '数对啦，泡泡真好玩' },
  wrongMore: { key: 'bub_wrong_more', text: '多点了，重新数一数' },
  wrongLess: { key: 'bub_wrong_less', text: '还差几个，再点点' },
  timeup:    { key: 'bub_timeup',     text: '泡泡睡着啦，不着急，再数一次' },
  enough:    { key: 'bub_enough',     text: '数够了就拍拍小兔子' }   /* T46 阶段2 教学演示强调句 */
};

/* ---------- 题面朗读（T46 阶段2：18 全句 clip bub_q_{n}_{色}；text=兜底文案） ---------- */
const quizSpeech = q => '点破' + numCn(q.n) + '个' + COLOR_CN[q.color] + '泡泡';
const quizKey = q => 'bub_q_' + q.n + '_' + q.color;   /* N∈3-8×蓝/黄/粉=18 键 */
/* 跟数数词 clip（bub_n_1..8）；enough=教学演示强调句 clip（bub_enough） */
const numKey = k => 'bub_n_' + k;

/* ---------- estMs 家族定版字面（r9 启用；四处同步=本定义 / game-main 注释 /
   game-verify 独立副本+数值断言 / build.py 字面 assert；禁 +300 变体）
   SAPI 拼句时长估计：n=码点数 */
const estMs = n => n * 345 + 600;

/* ---------- r9 单关推算时长模型（5-6 岁试玩口径，保守下界；SPEC §2-r9）
   TAP_MS   每点破一只目标色泡：色筛找泡（场上有干扰色+灰云）+追移动目标+触摸+数词
   SUBMIT_MS 提交窗（「好了」按钮 120ms 防重入窗）
   RIGHT_MS 答对窗（bub_right ≈2.95s clip 收尾 + 题间演出）
   LEVEL_MIN_MS 单关推算时长下限（verify 硬断言：Σ[estMs(题句)+ΣTAP+窗] >= 40s）
   题句恒 8 码点（'点破'+数词 1+'个'+颜色词 2+'泡泡'）→ estMs(8)=3360ms */
const TAP_MS = 2000, SUBMIT_MS = 120, RIGHT_MS = 2400, LEVEL_MIN_MS = 40000;
function quizDurMs(q) {                          // 单题推算（干净通关口径，0 错 0 超时）
  return estMs(quizSpeech(q).length) + q.n * TAP_MS + SUBMIT_MS + RIGHT_MS;
}
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- r9 倒计时收尾常量（章后段温和倒计时——超时=重来非惩罚）
   TIMED_FROM_LV 关内题序 >= 此值（0 基）启用倒计时（每章第 4/5 关=章后段；
   静态关与生成关同式，flat0 教学关 lv=0 恒不启用）
   QUIET_SEC(n) 每题静默数数窗（无计时显示；随目标数放宽——n 只影响点数负荷）
   COUNT_SEC   可见倒计时窗（#timer 琥珀条温和收缩，末 3 秒转橙轻脉冲）
   SLEEP_SEC   超时后泡泡缓浮不爆的静息窗（bub_timeup 引导+题面重读，随后自动重来；
   按缓浮钟折算——真实体感=SLEEP_SEC）
   DRIFT_K     静息期泡速系数（缓浮——不罚不停，只慢下来） */
const TIMED_FROM_LV = 3;
const QUIET_SEC = n => 16 + 2 * n;
const COUNT_SEC = 12, SLEEP_SEC = 4, DRIFT_K = 0.2;

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="20" cy="24" r="13" fill="#7FC8E8" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<ellipse cx="15.5" cy="19" rx="4.6" ry="3.2" fill="#FFF" opacity=".85" transform="rotate(-24 15.5 19)"/>' +
    '<circle cx="33" cy="14" r="6.5" fill="#F2A6BE" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<circle cx="31" cy="12" r="2" fill="#FFF" opacity=".9"/>' +
    '<circle cx="36" cy="33" r="3.4" fill="#F7CE55" stroke="#4A3B2E" stroke-width="2.2"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 「好了」提交按钮：绿圆大对勾（图形化零文字） */
  submit: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="26" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="3.4"/>' +
    '<path d="M19 33 l9 9 l17 -18" stroke="#FFF9EE" stroke-width="6.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 初始目标色卡（首题渲染前占位；renderQuiz 按目标色重画） */
  bubbleMini: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="52" r="40" fill="#7FC8E8" stroke="#4A3B2E" stroke-width="5"/>' +
    '<ellipse cx="37" cy="38" rx="13" ry="9" fill="#FFF" opacity=".85" transform="rotate(-24 37 38)"/>' +
    '<circle cx="66" cy="66" r="4.6" fill="#FFF" opacity=".5"/>' +
    '<path d="M14 30 q3 -8 10 -10" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round" opacity=".45"/></svg>'
};

/* ---------- 泡泡色板（6 色轮换，hue=引擎取色下标——v2 场上只用 蓝2/黄1/粉4 三档） ---------- */
const BUB_COLORS = [
  { body: '#F27E6B', hi: '#FFB9AC' },  // 红
  { body: '#F7CE55', hi: '#FDE9A8' },  // 黄
  { body: '#6FBCE8', hi: '#B7E2F7' },  // 蓝
  { body: '#6FCF8A', hi: '#B4E8C3' },  // 绿
  { body: '#F4A3C4', hi: '#FBD0E2' },  // 粉
  { body: '#B48CE8', hi: '#D9C4F4' }   // 紫
];

/* ---------- 场上彩泡 SVG（viewBox 0 0 100 100）：亮色圆+内圈高光+左上光斑+描边 ---------- */
function bubbleSvg(hue) {
  const C = BUB_COLORS[hue % BUB_COLORS.length];
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="52" r="40" fill="' + C.body + '" stroke="' + INK + '" stroke-width="5"/>' +
    '<circle cx="50" cy="54" r="30" fill="' + C.hi + '" opacity=".55"/>' +
    '<ellipse cx="36" cy="36" rx="12" ry="8" fill="#FFF" opacity=".9" transform="rotate(-24 36 36)"/>' +
    '<circle cx="67" cy="68" r="4.4" fill="#FFF" opacity=".55"/></svg>';
}

/* ---------- 灰云朵 SVG（干扰泡，全章在场）：哑光灰蓝云+闭眼小脸——非泡泡的视觉区分 ---------- */
function cloudSvg() {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M24 66 a15 15 0 0 1 4 -29 a19 19 0 0 1 36 -5 a15 15 0 0 1 12 26 q-3 8 -13 8 h-28 q-9 0 -11 -8 Z" ' +
    'fill="#CBD3DA" stroke="' + INK + '" stroke-width="4.5" stroke-linejoin="round"/>' +
    '<path d="M30 58 q-2 5 3 7 M66 58 q3 5 -2 8" stroke="#AEB9C2" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 50 q4 3.5 8 0 M56 50 q4 3.5 8 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="60" rx="4" ry="2.6" fill="#9AA7B1"/></svg>';
}

/* ---------- 天空背景（低干扰，pointer-events:none）：远云 + 小星点 ---------- */
function skySvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  const cloud = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" opacity=".5">' +
    '<path d="M0 30 a14 14 0 0 1 4 -27 a17 17 0 0 1 32 -4 a13 13 0 0 1 11 23 q-3 8 -12 8 h-25 q-9 0 -10 -8 Z" fill="#FFF"/></g>';
  s += cloud(90, 120, 1.15) + cloud(690, 90, 0.9) + cloud(430, 210, 0.7) + cloud(850, 260, 1.0) + cloud(200, 380, 0.8);
  const star = (x, y, r) =>
    '<path d="M' + x + ' ' + (y - r) + ' L' + (x + r * 0.32) + ' ' + (y - r * 0.32) + ' L' + (x + r) + ' ' + y +
    ' L' + (x + r * 0.32) + ' ' + (y + r * 0.32) + ' L' + x + ' ' + (y + r) +
    ' L' + (x - r * 0.32) + ' ' + (y + r * 0.32) + ' L' + (x - r) + ' ' + y +
    ' L' + (x - r * 0.32) + ' ' + (y - r * 0.32) + ' Z" fill="#FFF" opacity=".55"/>';
  [[140, 300], [330, 130], [560, 320], [760, 160], [930, 340], [60, 480], [500, 480], [880, 500], [260, 540], [660, 550]]
    .forEach(p => { s += star(p[0], p[1], 7); });
  return s + '</svg>';
}
