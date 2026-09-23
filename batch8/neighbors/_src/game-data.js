/* ================= neighbors 游戏数据（章配置 / 街道范围 / 语音文案 / 中文数词 / 图标 / 场景 SVG）
   数字小街：一排小房子挂门牌（本章题数范围内按序 S 形续排），每题一个空房（高亮+问号旗），
   空房左右邻居房号恒亮 = 数轴锚点（孩子可"顺着数"自行验证——数感支架非记忆测试）
   门牌数字大字恒亮（§0.19 训练目标可见）；候选门牌 3 张 ≥96px 主答案 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材）
   ch1 比 n 多 1（n∈1-9）/ ch2 比 n 少 1（n∈2-10）/ ch3 大数字 10-19 混合+跨十专项+±2+藏牌
   / ch4 中间空位 mid+mid4+±2+两步题 dual+藏牌（SPEC-R31-NEIGHBORS §R2）
   name 供章末预告；hint=通关本章后预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带）
   r31 谱变更显式声明：ch3/ch4 hint 各改一处（预告新机制），ch1/ch2/GEN_HINTS 零改动 */
const CHAPTERS = {
  1: { name: '多一号', hint: '小旗子换颜色啦，找比它少一的邻居' },
  2: { name: '少一号', hint: '门牌号变大啦，有的门牌还藏起来了' },
  3: { name: '大房子', hint: '空房藏中间，还要跳两步找新邻居' },
  4: { name: '住中间', hint: '新一轮数字小街找邻居' }
};
const GEN_HINTS = ['新的数字小街挑战', '比它少一的邻居', '跨十的房子看一看', '中间空位猜一猜'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 各难度章的街道门牌范围（lo..hi 按序挂房；行数由 buildStreet 依 N 分行）
   dch3 取 [8,20]：退十专项 10→9 的空房 9 左邻 8 也恒亮（数轴锚点双侧可见） ---------- */
const STREET = { 1: [1, 10], 2: [1, 10], 3: [8, 20], 4: [1, 20] };

/* ---------- 语音文案（前 7 条与 voice/clips/manifest.json 严格一致，禁改 key/text）
   T46 阶段2（2026-09-19）：题面句式 = 预合成 clip 段链——plus/minus = queue([neb_n_n,
   neb_q1|neb_q2])；mid = queue([neb_mid_n（「n和n+2」整段）, neb_q4])。wrong clip 化
   r31（SPEC-R31 §R10）：新 5 型段链用 5 新键（qp2/qm2/and/dualA/dualB）——**主线
   gen_clips 注册前为过渡态**：playChain 缺段走 KIDS.voice.say(fallback)（core speak
   已退役=静默 console.warn），视觉/交互/演出完整（r29 m3 先例）；注册后 manifest
   48→53 自动换真 clip。数词段复用已注册 neb_n_1-20 */
const VOICE = {
  watch: { key: 'neb_tut_watch', text: '看！空房子要挂门牌号' },
  turn:  { key: 'neb_tut_turn',  text: '你来挂一挂' },
  hint:  { key: 'neb_hint',      text: '听一听，想一想，比几多一呀' },
  q1:    { key: 'neb_q1',        text: '的邻居是几呀？比它多一' },
  q2:    { key: 'neb_q2',        text: '的邻居是几呀？比它少一' },
  q4:    { key: 'neb_q4',        text: '中间住的是几号呀' },
  wrong: { key: 'neb_wrong',     text: '再想一想，顺着数一数' },  /* 纠错轻语音 sayW（10s 节流 flat≥3）；T46 阶段2 clip 化 */
  /* ---- r31 新 5 键（TODO 主线 gen_clips 统一注册，本 agent 未动 manifest） ---- */
  qp2:   { key: 'neb_qp2',       text: '的邻居是几呀？比它多二' },          /* plus2 链 [neb_n_n, neb_qp2] */
  qm2:   { key: 'neb_qm2',       text: '的邻居是几呀？比它少二' },          /* minus2 链 [neb_n_n, neb_qm2] */
  and:   { key: 'neb_and',       text: '和' },                             /* mid4 链接段 [neb_n_n, neb_and, neb_n_(n+4), neb_q4] */
  dualA: { key: 'neb_dual_a',    text: '的多一邻居住好啦，再找它的少二邻居，是几号呀' },  /* dualA 链 [neb_n_n, neb_dual_a] */
  dualB: { key: 'neb_dual_b',    text: '的多二邻居住好啦，再找它的少一邻居，是几号呀' }   /* dualB 链 [neb_n_n, neb_dual_b] */
};

/* ---------- 中文数词（题面/报数 TTS 用；1-20，与 hopscotch numCn 同源写法） ---------- */
function numCn(n) {
  const D = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  return '二十';
}

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M22 7 L39 21 V38 a3 3 0 0 1 -3 3 H8 a3 3 0 0 1 -3 -3 V21 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M9 22 L22 10 L35 22" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<rect x="18" y="26" width="8" height="15" rx="2" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="27.5" cy="8" r="2" fill="#F5C445"/><path d="M27.5 8 V20" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 问号旗（空房旗）：小旗+问号（问号用 DOM 覆盖，防 SVG text 尺寸漂移 §0.15） */
  flagQ: '<svg viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M10 44 V6" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M10 8 L34 14 L10 21 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="10" cy="45" rx="7" ry="2.6" fill="#C9BDA8"/></svg>',
  /* 方向图标：多一（上箭头+1）/ 少一（下箭头-1）——零文字依赖的装饰冗余
     r31：多二/少二双箭头（up2/down2）——±2 与 dual 两步题面行装饰冗余 */
  up1: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 34 V10 M10 19 L20 8 L30 19" stroke="#E8975A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M28 32 h8" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/></svg>',
  down1: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 6 V30 M10 21 L20 32 L30 21" stroke="#6B8CB8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M4 32 h8" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/></svg>',
  up2: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 36 V22 M12 28 L20 19 L28 28" stroke="#E8975A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M20 20 V8 M13 13.5 L20 5 L27 13.5" stroke="#E8975A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".65"/>' +
    '<path d="M27 36 h8" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/><path d="M23 36 h1.5" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/></svg>',
  down2: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 4 V18 M12 12 L20 21 L28 12" stroke="#6B8CB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M20 20 V32 M13 26.5 L20 35 L27 26.5" stroke="#6B8CB8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".65"/>' +
    '<path d="M5 36 h8" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/><path d="M15.5 36 h1.5" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/></svg>',
  midDots: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="7" cy="20" r="4" fill="#8FBF7F"/><circle cx="20" cy="20" r="4.5" fill="#E8975A"/>' +
    '<circle cx="33" cy="20" r="4" fill="#8FBF7F"/></svg>',
  fold: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6 L12 20 L20 6 Z" fill="#9FB4C7"/></svg>'
};

/* ---------- 窗户小动物（4 款简笔脸：猫/熊/鸟/兔；按门牌号轮换，填对才搬进来） ---------- */
function animalSvg(k) {
  const ears = k === 0
    ? '<path d="M18 20 L15 6 L26 13 Z M42 20 L45 6 L34 13 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/>'   /* 猫耳 */
    : k === 1
    ? '<circle cx="18" cy="14" r="6.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/><circle cx="42" cy="14" r="6.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/>' /* 熊耳 */
    : k === 2
    ? '<path d="M20 14 q-2 -9 7 -8 q9 1 7 8 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>'   /* 鸟冠 */
    : '<ellipse cx="20" cy="10" rx="4.5" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(-10 20 10)"/>' +
      '<ellipse cx="40" cy="10" rx="4.5" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(10 40 10)"/>';  /* 兔耳 */
  const muzzle = k === 2
    ? '<path d="M27 30 q3 3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M23 34 q7 5 14 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>'  /* 鸟喙 */
    : '<ellipse cx="30" cy="30" rx="6" ry="4.5" fill="#F2B8C6"/>' +
      '<path d="M30 28 v3 M27.5 31 h5" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>';
  const body = k === 1 ? '#D9A66C' : '#FBF7F0';
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    ears +
    '<circle cx="30" cy="31" r="19" fill="' + body + '" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="23" cy="27" r="2.4" fill="' + INK + '"/><circle cx="37" cy="27" r="2.4" fill="' + INK + '"/>' +
    '<ellipse cx="17" cy="34" rx="3" ry="2" fill="#F2B8C6" opacity=".8"/><ellipse cx="43" cy="34" rx="3" ry="2" fill="#F2B8C6" opacity=".8"/>' +
    muzzle + '</svg>';
}

/* ---------- 小街场景背景（低干扰，pointer-events:none）：太阳 + 云 + 远树 + 灌木 ---------- */
function sceneSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  s += '<rect width="1000" height="600" fill="#CBE7F0"/>';
  s += '<circle cx="906" cy="72" r="38" fill="#F7D977" opacity=".9"/>';
  s += '<circle cx="906" cy="72" r="52" fill="#F7D977" opacity=".25"/>';
  const cloud = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" opacity=".92">' +
    '<ellipse cx="60" cy="30" rx="52" ry="20" fill="#FFF"/>' +
    '<ellipse cx="38" cy="20" rx="26" ry="16" fill="#FFF"/><ellipse cx="82" cy="20" rx="22" ry="14" fill="#FFF"/></g>';
  s += cloud(70, 60, .9) + cloud(430, 40, 1.1) + cloud(740, 100, .75);
  const tree = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
    '<rect x="-5" y="-24" width="10" height="26" rx="3" fill="#B08A5E"/>' +
    '<circle cx="0" cy="-38" r="24" fill="#AFCF9C"/><circle cx="-17" cy="-28" r="16" fill="#AFCF9C"/>' +
    '<circle cx="17" cy="-28" r="16" fill="#AFCF9C"/></g>';
  s += tree(30, 592, .9) + tree(968, 596, 1) + tree(120, 596, .6) + tree(880, 592, .65);
  const bush = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
    '<ellipse cx="0" cy="0" rx="20" ry="13" fill="#9CCB8E"/><ellipse cx="14" cy="3" rx="13" ry="9" fill="#9CCB8E"/>' +
    '<ellipse cx="-14" cy="3" rx="12" ry="9" fill="#8CBD80"/></g>';
  s += bush(240, 588, 1) + bush(610, 590, .85) + bush(800, 588, .7);
  s += '<rect y="576" width="1000" height="24" fill="#DCEDD2"/>';
  return s + '</svg>';
}
