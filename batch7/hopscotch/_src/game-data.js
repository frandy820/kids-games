/* ================= hopscotch 游戏数据（章配置 / 语音文案 / 图标 / 河边场景 SVG / 时长模型）
   r7 难度改造（AUDIT-56 #12 / 建议行 69）：数域 1-10 扩到 1-20 分段进阶 + 跳 2 格模式（数序模式化）
   + 藏格加大（途中格数字全藏，心算内化数序）。圆石格 S 形蛇形排布：每行 5 格，
   span10=2 行（1→5 / 6→10），span20=4 行（1→5 / 6→10 / 11→15 / 16→20）；
   每格数字大字 + 点数圆点双重冗余显示（11-20=十点阵+个位圆点）；红旗=往前跳，蓝旗=往回跳（§0.19） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥30 按 (ch-1)%6+1 循环六章取材）
   r7 六章：1 顺数 1-10 / 2 跨十顺数 11-20 / 3 倒数 / 4 藏格心算(1-10) / 5 大石头阵(1-20 藏格)
   / 6 跳两格（偶数链 2-4-6-8… + 奇数链 1-3-5-7…，跳 2 递进）
   name 供章末预告；hint=章末预告下一章文案（按"预告下一章"语义写，GEN 文案不带"明天："前缀） */
const CHAPTERS = {
  1: { name: '往前跳',   hint: '要数到二十啦，从十一接着往上数' },
  2: { name: '数到二十', hint: '插蓝旗啦，小兔子要往回跳' },
  3: { name: '往回跳',   hint: '石头藏起数字啦，数一数圆点' },
  4: { name: '猜石头',   hint: '更大的石头阵，数字也藏起来' },
  5: { name: '大石头阵', hint: '两块两块跳，一次跳过一块石头' },
  6: { name: '跳两格',   hint: '新一轮跳格子数数' }
};
const GEN_HINTS = ['顺数往前跳到十', '跨过十数到二十', '拿蓝旗往回跳', '藏数字的石头猜一猜', '大石头阵数圆点', '两块两块跳'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 30;  // 静态 30 关 = 6 章（r7：原 4 章 20 关扩容）
const N_CH = 6;            // 章数（renderDots / 难度章循环）
const CELL_N = 20;         // 圆石格数上限（数域 1-20；每关实际格数=span，由章配置）
const COLS = 5;            // 每行格数（蛇形换行）
/* 各难度章的格数（span）：dch1/4=1-10 两行，dch2/3/5/6=1-20 四行 */
const SPAN = { 1: 10, 2: 20, 3: 20, 4: 10, 5: 20, 6: 20 };

/* ---------- SAPI 拼句时长估计（家族定版字面，禁 +300 变体——四处同步：
   本定义 / game-main 注释 / game-verify 断言 / build.py 字面 assert）
   TTS 全部题面/读题句的最大码点数（r7 时长模型用） */
const estMs = n => n * 345 + 600;
const TTS_MAX_CHARS = 12;  // estMs(12)=4740；最长题面句「两块两块跳，跳到十六」（12 码点，dch6 恒顺向无倒数变体——r7 审查 m-7 注释勘误）

/* ---------- r7 单关推算时长模型（5-6 岁试玩口径，保守下界；SPEC §3-r7 定稿）
   HOP_MS      每跳一格：决策+触摸+兔子跳+报数（数字可见时 1.8s）
   HOP_HIDDEN_MS 下一格数字藏起（藏格章）：须回忆数序不能直接读，心算加成 2.6s
   GOAL_MS     到旗庆祝演出窗（game-main 既有 900ms wait）
   LEVEL_MIN_MS 单关推算时长下限（verify 硬断言：每关 Σ[estMs(题面句长)+Σhop+GOAL] ≥ 40s） */
const HOP_MS = 1800, HOP_HIDDEN_MS = 2600, GOAL_MS = 900, LEVEL_MIN_MS = 40000;
function quizDurMs(q) {                          // 单题推算（直线路径：逐格/逐 2 格走到旗）
  const step = q.mode === 2 ? 2 : 1;
  let ms = 0, pos = q.from;
  for (let k = 0; k < q.len / step; k++) {
    pos += step * q.dir;
    ms += q.hidden.indexOf(pos) >= 0 ? HOP_HIDDEN_MS : HOP_MS;
  }
  return estMs(qSpeech(q).length) + ms + GOAL_MS;
}
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 语音文案（前三条与 voice/clips/manifest.json 严格一致，禁改 key/text——r7 亦一字未动）
   仅前 3 关播 sayP；救援/读题走 sayR；wrong/wrong2 无既有 clip 约束（wrong2 为 r7 新键，
   gen_clips.py hopscotch 块注册）→ KIDS.voice.play 缺 clip 自动整句 TTS 兜底（§0.13）；
   到达目标格=报数+旗帜+chime 音效（庆祝视觉/音效承载，无额外语音） */
const VOICE = {
  watch: { key: 'hop_tut_watch', text: '看！跳格子数数' },
  turn:  { key: 'hop_tut_turn',  text: '你来跳一跳' },
  hint:  { key: 'hop_hint',      text: '听一听，跳到几' },
  wrong: { key: 'hop_wrong',     text: '一格一格跳' },   /* mode1 点非步长格：纠错轻语音 sayW（10s 节流 flat≥3） */
  wrong2:{ key: 'hop_wrong2',    text: '两块两块跳' }    /* r7 mode2（跳两格章）纠错：步长是 2 不是 1 */
};

/* ---------- 中文数词（报数/读题 TTS 用；范围 1-20，r7 扩容） ---------- */
function numCn(n) {
  const D = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  return '二十';
}
/* 题面整句朗读（T46 阶段2：拆段 clip 化，qSpeech 保留=TTS 兜底文案）：
   倒数明示"往回跳"；mode2（跳 2）明示"两块两块"——规则全语音承载（§0.19 视觉+语音双载） */
const qSpeech = q => (q.mode === 2
  ? (q.to > q.from ? '两块两块跳，跳到' : '两块两块往回跳，跳到')
  : (q.to > q.from ? '跳到' : '往回跳，跳到')) + numCn(q.to);
/* T46 阶段2（2026-09-19）：题面拆段键链（hop_p_1-4 方向前缀 + hop_n_1-20 数词，全在 manifest）
   ——与 qSpeech 文本逐段一致；全段在册 queue 拼播 */
const qParts = q => [
  q.mode === 2 ? (q.to > q.from ? 'hop_p_3' : 'hop_p_4') : (q.to > q.from ? 'hop_p_1' : 'hop_p_2'),
  'hop_n_' + q.to
];

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀 / 灰蓝石头色）
   r7 新增双箭头（»：跳 2 格方向标，链上格间跨一格指向下一落点） ---------- */
const FLAG_RED = '#D96A5A', FLAG_BLUE = '#6B8CB8';
function flagSvg(color, dark) {
  return '<svg viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M10 44 V6" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M10 8 L34 14 L10 21 Z" fill="' + color + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="10" cy="45" rx="7" ry="2.6" fill="' + (dark || '#C9BDA8') + '"/></svg>';
}
const chev2 = (d1, d2) => '<svg viewBox="0 0 30 24" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="' + d1 + '" fill="#9FB4C7"/><path d="' + d2 + '" fill="#9FB4C7"/></svg>';
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="22" cy="29" rx="17" ry="12" fill="#C9D3E0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M22 29 V10" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M22 11 L36 15.5 L22 20 Z" fill="' + FLAG_RED + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="15" cy="30" r="1.8" fill="' + INK + '"/><circle cx="22" cy="33" r="1.8" fill="' + INK + '"/>' +
    '<circle cx="29" cy="30" r="1.8" fill="' + INK + '"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  flagR: flagSvg(FLAG_RED),
  flagB: flagSvg(FLAG_BLUE),
  /* 顺数方向小三角（mode1 格间箭头：行内顺向 / 行末下折；纯装饰 pointer-events:none） */
  aR: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 4 L20 12 L6 20 Z" fill="#9FB4C7"/></svg>',
  aL: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18 4 L4 12 L18 20 Z" fill="#9FB4C7"/></svg>',
  aD: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6 L12 20 L20 6 Z" fill="#9FB4C7"/></svg>',
  /* mode2 双箭头（»）：跳 2 格的落点方向（跨过一块石头） */
  aR2: chev2('M3 4 L13 12 L3 20 Z', 'M14 4 L24 12 L14 20 Z'),
  aL2: chev2('M27 4 L17 12 L27 20 Z', 'M16 4 L6 12 L16 20 Z'),
  aD2: chev2('M3 3 L13 10 L3 17 Z', 'M16 3 L26 10 L16 17 Z')
};

/* ---------- 河边场景背景（低干扰，pointer-events:none）：水面 + 波纹 + 芦苇 + 岸 */
function riverSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  s += '<rect width="1000" height="600" fill="#BFE0EA"/>';
  s += '<rect width="1000" height="600" fill="url(#rv-g)"/>';
  s += '<defs><linearGradient id="rv-g" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#CFE9F0"/><stop offset="1" stop-color="#AED7E4"/></linearGradient></defs>';
  const wave = (x, y, w) =>
    '<path d="M' + x + ' ' + y + ' q' + (w / 2) + ' -7 ' + w + ' 0' +
    ' q' + (w / 2) + ' 7 ' + w + ' 0" stroke="#9FCCDA" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>';
  [[80, 70], [420, 55], [760, 75], [180, 545], [560, 555], [860, 540], [300, 300], [700, 310]]
    .forEach((p, i) => { s += wave(p[0], p[1], 34 + (i % 3) * 8); });
  const reed = (x, y, k, flip) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + (flip ? -k : k) + ' ' + k + ')">' +
    '<path d="M0 0 V-52 M0 -52 q-3 -14 -13 -18 M0 -52 q3 -16 12 -20" stroke="#8FAe7E" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="12" cy="-70" rx="4.5" ry="12" fill="#C9A87C" transform="rotate(14 12 -70)"/></g>';
  [[26, 120, 1], [46, 470, .8, 1], [966, 150, 1, 1], [948, 500, .9, 1]].forEach(r => { s += reed(r[0], r[1], r[2] || 1, r[3]); });
  s += '</svg>';
  return s;
}

/* ---------- 点数圆点 DOM（r7：1-10 纯圆点 / 11-20 十点阵+个位圆点）
   n≤10：n 个小圆点 flex 三列换行居中（1-3 一行 / 4-6 两行 / 7-9 三行 / 10 四行）
   n≥11：floor(n/10) 个 .ten 十点阵边框格（内恰 10 小点，2×5）+ n%10 个个位圆点——
   「一个整十 + 几」结构化显示（5-6 岁数感：十进制嵌位），.dots 内 <i> 总数恒等于 n（verify 不变量） */
function dotsHtml(n) {
  let s = '<span class="dots" aria-hidden="true">';
  const tens = Math.floor(n / 10), ones = n % 10;
  for (let t = 0; t < tens; t++) {
    s += '<b class="ten">';
    for (let i = 0; i < 10; i++) s += '<i></i>';
    s += '</b>';
  }
  for (let i = 0; i < ones; i++) s += '<i></i>';
  return s + '</span>';
}
