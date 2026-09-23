/* ================= shapecount 图形计数 游戏数据（r3 难度改造 2026-09-13 版）
   改造 delta（SPEC-BATCH28 §0.68 r3 版本块）：
   ① 数量域升档——ch1 散点计数 5-10（原 2-4）；ch2-3 阵列呈现 10-20（非散点）
   ② 行列阵列计数——r×c 阵列问「一共几个」（分组策略：两个两个数/按行数）；
      ch3+ 缺格=减法结构（r×c-k）
   ③ 颜色×形状双维计数——「红色的圆形有几个」（同色异形+同形异色双干扰必在场）
   ④ ch4 移动干扰——图形缓慢漂移（横摆 ±9px 慢速 CSS 动画，判定层不受影响）
   more 比多少题型整体下线（4-5 岁技能，r3 审计未要求保留）。
   题型四族：count（散点计数，ch4 版带近形干扰）/ grid（满阵行列计数）/
   gridmiss（缺格减法结构）/ dual（颜色×形状双维过滤）。全部数字卡 4 张点选。
   点对 = 目标图形逐个点亮 + 确认句 TTS 拼句（NUMCN 2=两，家族 L）；
   点错 = 卡摇头 + shc_wrong clip + 语义引导句 TTS（count/grid 按所点数字方向；
   gridmiss 结构锚 / dual 两步过滤锚），1000ms 防重入窗后可重选（卡不灰——探索不罚）。
   图形封闭 6（SPEC §0.68）：circle/square/triangle/star/heart/diamond；
   颜色封闭 4（r3 新增）：red红/blue蓝/yellow黄/green绿。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）
const RED = '#E8483C', YEL = '#F5C445', BLU = '#2E6FB8';

/* ---------- 图形封闭 6：id → { n 名, col 默认填色 }（非双维题用默认色）
   近形对靠「形状族差异 + 填色差异」双通道辨析：
   triangle红 / diamond紫（尖角族异色）/ circle橙 / heart粉（圆弧族异色）
   双维题（dual）填色由 COLORS 覆盖（shapeEl 参数化），辨析回退纯形状通道——
   这正是双维计数的训练点（同色异形干扰在场=必须辨形状） */
const SHAPES = {
  circle:   { n: '圆形',   col: '#F5A623' },
  square:   { n: '方形',   col: '#57A773' },
  triangle: { n: '三角形', col: RED },
  star:     { n: '星星',   col: YEL },
  heart:    { n: '心形',   col: '#EF8FB0' },
  diamond:  { n: '菱形',   col: '#8E7CC3' }
};
const ALL6 = Object.keys(SHAPES);                       // 封闭 6 集
const NEAR = { triangle: 'diamond', diamond: 'triangle',   // 近形封闭 2 对（双向：尖角/圆弧族）
              circle: 'heart', heart: 'circle' };
const NEAR_KEYS = ['triangle', 'diamond', 'circle', 'heart'];  // 有近形伙伴的 4 形（ch4 count 取材）

/* ---------- 颜色封闭 4（r3 ③ 双维计数）：id → { n 名, col 填色 }
   四色与 INK 描边对比均可辨（沿用家族色板：红/蓝/黄/绿） */
const COLORS = {
  red:    { n: '红色', col: RED },
  blue:   { n: '蓝色', col: BLU },
  yellow: { n: '黄色', col: YEL },
  green:  { n: '绿色', col: '#57A773' }
};
const COLOR4 = Object.keys(COLORS);                     // 封闭 4 色集

/* ---------- 数字汉字表（家族 L：量词前 2 用「两」；r3 封闭集全量值 1-20）
   12='十二' / 20='二十'（标准数词）；仅 2 用「两」（量词口径「有两个」） */
const NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
                9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四',
                15: '十五', 16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十' };

/* ---------- 候选数字数学先验（r3 域 1-20；SPEC §0.68 r3 版：四数互异含真值、
   全 ≥1 禁 0/负、定长 4——新规则域分段）：
   t≤2 下溢正侧 [t..t+3]；3≤t≤6 中心 [t-2..t+1]；t≥7 下邻域 [t-3..t]
   （儿童大数计数误差通常偏少数丢 → 干扰压真值下侧；t=20 → [17..20] 界内恒成立） */
const numSet = t => (t <= 2) ? [t, t + 1, t + 2, t + 3]
                  : (t <= 6) ? [t - 2, t - 1, t, t + 1]
                  : [t - 3, t - 2, t - 1, t];

/* ---------- 句式（题面句/确认句/引导句 TTS 拼句，SPEC §2 豁免 clip 化）
   静态上限（build.py estMs 全字符口径对账）：
   count 题面句 7（三角形有几个？）/ grid 13（排好队的图形，一共有几个？）/
   gridmiss 12（有空格的图形，一共几个？）/ dual 10（黄色的三角形有几个？）；
   确认句最长 10（黄色的三角形，有六个）/ 引导句最长 10（先数满的行，再数空格） */
const dualPair = q => q.ask.split(':');                 // 'shape:color' → [shapeId, colorId]
const quizText = q => {
  if (q.kind === 'grid') return '排好队的图形，一共有几个？';
  if (q.kind === 'gridmiss') return '有空格的图形，一共几个？';
  if (q.kind === 'dual') { const p = dualPair(q); return COLORS[p[1]].n + SHAPES[p[0]].n + '有几个？'; }
  return SHAPES[q.ask].n + '有几个？';
};
const confirmText = q => {
  if (q.kind === 'grid' || q.kind === 'gridmiss') return '一共，有' + NUMCN[q.n] + '个';
  if (q.kind === 'dual') { const p = dualPair(q); return COLORS[p[1]].n + SHAPES[p[0]].n + '，有' + NUMCN[q.n] + '个'; }
  return SHAPES[q.ask].n + '，有' + NUMCN[q.n] + '个';
};

/* ---------- 错反馈语义引导句（r3：count/grid 按所点数字方向 / gridmiss 结构锚 /
   dual 两步过滤锚——禁兜底宽松断言，四族各一） */
const GUIDE = {
  count_over:  '没有那么多，再数数',            // 所点 > 真值（count/grid）
  count_under: '还有呢，再接着数',              // 所点 < 真值（count/grid）
  gridmiss:    '先数满的行，再数空格',          // 减法结构锚（满行×列数-空格）
  dual:        '先找颜色，再找形状'             // 两步过滤锚
};
const guideText = (q, i) => (q.kind === 'gridmiss') ? GUIDE.gridmiss
                          : (q.kind === 'dual') ? GUIDE.dual
                          : (q.opts[i].num > q.n ? GUIDE.count_over : GUIDE.count_under);

/* ---------- T46 阶段2：题面/确认/引导 clip 键构造（与 gen_clips.py T46 注册 39 键全一致；
   题面=色名+形名+「有几个？」/题型句单键，确认=名段+「，有」+数词（grid 用「一共，有」骨架），
   引导=四族单键；全部段键化，链尾恒有键 ---------- */
const quizKeys = q => {
  if (q.kind === 'grid') return [{ key: 'shc_q_grid', text: quizText(q) }];
  if (q.kind === 'gridmiss') return [{ key: 'shc_q_gridmiss', text: quizText(q) }];
  if (q.kind === 'dual') {
    const p = dualPair(q);
    return [{ key: 'shc_c_' + p[1], text: COLORS[p[1]].n },
            { key: 'shc_s_' + p[0], text: SHAPES[p[0]].n },
            { key: 'shc_s_yj', text: '有几个？' }];
  }
  return [{ key: 'shc_s_' + q.ask, text: SHAPES[q.ask].n },
          { key: 'shc_s_yj', text: '有几个？' }];
};
const confirmKeys = q => {
  const nk = { key: 'shc_n_' + q.n, text: NUMCN[q.n] + '个' };
  if (q.kind === 'grid' || q.kind === 'gridmiss')
    return [{ key: 'shc_s_gyg', text: '一共，有' }, nk];
  if (q.kind === 'dual') {
    const p = dualPair(q);
    return [{ key: 'shc_c_' + p[1], text: COLORS[p[1]].n },
            { key: 'shc_s_' + p[0], text: SHAPES[p[0]].n },
            { key: 'shc_s_yg', text: '，有' }, nk];
  }
  return [{ key: 'shc_s_' + q.ask, text: SHAPES[q.ask].n },
          { key: 'shc_s_yg', text: '，有' }, nk];
};
const guideKeyOf = (q, i) => (q.kind === 'gridmiss') ? 'shc_g_gridmiss'
                          : (q.kind === 'dual') ? 'shc_g_dual'
                          : (q.opts[i].num > q.n ? 'shc_g_over' : 'shc_g_under');

/* ---------- T46 阶段2 clip 实长表（mp3 实测 ms；verify ±60ms 运行时辨别器防表过期；
   判对窗按 max(estMs, chainMs)+PAD 对齐——dual 4 段链 6186 > estMs 窗 5400，calendar 先例） ---------- */
const SHC_CLIP_MS = { c_red: 1416, c_blue: 1416, c_yellow: 1416, c_green: 1392,
                      s_circle: 1416, s_square: 1440, s_triangle: 1656, s_star: 1392,
                      s_heart: 1464, s_diamond: 1416, s_yj: 1584, s_yg: 1128, s_gyg: 1920,
                      n_1: 1344, n_2: 1368, n_3: 1392, n_4: 1416, n_5: 1320, n_6: 1368,
                      n_7: 1368, n_8: 1320, n_9: 1344, n_10: 1464, n_11: 1560, n_12: 1536,
                      n_13: 1632, n_14: 1632, n_15: 1584, n_16: 1632, n_17: 1632,
                      n_18: 1584, n_19: 1584, n_20: 1536 };
const chainMs = parts => parts.reduce((s, p) => s + SHC_CLIP_MS[p.key.slice(4)], 0) + 150 * (parts.length - 1);
const CONFIRM_PAD = 300;                        /* 判对窗对确认链实长的落定余量（calendar 先例） */

/* ---------- hint 按题型选播（r3 新增 2 条 clip：shc_hint_grid/shc_hint_dual）
   点兔子/空地点/空白探索 → 当前题型号相关策略提示 */
const HINTS = {
  count:    { key: 'shc_hint',      text: '一个一个指着数' },
  grid:     { key: 'shc_hint_grid', text: '两个两个数，按行数更快' },
  gridmiss: { key: 'shc_hint_grid', text: '两个两个数，按行数更快' },
  dual:     { key: 'shc_hint_dual', text: '先找颜色，再找形状' }
};
const hintOf = q => HINTS[q.kind] || HINTS.count;

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '多数一数', hint: '图形排好队，一行一行数更快' },   // 预告 ch2 阵列计数
  2: { name: '排好队数', hint: '有的格子空了，还要找颜色数' },   // 预告 ch3 缺格+双维
  3: { name: '空格颜色', hint: '图形会动啦，盯住慢慢数' },       // 预告 ch4 移动干扰
  4: { name: '大挑战',   hint: '新一轮数一数开始啦' }            // 预告生成关
};
const GEN_HINTS = ['图形变多了，仔细数',            // dch1 散点 5-10
                   '排好队的图形，按行数',          // dch2 阵列
                   '先数满行，再找颜色',            // dch3 缺格+双维
                   '图形会动，想好再点'];           // dch4 混合+漂移
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 数量域（r3 SPEC §0.68 版本块）：
   ch1 散点单形 5-10 / ch2 满阵 r∈[2,4]×c∈[3,5] 总 10-20 /
   ch3 缺格阵总 12-20、缺格 k 1-4 且总数≥10 / dual 目标 3-6 干扰 2-5（和 ≤12 槽）/
   ch4 count 近形版 5-9 + 干扰 3-8（n+m ≤ 12 数学先验：n≤9 保最小干扰 m=3 恒可共存
   ——n 上界 10 会把兜底钳制的 m 压破 ≥3 下界，2026-09-13 引擎自检实锤） */
const N_CH1 = [5, 10], N_CH4 = [5, 9], N_DIST4 = [3, 8];
const GRID_R = [2, 4], GRID_C = [3, 5], GRID_TOT = [10, 20];
const MISS_TOT = [12, 20], MISS_K = [1, 4], MISS_FLOOR = 10;
const DUAL_N = [3, 6], DUAL_D = [2, 5];

/* ---------- 阵列几何（r3 ②：scene[data-mode=grid] 高 340px 横竖统一；
   top = GRID_TOP[rows] + row * GRID_DY[rows]（%）；left = (col+0.5)/cols*100%
   4 行最底 top=19.5+3×23.5=90% → 340×0.90+29(半高)=335 < 340（零溢出）；
   行距 4 行 23.5%×340=79.9px > 58px 图形（间隙 21.9px 零重叠）；
   5 列列距 620×20%=124px > 58px（间隙 66px，漂移 ±9px 双侧 18px 安全） */
const GRID_TOP = { 2: 33, 3: 25.5, 4: 19.5 };           // 首行中心（%）——渲染时另加 +22px 顶带让位（m3）
const GRID_DY = { 2: 33, 3: 24.5, 4: 21.5 };            // 行距（%）——m3：4 行 23.5→21.5（+22px 后末行不溢出 364px scene）
/* 漂移横摆幅度 ±9px：真值源=head.html @keyframes drift-x 的 translate calc（m2 勘误：
   原 DRIFT_AMP 常量零引用形成双源谎称，已删——改幅度只改 keyframes 一处） */

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六件套 watch/turn/hint(=count 型)/right/wrong/q + r3 新增 2 条题型 hint；
   题面句/确认句/引导句=TTS 拼句（本表文案）
   前缀 shc_（2026-09-10 中央改名：sha_ 撞车——旧注入实为 shadow/share 旧音频）
   clip 实长（浏览器 Audio 实测 2026-09-10 新文件）：watch 3096/turn 1896/hint 2184/
   right 2304/wrong 1968/q 2136；r3 新增（2026-09-13 合成，浏览器实测）：
   hint_grid 3168/hint_dual 2976 */
const VOICE = {
  watch: { key: 'shc_tut_watch', text: '看！图形里有几个' },
  turn:  { key: 'shc_tut_turn',  text: '你来数一数' },
  hint:  { key: 'shc_hint',      text: '一个一个指着数' },
  right: { key: 'shc_right',     text: '数对啦，真棒' },
  wrong: { key: 'shc_wrong',     text: '再一个一个数' },
  q:     { key: 'shc_q',         text: '数一数有几个' }
};

/* ---------- 图形 SVG（viewBox 0 0 100 100；简笔大色块：粗描边 INK + 实心填色。
   r3 参数化：shapeEl(id, fill)——dual 题颜色覆盖填色（渲染/判定同源：
   data-col 属性 = fill 值，verify DOM 级对账） */
const STAR_PTS = '50,10 60.6,37.4 90,39 67.1,57.6 74.7,86 50,70 25.3,86 32.9,57.6 10,39 39.4,37.4';
function shapeEl(id, fill) {
  const f = fill || SHAPES[id].col, s = 'stroke="' + INK + '"';
  if (id === 'circle')   return '<circle cx="50" cy="50" r="41" fill="' + f + '" ' + s + ' stroke-width="4.5"/>';
  if (id === 'square')   return '<rect x="11" y="11" width="78" height="78" rx="9" fill="' + f + '" ' + s + ' stroke-width="4.5"/>';
  if (id === 'triangle') return '<polygon points="50,9 92,85 8,85" fill="' + f + '" ' + s + ' stroke-width="4.5" stroke-linejoin="round"/>';
  if (id === 'star')     return '<polygon points="' + STAR_PTS + '" fill="' + f + '" ' + s + ' stroke-width="4" stroke-linejoin="round"/>';
  if (id === 'heart')    return '<path d="M50 88 C20 64 8 46 8 31 C8 16 20 7 32 7 C41 7 47 12 50 20 C53 12 59 7 68 7 C80 7 92 16 92 31 C92 46 80 64 50 88 Z" fill="' + f + '" ' + s + ' stroke-width="4.5" stroke-linejoin="round"/>';
  return '<polygon points="50,7 93,50 50,93 7,50" fill="' + f + '" ' + s + ' stroke-width="4.5" stroke-linejoin="round"/>';
}
/* 图形 SVG 工厂：shapeSvg(id, col)——尺寸由容器控制（svg 100% 填充） */
function shapeSvg(id, col) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
         shapeEl(id, col) + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 三形叠印（圆/三角/方） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="16" cy="17" r="7" fill="#F5A623" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="23" y="24" width="12" height="12" rx="2.5" fill="#57A773" stroke="' + INK + '" stroke-width="2"/>' +
    '<polygon points="33,8 40,21 26,21" fill="' + RED + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></svg>',
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
