/* ================= feed 喂小兔 游戏数据（食物库 / 章配置 / 语音文案 / 中文数词 / 图标 / 食物 SVG）
   r8 难度改造（2026-09-14，AUDIT-56 #16 红款：按数取物 1-5=4 岁级、ch4 增量题"不用心算"）：
   ① 量域 6-10 分段进阶（dch1 pick 6-7 / dch2 pick 6-8 / dch3 pick 8-10，均单堆；
      dch4 双堆选食 6-9——题面指定食物，点错堆不计入=探索 §0.46）；
   ② left 剩题真心算（dch5）：先取 n∈[7,10] 根 → 兔兔吃掉 eaten∈[2,4] 根（不清屏——
      剩 n-eaten 根搬到餐垫可见）→ 问「还剩几根」：题面 chip 只显 '?'（去自动计数器），
      孩子点数剩物（点一件=亮一个圆点+数词——点数圆点支持，孩子主动发起）后作答=
      从堆里取同样多入碗再喂（取物镜像：读出集合数→产出等量集合）；
      救援禁逐根高亮剩物/碗内（r8 去逐根高亮兜底），只留方向级 pulse+目标堆 breathe；
   ③ combo 双食物合计订单（dch6）：「胡萝卜 a 根 + 青菜 b 棵」a,b∈[2,5]、合计 6-10，
      三堆（两类目标+1 干扰堆），分类别取、合计判定=碗内两类计数逐一匹配才对。
   5-6 岁零文字依赖（§0.19 承 batch11）：题面/选项零文字标签——题面 chip = 食物图形+大数字
   （数字承 bridge ch3 石头显大数字先例；left 问句阶段 chip 显 '?'，combo 显双组图形+数字），
   语义由语音承载；底栏/家长面板除外。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 食物库（SPEC §1 枚举）：key / n 中文名 / mw 量词（题面拼句用，仅语音不出文字） */
const FOODS = {
  carrot: { n: '胡萝卜', mw: '根' },
  greens: { n: '青菜',   mw: '片' },
  apple:  { n: '苹果',   mw: '个' }
};
const FOOD_KEYS = ['carrot', 'greens', 'apple'];
const nameOf = k => FOODS[k].n;
const mwOf = k => FOODS[k].mw;

/* ---------- 中文数词（取物报数/倒读/题面 TTS 用；与 chainsum numCn 同源写法）
   D[0]='零'（取回后碗空报'零'——chainsum 审查 M1 同源：0 概念有数词兜底） */
function numCn(n) {
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  return '二十';
}

/* ---------- estMs 家族定版字面（r8 启用；四处同步=本定义 / game-main 注释 /
   game-verify 断言 / build.py 字面 assert；禁 +300 变体）
   SAPI 拼句时长估计：n=码点数 */
const estMs = n => n * 345 + 600;

/* ---------- r8 单关推算时长模型（5-6 岁试玩口径，保守下界；SPEC §1-r8）
   TAP_MS   每取一件：找堆+触摸+飞行+数词（量域 6-10 后取物次数即主要负荷）
   RIGHT_MS 答对窗（fed_right ≈1.9s + 2100ms 演出等待）
   EAT_MS   吃掉动画窗（eaten 件逐件飞向兔兔 + 交接）
   ASK_MS   left 问句窗 = estMs(15)+estMs(11)+EAT_MS（fed_left_q + fed_left_do 双 clip + 吃动画）
   LEVEL_MIN_MS 单关推算时长下限（verify 硬断言：Σ[estMs(题句)+ΣTAP+窗] ≥ 40s） */
const TAP_MS = 2000, RIGHT_MS = 2400, EAT_MS = 900, LEVEL_MIN_MS = 40000;
const ASK_MS = estMs(15) + estMs(11) + EAT_MS;
function quizDurMs(q) {                          // 单题推算（r8 三题型分账）
  if (q.kind === 'combo')
    return estMs(comboSpeech(q).length) + (q.a + q.b) * TAP_MS + RIGHT_MS;
  if (q.kind === 'left')
    return estMs(quizSpeech(q).length) + q.n * TAP_MS + ASK_MS + q.rem * TAP_MS + RIGHT_MS;
  return estMs(quizSpeech(q).length) + q.n * TAP_MS + RIGHT_MS;
}
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%N_CH+1 循环取材；生成关确定性循环）
   r8 六章：1 喂六七 / 2 数到八 / 3 数到十 / 4 选食物（双堆）/ 5 吃剩啦（left 真心算）/
   6 两个都要（combo 合计订单）。name 供章卡；hint=章末预告下一章文案（GEN 文案不带
   "明天："前缀，core 模板自带） */
const N_CH = 6;
const CHAPTERS = {
  1: { name: '喂六七', hint: '要数到八啦，数字越来越大了' },
  2: { name: '数到八', hint: '马上要数到十，一根一根数清楚' },
  3: { name: '数到十', hint: '有两种食物啦，听清楚小兔子想吃什么' },
  4: { name: '选食物', hint: '小兔子吃完还会剩几根，数一数再喂它' },
  5: { name: '吃剩啦', hint: '两个都想要的来啦，胡萝卜和青菜一起喂' },
  6: { name: '两个都要', hint: '关卡变不完啦，样样都来考考你' }
};
const GEN_HINTS = ['一次拿六七根', '数到八才够吃', '数到十，数仔细',
                   '选对食物再喂它', '吃掉几根数剩余', '两样食物一起喂'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 30;  // 静态 30 关 = 6 章（r8 六章）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁改 key/text；
   既有 5 键 r8 一字未改，新增 left_q/left_do 两键——gen_clips.py feed 块注册）
   题面 = 整句 TTS 拼句（数词+量词+食物词，动态文本不入 clip，承 chainsum 先例）；
   食物词/数词 = TTS 兜底（fed_n_/fed_f_ 不建） */
const VOICE = {
  watch: { key: 'fed_tut_watch', text: '看！喂小兔子吃东西' },
  turn:  { key: 'fed_tut_turn',  text: '你来喂一喂' },
  hint:  { key: 'fed_hint',      text: '数一数，喂给它' },
  right: { key: 'fed_right',     text: '喂好啦，小兔子吃得真香' },
  wrong: { key: 'fed_wrong',     text: '再数一数有几根' },
  leftQ: { key: 'fed_left_q',    text: '小兔子吃掉啦，数一数，还剩几根' },   /* r8 剩题问句 */
  leftDo:{ key: 'fed_left_do',   text: '拿一样多的，喂给小兔子' },           /* r8 剩题作答指引 */
  more:  { key: 'fed_more',      text: '多啦，放回去一根' }                  /* T46 阶段2 超放回句 */
};
/* 题面整句：pick / left 阶段一 = '喂小兔子六根胡萝卜'（SPEC §1 例句形态） */
const quizSpeech = q => '喂小兔子' + numCn(q.n) + mwOf(q.food) + nameOf(q.food);
/* combo 双食物合计订单：'喂小兔子，四根胡萝卜，三片青菜' */
const comboSpeech = q => '喂小兔子，' + numCn(q.a) + mwOf(q.foods[0]) + nameOf(q.foods[0]) +
  '，' + numCn(q.b) + mwOf(q.foods[1]) + nameOf(q.foods[1]);
/* 当前题面句（left 阶段二不读拼句——走 fed_left_q + fed_left_do 双 clip 顺序链） */
const speechOf = q => q.kind === 'combo' ? comboSpeech(q) : quizSpeech(q);
/* T46 阶段2 clip 键（与 manifest 严格一致）：pick/left 全句 15=fed_q_{n}_{食物}（N∈6-10×3）；
   combo 段链 13=fed_c_head+fed_c_{a}_{f1}+fed_c_{b}_{f2}（a,b∈2-5×3=12 段）；
   数词 11=fed_n_0..10（取物/倒读/点数共用）；超放回 1=fed_more */
const quizKey = q => 'fed_q_' + q.n + '_' + q.food;
const comboKeys = q => ['fed_c_head', 'fed_c_' + q.a + '_' + q.foods[0], 'fed_c_' + q.b + '_' + q.foods[1]];
const numKey = k => 'fed_n_' + k;
const speechKeys = q => q.kind === 'combo' ? comboKeys(q) : [quizKey(q)];
/* 当前阶段需求（engine needOf 的数据侧镜像，main/verify 共用；纯函数无状态）：
   pick→{food:n} / left 阶段一→{food:n} 阶段二→{food:rem} / combo→{f1:a, f2:b} */
function needOf(q) {
  const one = {};
  if (q.kind === 'combo') { one[q.foods[0]] = q.a; one[q.foods[1]] = q.b; return one; }
  one[q.food] = q.kind === 'left' && q.phase === 2 ? q.rem : q.n;
  return one;
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕 / 暖橙点缀） */
const ICONS = {
  /* logo：暖底圆牌 + 碗里一根胡萝卜（喂食主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M12 24 a10 7 0 0 0 20 0 Z" fill="#EFE3CD" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<g transform="rotate(-24 23 18)"><path d="M23 10 L26 10 L25 22 L24 22 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M23.5 10 q-1 -4 -4 -5 M24.5 10 q0 -5 2 -6 M25 10 q2 -3 5 -3" stroke="#8FBF7F" stroke-width="2.2" stroke-linecap="round"/></g></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 喂食主按钮：胡萝卜飞向小兔（图标承载语义，零文字——§0.19） */
  feed: '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="46" cy="30" rx="7" ry="15" fill="#F0904A" stroke="' + INK + '" stroke-width="3" transform="rotate(38 46 30)"/>' +
    '<path d="M42 17 q-2 -6 -7 -7 M46 16 q1 -6 5 -8 M49 18 q5 -4 9 -4" stroke="#8FBF7F" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M56 46 q10 -4 14 2" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" fill="none" stroke-dasharray="2 7"/>' +
    '<circle cx="72" cy="62" r="14" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="61" cy="46" rx="4" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-16 61 46)"/>' +
    '<ellipse cx="83" cy="46" rx="4" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6" transform="rotate(18 83 46)"/>' +
    '<circle cx="67" cy="60" r="2.2" fill="' + INK + '"/><circle cx="77" cy="60" r="2.2" fill="' + INK + '"/>' +
    '<path d="M69 67 q3 3 6 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  /* combo 题面加号（双组图形+数字之间的分隔，纯图形零文字） */
  plus: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M20 8 V32 M8 20 H32" stroke="#E8975A" stroke-width="6" stroke-linecap="round"/></svg>'
};

/* ---------- 食物 SVG（viewBox 0 0 64 64，卡通描线；堆内成簇摆放开源供视觉锚定） */
/* 胡萝卜：暖橙长根 + 顶上绿叶（暖橙非红，DESIGN-SPEC §8 色板） */
function carrotSvg() {
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g transform="rotate(30 32 36)">' +
    '<path d="M27 22 L37 22 L34 54 Q32 58 30 54 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 32 h4 M29.4 41 h5.2 M30.6 48 h2.8" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M27.5 22 q-2 -7 -8 -8 M32 22 q0 -8 4 -10 M36.5 22 q4 -6 10 -6" stroke="#8FBF7F" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';
}
/* 青菜：青绿菜叶 + 白菜梗（与胡萝卜形状差异明显：圆叶团 vs 长根） */
function greensSvg() {
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M27 34 h10 l-1.5 18 q-3.5 5 -7 0 Z" fill="#FFFDF7" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 32 q-4 -14 4 -20 q4 -3 6 2 q2 -5 6 -2 q8 6 4 20 Z" fill="#9CCB7A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M32 14 V30 M26 20 q3 4 6 5 M38 20 q-3 4 -6 5" stroke="#7BAA5C" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
    '</svg>';
}
/* 苹果：红圆果 + 短梗绿叶（红色系错误色禁用大红→用暖果红 #E06055，描边 INK 对比度 ≥3:1） */
function appleSvg() {
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M32 16 q1 -6 6 -8" stroke="#8A6B4A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M34 10 q7 -4 11 1 q-6 5 -11 -1 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M32 16 q-12 -4 -17 6 q-4 10 4 20 q6 8 13 6 q7 2 13 -6 q8 -10 4 -20 q-5 -10 -17 -6 Z" fill="#E06055" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 26 q-2 4 0 8" stroke="#FFF9EE" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>' +
    '</svg>';
}
const FOOD_SVG = { carrot: carrotSvg, greens: greensSvg, apple: appleSvg };

/* ---------- 食物堆（pile 按钮内成簇 4 件，静态视觉=取之不尽；点按取物由飞行克隆体承载演出） */
/* 裸件绘制（堆簇/碗内按钮共用：剥掉 FOOD_SVG 外层 <svg> 标签取内部 <g> 群） */
function foodItem(food) {
  return FOOD_SVG[food]().replace(/^<svg [^>]*>/, '').replace(/<\/svg>$/, '');
}
function pileCluster(food) {
  const P = { carrot: [[18, 26, .95, -14], [44, 22, 1, 12], [30, 44, .9, 4], [58, 44, .85, -6]],
              greens: [[16, 24, .95, -8], [44, 20, 1, 6], [26, 46, .9, 4], [56, 44, .85, -4]],
              apple:  [[16, 24, .95, -6], [44, 20, 1, 5], [26, 46, .9, 3], [56, 44, .85, -5]] };
  let s = '<svg viewBox="0 0 96 84" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  P[food].forEach(p => {
    s += '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')">' + foodItem(food) + '</g>';
  });
  return s + '</svg>';
}

/* ---------- 大碗（盛食区底盘，视觉容器；碗内食物为独立按钮由 main 注入） */
function bowlSvg() {
  return '<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMax meet">' +
    '<path d="M18 34 a112 66 0 0 0 224 0 l-6 -14 a8 8 0 0 0 -7 -5 H31 a8 8 0 0 0 -7 5 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<ellipse cx="130" cy="34" rx="112" ry="26" fill="#F6EAD4" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M52 34 a78 17 0 0 0 156 0" stroke="#E8DCC8" stroke-width="3" fill="none"/>' +
    '</svg>';
}
