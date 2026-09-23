/* ================= colormix 游戏数据（色板 / 混色表 / 章配置 / 语音文案 / 图标 / 罐与缸 SVG）
   混色表 r21 扩定（SPEC-R21-COLORMIX §R3，取代 §0.51 旧款"白+两色以上=mud"条款）：
   红+黄=橙 / 黄+蓝=绿 / 红+蓝=紫 / 红+黄+蓝=棕 / 白+单原色=浅原色 /
   白+黄+蓝=浅绿 / 白+红+黄=浅橙 / 白+红+蓝=浅紫（传递组合律：二级色再加白=其浅版）；
   不做减色不做比例——结果只看缸内颜色的"去重集合"；缸深 3 内全部可达集合均有定义，
   mud 不再可达（色板保留=反推干扰配方的语义描述位；白+三原色 4 色集合兜底仍=mud）。
   色词语音=TTS 兜底（col_ 色词不建 clip，§0.51 豁免通道）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8；浅色色块靠深描边保证对比度）

/* ---------- 色板（id → 名称/色值；name 同时是 TTS 色词与 aria 文案源）
   r21 新增浅二级色 3（§R3）：浅橙/浅绿/浅紫=三步配方目标域 ---------- */
const COLORS = {
  red:        { name: '红色',   hex: '#E8483C' },
  yellow:     { name: '黄色',   hex: '#F5C542' },
  blue:       { name: '蓝色',   hex: '#4E8FD0' },
  white:      { name: '白色',   hex: '#FFFFFF' },
  orange:     { name: '橙色',   hex: '#F08A3C' },
  green:      { name: '绿色',   hex: '#57B368' },
  purple:     { name: '紫色',   hex: '#9A6BC9' },
  brown:      { name: '棕色',   hex: '#9C6238' },
  lightred:   { name: '浅红色', hex: '#F5A8A0' },
  lightyellow:{ name: '浅黄色', hex: '#FBE49A' },
  lightblue:  { name: '浅蓝色', hex: '#A8CBEA' },
  lightorange:{ name: '浅橙色', hex: '#F7BC8A' },
  lightgreen: { name: '浅绿色', hex: '#A8D8B0' },
  lightpurple:{ name: '浅紫色', hex: '#C4A8E3' },
  mud:        { name: '浑浊',   hex: '#B7A99A' }   // 表外组合的结果色（不做目标，只做反馈；缸深3内不可达）
};

/* ---------- 混色表（key = 缸内颜色集合去重后按字母序 join('+')；表外 → mud）
   字母序参照（罐色）：blue < red < white < yellow */
const MIX = {
  'red': 'red', 'yellow': 'yellow', 'blue': 'blue', 'white': 'white',
  'red+yellow': 'orange',
  'blue+yellow': 'green',
  'blue+red': 'purple',
  'blue+red+yellow': 'brown',
  'red+white': 'lightred',
  'white+yellow': 'lightyellow',
  'blue+white': 'lightblue',
  'blue+white+yellow': 'lightgreen',        /* r21 §R3：白+黄+蓝=浅绿 */
  'red+white+yellow': 'lightorange',        /* r21 §R3：白+红+黄=浅橙 */
  'blue+red+white': 'lightpurple'           /* r21 §R3：白+红+蓝=浅紫 */
};

/* ---------- 每题最优试调数 par（星级基线：原色 0=单罐直击；二级/浅原色 1=首罐必非目标；
   棕/浅二级 2=三步配方任何顺序前两步必非完整集合；反推题 par=0 见 §R4） ---------- */
const PAR = { red: 0, yellow: 0, blue: 0, orange: 1, green: 1, purple: 1,
              brown: 2, lightred: 1, lightyellow: 1, lightblue: 1,
              lightorange: 2, lightgreen: 2, lightpurple: 2 };

/* ---------- 配方表（autoSolve / 引擎直驱用：按序入缸即成，序列内每步结果色都变化） ---------- */
const RECIPE = {
  red: ['red'], yellow: ['yellow'], blue: ['blue'],
  orange: ['red', 'yellow'],
  green: ['yellow', 'blue'],
  purple: ['red', 'blue'],
  brown: ['red', 'yellow', 'blue'],
  lightred: ['red', 'white'],
  lightyellow: ['yellow', 'white'],
  lightblue: ['blue', 'white'],
  lightorange: ['red', 'yellow', 'white'],
  lightgreen: ['yellow', 'blue', 'white'],
  lightpurple: ['red', 'blue', 'white']
};

/* ---------- 反推题目标池（§R4：配方非平凡——原色单罐/白/浑浊不反推） ---------- */
const REV_POOL = ['orange', 'green', 'purple', 'brown',
                  'lightred', 'lightyellow', 'lightblue',
                  'lightorange', 'lightgreen', 'lightpurple'];

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   r21 章型（§R2）：ch2 二级+浅原色（恰2+3）/ ch3 棕+浅二级（恰2+3）/ ch4 配方反推；
   jars=该章颜料罐 / pool=目标色池（域声明，structWhy 用）；
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，b21 教训） ---------- */
const CHAPTERS = {
  1: { name: '魔法初现', jars: ['red', 'yellow', 'blue'], pool: ['red', 'yellow', 'blue'],
       hint: '两个颜色抱一抱变新颜色，白色让颜色变浅浅的' },   // 预告 ch2 二级+浅原色
  2: { name: '深浅魔法', jars: ['red', 'yellow', 'blue', 'white'],
       pool: ['orange', 'green', 'purple', 'lightred', 'lightyellow', 'lightblue'],
       hint: '三个颜色抱一抱，会变出更多魔法' },               // 预告 ch3 棕+浅二级（三步配方）
  3: { name: '三色秘密', jars: ['red', 'yellow', 'blue', 'white'],
       pool: ['brown', 'lightorange', 'lightgreen', 'lightpurple'],
       hint: '下次反过来想，猜猜颜色是怎么调出来的' },         // 预告 ch4 配方反推
  4: { name: '配方大师', jars: ['red', 'yellow', 'blue', 'white'], pool: REV_POOL.slice(),
       hint: '全部魔法大挑战，想好再点' }                      // 预告生成关（dch1-4 循环）
};
const GEN_HINTS = ['直接点一个颜色就好啦', '两个颜色抱一抱，加白会变浅浅的',
                   '三种颜色抱一起，白色也有魔法', '反过来想一想，颜色是怎么调出来的'];
/* 审查 M1 勘误承用：GEN_HINTS[k] ↔ dch=k+1（原色直击/二级+浅原色/棕+浅二级/配方反推）——
   生成关 dch=(ch-1)%4+1 确定循环，禁右移 */
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const POT_DEPTH = 3;       // 玻璃缸缸深 3（FIFO：超深才替换最早球，§3 定版）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；col_wrong 建 clip——非目标有明确反馈句）
   题面/色词=动态 TTS 兜底（§0.51 豁免，不建 clip） ---------- */
const VOICE = {
  watch: { key: 'col_tut_watch', text: '看！颜料变魔法' },
  turn:  { key: 'col_tut_turn',  text: '你来调一调' },
  hint:  { key: 'col_hint',      text: '想想哪两个颜色是好朋友' },
  right: { key: 'col_right',     text: '调对啦，颜色真漂亮' },
  wrong: { key: 'col_wrong',     text: '不一样，再试试' },
  green: { key: 'col_green',     text: '变绿啦' }      /* T46 阶段2 教学演示收束语 */
};

/* ---------- 题面朗读（T46 阶段2 clip 化）：调出橙色吧 / 调出浅蓝色吧 ---------- */
const quizSpeech = t => '调出' + COLORS[t].name + '吧';
const quizKey = t => 'col_q_' + t;                    /* 10 目标色全句 clip（白/浑浊非目标） */
const paintKey = c => 'col_paint_' + c;               /* 4 颜料名 clip（红/黄/蓝/白罐） */

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M22 5 a16.5 16.5 0 1 0 14 25 l-2.6 -4.4 a11.5 11.5 0 1 1 -1.5 -12.4 l3.9 -3 a16.4 16.4 0 0 0 -13.8 -5.2 Z" ' +
    'fill="#F2E7D4" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="15" cy="18" r="3.4" fill="#E8483C" stroke="#4A3B2E" stroke-width="1.6"/>' +
    '<circle cx="26" cy="15" r="3.4" fill="#F5C542" stroke="#4A3B2E" stroke-width="1.6"/>' +
    '<circle cx="30" cy="25" r="3.4" fill="#4E8FD0" stroke="#4A3B2E" stroke-width="1.6"/>' +
    '<path d="M12 30 q10 8 20 0" stroke="#E8975A" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  wand: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 50 L44 20" stroke="#4A3B2E" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M48 8 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2 Z" fill="#F5C542" stroke="#4A3B2E" stroke-width="2"/>' +
    '<circle cx="20" cy="14" r="2.6" fill="#E8975A"/><circle cx="54" cy="34" r="2.6" fill="#4E8FD0"/>' +
    '<circle cx="34" cy="52" r="2.6" fill="#57B368"/></svg>'
};

/* ---------- 颜料罐 SVG（viewBox 0 0 100 112）：罐身=对应色 + INK 描边 + 白标签色点（白罐靠标签可辨） ---------- */
function jarSvg(color) {
  const C = COLORS[color];
  return '<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="30" y="6" width="40" height="14" rx="5" fill="#E8DCC8" stroke="' + INK + '" stroke-width="3.6"/>' +
    '<path d="M24 26 h52 v58 a16 16 0 0 1 -16 16 h-20 a16 16 0 0 1 -16 -16 Z" ' +
    'fill="' + C.hex + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<ellipse cx="37" cy="40" rx="6" ry="11" fill="#FFF" opacity=".45" transform="rotate(-14 37 40)"/>' +
    '<circle cx="50" cy="62" r="13" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="50" cy="62" r="6" fill="' + C.hex + '" stroke="' + INK + '" stroke-width="2"/></svg>';
}
