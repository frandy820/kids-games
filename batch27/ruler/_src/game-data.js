/* ================= ruler 测量小尺 游戏数据（物品封闭 6 / 单位封闭 3 / 合法组合 12 / 陷阱对 4 / 章配置 / 语音 / SVG）
   玩法：题面 = 物品横放（长度按基准比例）+ 下方贴排单位链（回形针/小棒/积木，图形
   长度比 1:2:3 视觉可感，链与物品等长一头对齐）+ 题面句；下方 4 张数字卡（count）
   或 2 张物品卡（cmp，卡内带各自测量图）。点对 = 单位链逐根点亮 + 确认句 TTS 拼句
   （「铅笔有四根回形针长」——数字与物品名拼句，SPEC §1 豁免 clip）；点错 = 卡摇头 +
   rul_wrong clip + 按所点项的语义引导句 TTS（count 按所点数字大小方向 / cmp 按所点
   物品单位长短锚「单位长，根数少也可能长」），1000ms 防重入窗后可重选（探索不罚）。
   物品封闭 6（SPEC-BATCH27 §0.64）：pencil铅笔4/crayon蜡笔3/eraser橡皮2/
   scissors剪刀4/toycar玩具车5/book故事书6（基准=回形针长度）。
   单位封闭 3：clip回形针=1/stick小棒=2/block积木块=3。
   合法测量组合封闭 12（整除才合法，表外禁出题）：
     clip×6（pencil4/crayon3/eraser2/scissors4/toycar5/book6）
     + stick×4（book3/pencil2/scissors2/eraser1）+ block×2（book2/crayon1）。
   单位陷阱对封闭 4（真值按基准长，ch3 必出）：同数异真值 2（stick-book3=6 vs
   clip-crayon3=3 → book 长 / stick-pencil2=4 vs clip-eraser2=2 → pencil 长）+
   数字反直觉 2（block-crayon1=3 vs clip-eraser2=2 → 数字 1 的蜡笔长 /
   block-book2=6 vs clip-pencil4=4 → 数字 2 的书长）；每对两卡单位互异（干扰禁全同单位）。 */
'use strict';

const INK = '#4A3B2E';                      // 统一暖棕描边（家族基调）
const SILVER = '#76828F', WOOD = '#B98A5C'; // 回形针银灰 / 小棒木棕

/* ---------- 物品封闭 6：id → { n 名, base 基准长（回形针数） }
   量词封闭：clip/stick=根，block=块（确认句「四根回形针」「一块积木」） */
const ITEMS = {
  pencil:   { n: '铅笔',   base: 4 },
  crayon:   { n: '蜡笔',   base: 3 },
  eraser:   { n: '橡皮',   base: 2 },
  scissors: { n: '剪刀',   base: 4 },
  toycar:   { n: '玩具车', base: 5 },
  book:     { n: '故事书', base: 6 }
};
const UNITS = {
  clip:  { n: '回形针', base: 1, q: '根' },
  stick: { n: '小棒',   base: 2, q: '根' },
  block: { n: '积木',   base: 3, q: '块' }
};
const ITEM_KEYS = Object.keys(ITEMS);
const UNIT_KEYS = Object.keys(UNITS);

/* ---------- 合法组合封闭 12（整除才合法；数学先验自检 b24 坑③） */
const COMBOS12 = [];
UNIT_KEYS.forEach(u => ITEM_KEYS.forEach(it => {
  if (ITEMS[it].base % UNITS[u].base === 0)
    COMBOS12.push({ item: it, unit: u, units: ITEMS[it].base / UNITS[u].base });
}));
/* clip 4/3/2/4/5/6 + stick 3/2/2/1 + block 2/1 = 12（build 静态断言对账） */
const CH1_POOL = COMBOS12.filter(c => c.unit === 'clip');            // ch1 回形针 ×6
const CH2_POOL = COMBOS12.filter(c => c.unit !== 'clip');            // ch2 stick/block ×6

/* ---------- 单位陷阱对封闭 4（每对 a 恒为较长方——build/verify 独立对账）
   同数异真值 2 + 数字反直觉 2；两卡单位互异（构成辨析） */
const TRAPS = [
  { a: { item: 'book',   unit: 'stick', units: 3 }, b: { item: 'crayon', unit: 'clip', units: 3 } },  // 6 vs 3 同数3
  { a: { item: 'pencil', unit: 'stick', units: 2 }, b: { item: 'eraser', unit: 'clip', units: 2 } },  // 4 vs 2 同数2
  { a: { item: 'crayon', unit: 'block', units: 1 }, b: { item: 'eraser', unit: 'clip', units: 2 } },  // 3 vs 2 数字1的蜡笔长
  { a: { item: 'book',   unit: 'block', units: 2 }, b: { item: 'pencil', unit: 'clip', units: 4 } }   // 6 vs 4 数字2的书长
];
const comboKeyOf = c => c.item + '|' + c.unit;                       // 组合身份（item+unit 唯一）
const TRAP_KEYS = TRAPS.map(t => [comboKeyOf(t.a), comboKeyOf(t.b)].sort().join('&'));

/* ---------- 确认句数字汉字表（TTS 拼句「四根回形针」，识字萌芽配阿拉伯数字卡） */
/* 试玩 P3-a：量词前 2 用「两」（「两根/两块」，SAPI 读 liǎng；「二根」非口语） */
const NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六' };

/* ---------- 句式（题面句/确认句——TTS 拼句，SPEC §1 豁免 clip 化）
   最长句静态上限（build.py 按封闭表独立重算对账）：
   count 确认句 8 字（铅笔有四根回形针长）/ cmp 确认句 12 字（故事书更长，有六根回形针长） */
const quizText = q => q.kind === 'cmp'
  ? '谁更长？'
  : ITEMS[q.item].n + '有几' + UNITS[q.unit].q + UNITS[q.unit].n + '长？';
const confirmText = q => q.kind === 'cmp'
  ? ITEMS[q.item].n + '更长，有' + NUMCN[q.units] + UNITS[q.unit].q + UNITS[q.unit].n + '长'
  : ITEMS[q.item].n + '有' + NUMCN[q.units] + UNITS[q.unit].q + UNITS[q.unit].n + '长';

/* ---------- 错反馈语义引导句（SPEC §0.64：count 按所点数字大小方向 / cmp 按所点物品单位） */
const GUIDE = {
  count_over:  '没有那么多，再数数',            // 所点 > 真值
  count_under: '还有一小段，再多数一根',        // 所点 < 真值（还剩一小段没量到）
  cmp_clip:    '回形针短，数得多也不一定长哦',  // 点了 clip 卡（数字大/同但真长短）
  cmp_stick:   '小棒长，根数少也可能长哦',      // 点了 stick 卡（SPEC 锚句）
  cmp_block:   '积木长，块数少也可能长哦'       // 点了 block 卡
};
const guideText = (q, i) => q.kind === 'count'
  ? (q.opts[i].num > q.units ? GUIDE.count_over : GUIDE.count_under)
  : GUIDE['cmp_' + q.opts[i].unit];
/* ---------- T46 阶段2：题面/确认/引导 clip 键构造（quizText/confirmText/guideText 同构；
   rul_q_<item>_<unit> 15+rul_q2 / rul_cf_* 15+rul_cft_0..3（TRAP a/b 双匹配）/ rul_g_* 5 全在册） ---------- */
const quizKeyOf = q => q.kind === 'cmp' ? 'rul_q2' : 'rul_q_' + q.item + '_' + q.unit;
const confirmKeyOf = q => q.kind === 'cmp'
  ? 'rul_cft_' + TRAPS.findIndex(t =>
      (t.a.item === q.item && t.a.unit === q.unit && t.a.units === q.units) ||
      (t.b.item === q.item && t.b.unit === q.unit && t.b.units === q.units))
  : 'rul_cf_' + q.item + '_' + q.unit;
const guideKeyOf = (q, i) => q.kind === 'count'
  ? (q.opts[i].num > q.units ? 'rul_g_count_over' : 'rul_g_count_under')
  : 'rul_g_cmp_' + q.opts[i].unit;

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '回形针数一数', hint: '小棒和积木也要来量一量啦' },   // 预告 ch2 换单位
  2: { name: '换个单位量',   hint: '根数一样，长短可能不一样哦' }, // 预告 ch3 单位陷阱
  3: { name: '单位比一比',   hint: '全部混在一起，大挑战来啦' },   // 预告 ch4 混合
  4: { name: '大挑战',       hint: '新一轮量一量开始啦' }         // 预告生成关
};
const GEN_HINTS = ['用回形针，再数一数',        // dch1 回形针数一数
                   '小棒积木，换个单位量',      // dch2 换个单位量
                   '根数一样也可能不一样长',    // dch3 单位陷阱
                   '量一量大集合，想好再点'];   // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六包装 watch/turn/hint/right/wrong/q；确认句/引导句/非clip读题/cmp题面=TTS 拼句
   clip 实长（SPEC-BATCH27 §4 量化）：watch 3360/turn 1896/hint 2544/right 2496/wrong 2880/q 2448 */
const VOICE = {
  watch: { key: 'rul_tut_watch', text: '看！用回形针量一量' },
  turn:  { key: 'rul_tut_turn',  text: '你来数一数' },
  hint:  { key: 'rul_hint',      text: '摆整齐再数一数' },
  right: { key: 'rul_right',     text: '量对啦，真厉害' },
  wrong: { key: 'rul_wrong',     text: '一头对齐再数一数' },
  q:     { key: 'rul_q',         text: '它有几根回形针长' }
};

/* ---------- 视觉常量：U=单位基准视觉长（px）。单位图形长度比 clip:stick:block=1:2:3；
   物品 viewBox 宽=base*34（与链等长一头对齐——「摆整齐」「一头对齐」教学锚） */
const ULEN = 34;
const ITEM_VW = { pencil: 136, crayon: 102, eraser: 68, scissors: 136, toycar: 170, book: 204 };
const UNIT_VW = { clip: 34, stick: 68, block: 102 };

/* ---------- 物品 SVG（viewBox 0 0 {base*34} 64，横放左端对齐，右端自然收） */
const ITEM_ELS = {
  /* 铅笔：橙杆 + 木削笔尖 + 深色铅芯 + 粉橡皮头 */
  pencil: '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
    '<rect x="12" y="20" width="94" height="24" rx="5" fill="#F5C16C"/>' +
    '<path d="M106 20 L130 32 L106 44 Z" fill="#EBD7B0"/>' +
    '<path d="M122 27.6 L130 32 L122 36.4 Z" fill="' + INK + '" stroke="none"/>' +
    '<rect x="3" y="19" width="11" height="26" rx="5" fill="#F2A0B5"/></g>' +
    '<path d="M26 27 h64 M26 37 h64" stroke="#D9A23F" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
  /* 蜡笔：橙红胖杆两端锥 + 白纸套 + 黄椭圆标签 */
  crayon: '<path d="M6 32 L22 19 H80 L96 32 L80 45 H22 Z" fill="#E8705C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="34" y="17" width="34" height="30" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="51" cy="32" rx="8" ry="11" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>',
  /* 橡皮：经典白+蓝斜套 */
  eraser: '<rect x="5" y="15" width="58" height="34" rx="7" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 15 h16 a7 7 0 0 1 7 7 v20 a7 7 0 0 1 -7 7 h-16 Z" fill="#5B8DB8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 15 v34" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M14 25 h16 M14 39 h16" stroke="#D8C9B4" stroke-width="2.6" stroke-linecap="round"/>',
  /* 剪刀：双椭圆环柄（左）+ 交叉双刃向右张开（银）+ 铆钉 */
  scissors: '<path d="M30 25 L127 13" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M30 25 L127 13" stroke="#B9C2CC" stroke-width="5.5" stroke-linecap="round"/>' +
    '<path d="M30 41 L127 53" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M30 41 L127 53" stroke="#B9C2CC" stroke-width="5.5" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="23" rx="10" ry="8" fill="none" stroke="' + INK + '" stroke-width="5.5"/>' +
    '<ellipse cx="20" cy="43" rx="10" ry="8" fill="none" stroke="' + INK + '" stroke-width="5.5"/>' +
    '<circle cx="31" cy="33" r="4.5" fill="' + INK + '"/>',
  /* 玩具车：红车身 + 双窗 + 双轮 */
  toycar: '<path d="M14 46 V34 q0 -10 12 -12 l16 -16 q3 -3 8 -3 h30 q6 0 9 5 l11 14 h34 q16 0 16 12 v12 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="58" y="16" width="22" height="15" rx="3" fill="#CDE6F7" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="85" y="16" width="20" height="15" rx="3" fill="#CDE6F7" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="50" cy="48" r="11" fill="' + INK + '"/><circle cx="50" cy="48" r="5" fill="#FFF9EE"/>' +
    '<circle cx="124" cy="48" r="11" fill="' + INK + '"/><circle cx="124" cy="48" r="5" fill="#FFF9EE"/>',
  /* 故事书：绿封面 + 深绿书脊 + 右端书页白口 + 太阳装饰 + 书名线 */
  book: '<rect x="4" y="12" width="196" height="42" rx="7" fill="#57A773" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="4" y="12" width="11" height="42" rx="5" fill="#3E7D5B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M186 14 v38 M191 14 v38" stroke="#D8C9B4" stroke-width="2" fill="none"/>' +
    '<path d="M197 12 h-4 a7 7 0 0 1 7 7 v28 a7 7 0 0 1 -7 7 h4 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="66" cy="33" r="12" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M66 15 v-4 M66 51 v-4 M48 33 h-4 M84 33 h-4 M53 20 l-3 -3 M79 46 l3 3" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M96 26 h66 M96 38 h50" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity=".85"/>'
};
/* 物品 SVG 工厂：itemSvg(id, scale)——scale 缺省 1（题面）；cmp 卡 0.55 */
function itemSvg(it, s) {
  const k = s || 1, w = ITEM_VW[it];
  return '<svg viewBox="0 0 ' + w + ' 64" width="' + Math.round(w * k) + '" height="' + Math.round(64 * k) +
    '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + ITEM_ELS[it] + '</svg>';
}

/* ---------- 单位 SVG（长度比 1:2:3 视觉可感；高统一 40）
   clip=银色双环相扣 / stick=棕色圆角长条+木纹 / block=红黄蓝三节方块+凸点 */
const UNIT_ELS = {
  clip: '<ellipse cx="11" cy="20" rx="6.8" ry="13" fill="none" stroke="' + SILVER + '" stroke-width="4"/>' +
    '<ellipse cx="23" cy="20" rx="6.8" ry="13" fill="none" stroke="' + SILVER + '" stroke-width="4"/>' +
    '<path d="M8.5 13 a6 9 0 0 1 3 -4" stroke="#E8EDF2" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  stick: '<rect x="3" y="13" width="62" height="14" rx="7" fill="' + WOOD + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M16 20 q8 -3 16 0 t16 0" stroke="#8A6239" stroke-width="2" fill="none" stroke-linecap="round"/>',
  block: '<rect x="8" y="1.5" width="7" height="7" rx="2" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="20" y="1.5" width="7" height="7" rx="2" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="41" y="1.5" width="7" height="7" rx="2" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="53" y="1.5" width="7" height="7" rx="2" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="74" y="1.5" width="7" height="7" rx="2" fill="#2E6FB8" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="86" y="1.5" width="7" height="7" rx="2" fill="#2E6FB8" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="2.5" y="6" width="31" height="29" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="35.5" y="6" width="31" height="29" rx="3" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="68.5" y="6" width="31" height="29" rx="3" fill="#2E6FB8" stroke="' + INK + '" stroke-width="3"/>'
};
function unitSvg(u, s) {
  const k = s || 1, w = UNIT_VW[u];
  return '<svg viewBox="0 0 ' + w + ' 40" width="' + Math.round(w * k) + '" height="' + Math.round(40 * k) +
    '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + UNIT_ELS[u] + '</svg>';
}
/* 单位链 HTML：chainHtml(unit, n, scale)——n 根贴排（.uc 逐根可点亮，data-k 序号） */
function chainHtml(u, n, s) {
  let h = '';
  for (let k = 0; k < n; k++) h += '<span class="uc" data-k="' + k + '">' + unitSvg(u, s) + '</span>';
  return h;
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 回形针双环 + 小尺刻度 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="16" cy="19" rx="4.6" ry="8.4" fill="none" stroke="' + SILVER + '" stroke-width="3"/>' +
    '<ellipse cx="24" cy="19" rx="4.6" ry="8.4" fill="none" stroke="' + SILVER + '" stroke-width="3"/>' +
    '<path d="M11 33 h22 M11 33 v4 M17 33 v2.6 M22 33 v4 M28 33 v2.6 M33 33 v4" stroke="#E8975A" stroke-width="2.2" stroke-linecap="round"/></svg>',
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
