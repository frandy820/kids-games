/* ================= bridge 过河石桥 游戏数据（颜色/形状石库 / 章配置 / 语音文案 / 时长模型 / 图标）
   r9 难度改造（2026-09-14，AUDIT-56 #18 红款：AB/ABC 颜色规律=3-4 岁级、ch2 实测"就是找绿色"、
   flat0≈50s 且时长靠演出窗撑）：玩法从"纯续放踩色"改为**规律纠错式**——
   石桥序列完整给出，其中埋一块错石（恰 1 块，位置 ≥ 首个完整周期之后），孩子：
   ① find 找错步：点出错石（点非错石=晃动零惩罚，方向锚"找一找哪块不对"不指认）；
   ② fix 修错步：从 3 块候选石中选对的补上（干扰与应值恰差一属性）；
   ③ 修对后兔子逐石跳过河（演出窗）→ 下一题。
   周期维度超越 ABC：ABCD 四元 / AABB 重复元 / 色+形双属性（红方块→蓝圆石→红方块…，
   错石恰差一属性——同色异形或异色同形）。题面指令全语音承载（§0.19 零文字依赖）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 颜色石库（r9 扩 5 色：abcd 四元周期需 4 色+候选第三干扰需第 5 色）
   name=颜色词 TTS 拼句用 / short=口诀短名 / body=石面主色 / deep=暗部（径向渐变底） */
const COLORS = {
  red:    { name: '红色', short: '红', body: '#E8543F', deep: '#C43B2A' },
  blue:   { name: '蓝色', short: '蓝', body: '#3E82C4', deep: '#2F68A4' },
  green:  { name: '绿色', short: '绿', body: '#47A86B', deep: '#368552' },
  purple: { name: '紫色', short: '紫', body: '#8E5FC6', deep: '#7448A4' },
  orange: { name: '橙色', short: '橙', body: '#F0904A', deep: '#D97E30' }
};
const COLOR_POOL = ['red', 'blue', 'green', 'purple', 'orange'];

/* ---------- 形状库（r9 dual 章：色+形双属性维度的第二维）
   dual 周期元 = (色A, 方) (色B, 圆) 交替；错石/候选干扰与应值恰差一属性 */
const SHAPES = {
  square: { name: '方形' },
  round:  { name: '圆形' }
};
const SHAPE_POOL = ['square', 'round'];

/* ---------- estMs 家族定版字面（r9 启用；四处同步=本定义 / game-main 注释 /
   game-verify 独立副本断言 / build.py 源码级 assert；禁 +300 变体）
   SAPI 拼句/clip 时长估计：n=码点数 */
const estMs = n => n * 345 + 600;

/* ---------- r9 单关推算时长模型（5-6 岁试玩口径，保守下界；SPEC §3-r9）
   SCAN_MS   找错观察窗（按周期长/维度分档：观察 pattern≥1 轮扫视+周期定位+点击）
   FOUND_MS  找错对反馈窗（brg_found ≈1.3s clip+停顿）
   FIX_MS    修错决策窗（3 选 1，干扰恰差一属性的辨别）
   STEP_MS   兔子过河逐石跳步进 / BANK_MS 上对岸窗
   RIGHT_MS  答对窗（brg_right ≈1.9s + 演出等待）
   指引句 fix_do=每关首题播（后续题孩子已会，救援 14s 静置重读）——first 参数与 main 行为一致
   LEVEL_MIN_MS 单关推算时长下限（verify 硬断言：Σ[题句+SCAN+FOUND+(首题指引句)+FIX+走桥+窗] ≥ 40s） */
const SCAN_MS = { ab: 4200, abc: 5200, abcd: 6800, aabb: 6300, dual: 7800 };
const FIX_MS = 3000, FOUND_MS = 1600, STEP_MS = 460, BANK_MS = 900, RIGHT_MS = 2400;
const LEVEL_MIN_MS = 40000;
function quizDurMs(q, first) {                   // 单题推算（r9 纠错双步分账；first=本关首题）
  return estMs(FIXQ_TEXT.length) + SCAN_MS[q.kind] + FOUND_MS +
         (first ? estMs(FIXDO_TEXT.length) : 0) + FIX_MS +
         q.stones.length * STEP_MS + BANK_MS + RIGHT_MS;
}
const levelDurMs = L => L.quizzes.reduce((s, q, i) => s + quizDurMs(q, i === 0), 0);

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%6+1 循环取材；生成关 seeded 随机章参数）
   r9 六章：1 两色找错（AB）/ 2 三色找错（ABC）/ 3 四色找错（ABCD 四元）/
   4 双胞胎桥（AABB 重复元）/ 5 彩色形状桥（色+形双属性）/ 6 花样找错（混合）
   name 供章卡；hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） */
const N_CH = 6;
const CHAPTERS = {
  1: { name: '两色找错', hint: '三种颜色轮流排队的桥来啦，也要找错哦' },   /* 预告 ch2 ABC */
  2: { name: '三色找错', hint: '四种颜色轮流排队的桥，更难找啦' },         /* 预告 ch3 ABCD */
  3: { name: '四色找错', hint: '两块两块挨着排队的桥来啦' },               /* 预告 ch4 AABB */
  4: { name: '双胞胎桥', hint: '石头又有颜色又有形状，要看两样啦' },       /* 预告 ch5 dual */
  5: { name: '彩色形状桥', hint: '接下来什么花样的桥都有，都来考考你' },   /* 预告 ch6 混合 */
  6: { name: '花样找错', hint: '桥变不完啦，你是找错小能手' }             /* 预告生成关 */
};
const GEN_HINTS = ['两色桥找错石头', '三色桥找错石头', '四色桥找错石头',
                   '双胞胎桥找错石头', '彩色形状桥找错石头', '花样桥找错石头'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 30;  // 静态 30 关 = 6 章（r9 六章）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁改 key/text；
   既有 5 键 r9 一字不改，新增 fix_q/fix_do/found 三键——gen_clips.py bridge 块注册）
   题面句 = 固定 clip（纠错题面恒定，零文字依赖由语音承载） */
const FIXQ_TEXT = '小桥上有一块石头放错啦，找一找';
const FIXDO_TEXT = '选一块对的石头，补上去';
const VOICE = {
  watch: { key: 'brg_tut_watch', text: '看！踩着石头过河' },
  turn:  { key: 'brg_tut_turn',  text: '你来走一走' },
  hint:  { key: 'brg_hint',      text: '看看前面的规律' },
  right: { key: 'brg_right',     text: '过河啦，你真棒' },
  wrong: { key: 'brg_wrong',     text: '看看前面踩了什么' },
  fixQ:  { key: 'brg_fix_q',     text: FIXQ_TEXT },      /* r9 找错步题面 */
  fixDo: { key: 'brg_fix_do',    text: FIXDO_TEXT },     /* r9 修错步指引 */
  found: { key: 'brg_found',     text: '找到啦，就是这块' } /* r9 找错对反馈 */
};

const colorWord = c => (COLORS[c] ? COLORS[c].name : '');
const colorShort = c => (COLORS[c] ? COLORS[c].short : '');

/* 题面整句（读题/救援/重听共用）：find 阶段=找错题面；fix 阶段=修错指引（sayR 级） */
function speechOf(q) {
  return q && q.phase === 'fix' ? FIXDO_TEXT : FIXQ_TEXT;
}
/* 教学 pattern 读出（r9：「红 蓝 红 蓝——有块不对哦」行首 period+2 短名连读+找错预告；
   dual 章=色+形双短名（红方块 蓝圆石） */
const chantK = q => Math.min(q.stones.length, q.kind === 'ab' ? 4 : 5);
function chantText(q) {
  const w = q.stones.slice(0, chantK(q)).map(s => colorShort(s.color) + (s.shape ? shapeShort(s.shape) : ''));
  return w.join(' ') + '，有一块不对哦';
}
/* T46 阶段2 pattern 读出段链：首 k 石短名 token clip（brg_t_{色} / dual=brg_t_{色}_sq|_ci）
   + 尾句 brg_t_tail——与 chantText 同域（chantK 单源） */
const chantKeys = q => q.stones.slice(0, chantK(q))
  .map(s => 'brg_t_' + s.color + (s.shape ? (s.shape === 'square' ? '_sq' : '_ci') : ''))
  .concat(['brg_t_tail']);
const shapeShort = sh => (SHAPES[sh] ? (sh === 'square' ? '方' : '圆') : '');

/* ---------- 图标（内嵌 SVG 描线风；石头/河面用 CSS+DOM 构建） */
const ICONS = {
  /* logo：暖底圆牌 + 三块彩石过河 */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M7 29 q7.5 -5.5 15 0 t15 0 v8 h-30 Z" fill="#9FD2C9"/>' +
    '<ellipse cx="15" cy="25" rx="6.2" ry="4.2" fill="#E8543F" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="26.5" cy="20" rx="6.2" ry="4.2" fill="#47A86B" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="34" cy="26.5" rx="4.6" ry="3.4" fill="#D9C6AB" stroke="' + INK + '" stroke-width="2"/></svg>',
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
