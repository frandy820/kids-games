/* ================= conserve 数量守恒 游戏数据（场景封闭 3 / 候选文字卡封闭 3 / 章配置 / 语音文案 / SVG）
   玩法（SPEC-BATCH28 §0.69/§3，皮亚杰守恒任务）：题面 = 左右对比场景（rows 两排圆片 /
   pour 两杯水 / clay 两团橡皮泥）+ 变换动画（先展示「两边一样多」→右排拉开 / 右杯倒入
   细高杯 / 右团压成长条→再问「现在哪一边多？」），下方 3 张文字卡（左边的多 / 一样多 /
   右边的多——恒全摆）。
   题型两族：same（变换后仍一样多——守恒核心）与 add（变换后再给某边 +1/-1，答案=指定边
   ——防「恒答一样多」策略性通过，每关 same 与 add 混出）。
   点对 = 场景放大跳 + 小兔子滑入 + 确认句 TTS 拼句（「两边都是六个，一样多」）；
   点错 = 卡摇头 + cnv_wrong + 语义引导句 TTS（rows same=计数证据锚「再数一数，两边都是
   N 个哦」/ pour·clay=不变多不变少句 / add=回溯锚「刚才是两边一样多，后来又给…」），
   1000ms 防重入窗后可重选（探索不罚）。
   场景封闭 3（表外不出题）：rows 离散皮亚杰 / pour 连续量 / clay 质量。
   NUMCN 数字映射（契约 L）：1-7 全量，2=「两」——rows 数 5-7 与 add 的 1 全覆盖。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const BLU = '#2E6FB8', ORG = '#E8975A';      // 左蓝右橙（左右可辨颜色锚）

/* ---------- 候选文字卡封闭 3（SPEC §0.69：三卡恒全摆） */
const OPT_TEXTS = ['左边的多', '一样多', '右边的多'];

/* ---------- 数字→汉字映射（契约 L：封闭集全量值 rows 5-7 + add 的 1；2=「两」量词口径） */
const NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七' };

/* ---------- 场景族封闭 3 */
const FAMS3 = ['rows', 'pour', 'clay'];

/* 变换前展示句（TTS 拼句）与变换解说句（动画期间播，SPEC §3 豁免 clip） */
const PRE_SAY = '看，两边一样多';                       // 7 字
const T_SAY = {
  rows: '右边的拉开了，可是数量没有变',                  // 14 字
  pour: '水倒进细高的杯子，水面变高了',                  // 14 字
  clay: '橡皮泥压一压，变成长条啦'                       // 12 字
};

/* add 题变更演出句（变换后追加，动画期间播） */
function addSayOf(q) {
  if (q.family === 'rows') {
    return '又给' + (q.addSide < 0 ? '左边' : '右边') +
           (q.delta > 0 ? '加了一个' : '拿走了一个');      // 8-9 字
  }
  return q.family === 'pour' ? '又往右边倒了一点水' : '又从右边切走了一块';   // 9 字
}

/* 确认句（判对 TTS 拼句，SPEC §3 豁免 clip；rows same 带 N——计数证据锚） */
function confirmOf(q) {
  if (q.kind === 'same') {
    if (q.family === 'rows') return '两边都是' + NUMCN[q.base] + '个，一样多';   // 10 字
    return q.family === 'pour' ? '水倒来倒去，还是一样多' : '压一压捏一捏，还是一样多';   // 11/12 字
  }
  if (q.family === 'rows') {
    const win = q.left.n > q.right.n ? '左边' : '右边';
    return '刚才一样多，现在' + win + '多';               // 11 字
  }
  return q.family === 'pour' ? '又倒进去一点，右边多' : '切走了一块，左边多';   // 10/9 字
}

/* ---------- 错反馈语义引导句（按 family×kind，SPEC §0.69 语义；TTS 拼句豁免）
   rows same=计数证据锚（把守恒落回可数证据，数字 NUMCN 口径 5-7）/
   pour·clay same=不变多不变少句 / add=回溯锚（方向按 addSide，rows 按加减方向） */
function guideOf(q) {
  if (q.kind === 'same') {
    if (q.family === 'rows') return '再数一数，两边都是' + NUMCN[q.base] + '个哦';   // 12 字
    return q.family === 'pour'
      ? '倒来倒去，水没有变多也没有变少哦'                 // 16 字
      : '压一压捏一捏，橡皮泥没有变多也没有变少哦';        // 21 字（最长引导句）
  }
  if (q.family === 'rows') {
    return '刚才是两边一样多，后来又给' + (q.addSide < 0 ? '左边' : '右边') +
           (q.delta > 0 ? '加了' : '拿走了') + '一个哦';   // 20 字
  }
  return q.family === 'pour'
    ? '刚才一样多，后来又往右边倒了一点哦'                 // 17 字
    : '刚才一样多，后来又从右边切走了一块哦';              // 18 字
}

/* ---------- T46 阶段2：变换/追加/确认/引导 clip 键构造（与 gen_clips.py T46 注册 30 键全一致；
   全部整句单键（无拼段），quizIntro 演出窗仍按 estMs(text) 对齐（clip 恒 ≤ estMs 同句） ---------- */
const addKeyOf = q => q.family === 'rows'
  ? 'cnv_add_rows_' + (q.addSide < 0 ? 'l' : 'r') + '_' + (q.delta > 0 ? 'add' : 'take')
  : (q.family === 'pour' ? 'cnv_add_pour' : 'cnv_add_clay');
const confirmKeyOf = q => {
  if (q.kind === 'same') {
    if (q.family === 'rows') return 'cnv_cf_same_rows_' + q.base;
    return q.family === 'pour' ? 'cnv_cf_same_pour' : 'cnv_cf_same_clay';
  }
  if (q.family === 'rows') return q.left.n > q.right.n ? 'cnv_cf_rows_l' : 'cnv_cf_rows_r';
  return q.family === 'pour' ? 'cnv_cf_pour' : 'cnv_cf_clay';
};
const guideKeyOf = q => {
  if (q.kind === 'same') {
    if (q.family === 'rows') return 'cnv_g_same_rows_' + q.base;
    return q.family === 'pour' ? 'cnv_g_same_pour' : 'cnv_g_same_clay';
  }
  if (q.family === 'rows')
    return 'cnv_g_rows_' + (q.addSide < 0 ? 'l' : 'r') + '_' + (q.delta > 0 ? 'add' : 'take');
  return q.family === 'pour' ? 'cnv_g_pour' : 'cnv_g_clay';
};

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '数一数比一比', hint: '圆片要拉开变魔术啦' },     // 预告 ch2 间距变换
  2: { name: '拉开看一看',   hint: '倒水和捏泥巴要来啦' },     // 预告 ch3 倒水+橡皮泥
  3: { name: '倒水捏泥巴',   hint: '全部混在一起，大挑战来啦' }, // 预告 ch4 混合
  4: { name: '大挑战',       hint: '新一轮比一比开始啦' }      // 预告生成关
};
const GEN_HINTS = ['数一数，直接比一比',       // dch1 直接比
                   '拉开了也一样多',           // dch2 间距变换
                   '倒水捏泥巴，不变多不变少', // dch3 pour·clay
                   '大集合，想好了再选'];      // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=cnv_ 非 con_
   ——con_ 已被 batch5/connect 占用，撞前缀=覆盖 manifest 键+错音频）
   clip 实长（SPEC-BATCH28 §4）：watch 2712/turn 1848/hint 2232/right 2496/wrong 2184/q 1680 */
const VOICE = {
  watch: { key: 'cnv_tut_watch', text: '看！哪一边多' },
  turn:  { key: 'cnv_tut_turn',  text: '你来比一比' },
  hint:  { key: 'cnv_hint',      text: '先数一数再比' },
  right: { key: 'cnv_right',     text: '比对啦，真厉害' },
  wrong: { key: 'cnv_wrong',     text: '先数一数再说' },
  q:     { key: 'cnv_q',         text: '哪一边多' }
};

/* ---------- 场景 SVG（viewBox 0 0 360 150；phase 三相：pre 变换前 / post 变换后 / postadd 变更后）
   rows：上排=左（蓝圆片），下排=右（橙圆片）；pre 两排紧凑对齐等量，post 下排拉开变长，
         postadd 某边 ±1 个（多=该排多一枚，少=该排少一枚）。
   pour：左右两杯同量同形（宽杯）→post 右杯换细高杯液面更高→postadd 右杯液面再高一点。
   clay：左右两团球等大→post 右团压成长条→postadd 长条切走一小块（短一截+分离小块）。 */
const DISC = (cx, cy, fill) =>
  '<circle cx="' + cx.toFixed(1) + '" cy="' + cy + '" r="15" fill="' + fill +
  '" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="' + (cx - 4.5).toFixed(1) + '" cy="' + (cy - 4) + '" r="3.4" fill="#FFF" opacity=".75"/>';

/* rows 排圆片行：n 个圆片，span 占宽（拉开=宽 span=间距拉开视觉锚） */
function rowDiscs(n, cy, fill, span) {
  let s = '';
  const start = 180 - span / 2;                    // 中心 180 对称
  const step = span / n;
  for (let i = 0; i < n; i++) s += DISC(start + step * (i + 0.5), cy, fill);
  return s;
}
/* rows 相位：pre=两排紧凑等量 base；post=下排拉开（仍 base）；postadd=±1 后（add 题）
   下排（右）包 .rs-morph——拉开/增减圆片时整体形变动效（≤2s CSS） */
function rowsSvg(nL, nR, spread) {
  const top = rowDiscs(nL, 48, BLU, 200);          // 上排（左）恒紧凑
  const bot = '<g class="rs-morph">' + rowDiscs(nR, 104, ORG, spread ? 330 : 200) + '</g>';   // 下排（右）拉开=330
  return top + bot;
}
/* pour 杯：宽杯 w=62 h=86 / 细高杯 w=34 h=118；液面高度 lvl（杯内 y 起点） */
function cupSvg(x, w, h, lvl, morph) {
  const cy0 = 132 - h;                             // 杯底 y=132
  const lw = w - 10, lx = x + 5, ly = 132 - lvl;   // 液体块（内缩 5）
  return '<g class="' + (morph ? 'rs-morph' : '') + '">' +
    '<rect x="' + lx + '" y="' + ly + '" width="' + lw + '" height="' + lvl +
    '" rx="4" fill="#7FB3DF" stroke="none"/>' +
    '<path d="M' + lx + ' ' + ly + ' h' + lw + '" stroke="#5A8FC7" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M' + x + ' ' + cy0 + ' v' + (h - 8) + ' q0 8 10 8 h' + (w - 20) +
    ' q10 0 10 -8 v' + (-(h - 8)) + '" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '</g>';
}
/* pour 相位：pre 两同宽杯同液面 52；post 右换细高杯液面 88（更高）；postadd 右 112（再倒一点） */
function pourSvg(phase) {
  const left = cupSvg(52, 62, 86, 52, false);
  let rw = 62, rh = 86, rlvl = 52;
  if (phase !== 'pre') { rw = 34; rh = 118; rlvl = phase === 'postadd' ? 112 : 88; }
  return left + cupSvg(258, rw, rh, rlvl, phase !== 'pre');
}
/* clay 团：左球 r=30 恒；右 pre=球 / post=长条 / postadd=长条短一截+分离小块 */
function claySvg(phase) {
  const ball = (cx, cy, r, fill) =>
    '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * 0.92).toFixed(1) +
    '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="' + (cx - r * 0.3) + '" cy="' + (cy - r * 0.3) + '" r="' + (r * 0.16).toFixed(1) +
    '" fill="#FFF" opacity=".6"/>';
  const left = ball(88, 96, 30, '#E8975A');
  if (phase === 'pre') return left + '<g class="rs-morph">' + ball(268, 96, 30, '#57B368') + '</g>';
  let w = phase === 'postadd' ? 96 : 128;
  let s = left + '<g class="rs-morph"><rect x="' + (268 - w / 2) + '" y="82" width="' + w +
    '" height="28" rx="14" fill="#57B368" stroke="' + INK + '" stroke-width="3.5"/></g>';
  if (phase === 'postadd') {                       // 切走的一小块（分离在旁）
    s += '<g class="add-drop"><rect x="316" y="112" width="24" height="18" rx="9" fill="#57B368" stroke="' + INK + '" stroke-width="3"/></g>';
  }
  return s;
}
/* 场景总装：底垫 + 左右下角「左/右」字标 + 场景体（题面句文字条由 DOM 层浮顶部）
   rows 相位：pre=变换前两排等量紧凑（base/base）；post·postadd=变换后（left.n/right.n
   题面所见 + right.spread 拉开）。pour/clay 相位由 pourSvg/claySvg 自理 */
function sceneSvg(q, phase) {
  let body = '';
  if (q.family === 'rows') {
    /* M1 修复（审查 2026-09-10）：rows 三相区分——pre=等量紧凑；post=等量拉开（变换不改量，
       「数量没有变」与画面一致）；postadd=终量（追加 ±1 落变更侧，视觉增量可见）。
       same 终量=base/base 行为不变；ch1 直达 postadd=「直接比」题面本体不受影响 */
    const pre = phase === 'pre', fin = phase === 'postadd';
    body = rowsSvg(fin ? q.left.n : q.base, fin ? q.right.n : q.base, pre ? 0 : q.right.spread);
  }
  else if (q.family === 'pour') body = pourSvg(phase);
  else body = claySvg(phase);
  return '<svg class="sky" viewBox="0 0 360 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="10" y="18" width="340" height="120" rx="14" fill="#FDF3DF" stroke="none"/>' +
    body +
    '<text x="26" y="142" font-size="15" font-weight="bold" fill="' + INK + '" font-family="KaiTi,STKaiti,sans-serif">左</text>' +
    '<text x="330" y="142" font-size="15" font-weight="bold" fill="' + INK + '" font-family="KaiTi,STKaiti,sans-serif" text-anchor="end">右</text>' +
    '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 天平意象（左右一样多） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 10 v22 M12 32 h20" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M10 18 h24" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="15" cy="24" r="4" fill="' + BLU + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="29" cy="24" r="4" fill="' + ORG + '" stroke="' + INK + '" stroke-width="2"/></svg>',
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
