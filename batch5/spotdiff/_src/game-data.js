/* ================= spotdiff 游戏数据（章配置 / 语音文案 / 图标 / 场景常量） ================= */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (flat/5)%4+1 循环四章取材）
   K = 本关不同处数量；name 供章末预告与 README；hint=章末预告文案 ---------- */
const CHAPTERS = {
  1: { name: '两处不同', k: 2, hint: '要找三处不同啦' },
  2: { name: '三处不同', k: 3, hint: '四处不同，更仔细哦' },
  3: { name: '四处不同', k: 4, hint: '五处不同，眼力大挑战' },
  4: { name: '五处不同', k: 5, hint: '新一轮找不同挑战' }
};
const GEN_HINTS = ['新的两处不同', '新的三处不同', '再找一找四处不同', '眼力大挑战又来啦'];
const CH_LEN = 5;          // 5 关 = 1 章
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=待合成 clip 名，text=TTS 兜底；仅前 3 关播，sayP 包装；
     hint=开场/答错/救援通用句；top=点上图轻提示（5 岁半试玩 P2）） ---------- */
const VOICE = {
  watch: { key: 'spd_tut_watch', text: '看！两幅图哪里不一样' },
  turn:  { key: 'spd_tut_turn',  text: '你来点一点' },
  hint:  { key: 'spd_hint',      text: '两幅图比一比，找一找' },
  top:   { key: 'spd_top',       text: '用下面那幅图找一找哦' }
};

/* ---------- 场景常量（viewBox 800×460，地平线 y=250；坐标即逻辑像素） ----------
   COLORS 三色互异度大（红/黄/蓝），换色差异对 5 岁醒目；RAD=逻辑碰撞半径（间距断言用）
   JIT = 位置抖动幅度（防两关布局完全相同；受按类半径与边缘钳制） */
const VB_W = 800, VB_H = 460, HORIZON = 250;
const COLORS = ['#E85D75', '#F2C94C', '#7FA8D9'];           // 红 / 黄 / 蓝
const RAD  = { sun: 52, cloud: 64, flower: 34, mushroom: 34, butterfly: 28, rabbit: 42 };
/* VIS = 视觉半宽/半高（含描边；花茎下垂/兔耳上伸等不对称取保守对称值）——图内钳制与断言用 */
const VIS  = { sun: [62, 62], cloud: [46, 38], flower: [40, 48], mushroom: [33, 34], butterfly: [33, 27], rabbit: [24, 45] };
const JIT  = { sun: [10, 8], cloud: [8, 6], flower: [14, 10], mushroom: [14, 10], butterfly: [16, 10], rabbit: [12, 8] };
/* 各元素类型可用的差异类型（增删类：del=下图少，add=下图多——add 只能挂在空闲槽位的"新元素"上） */
const DIFFABLE = {
  sun: ['size', 'del'],
  cloud: ['move', 'size', 'del'],
  flower: ['color', 'size', 'del'],
  mushroom: ['color', 'size', 'del'],
  butterfly: ['color', 'move', 'size', 'del'],
  rabbit: ['move', 'size', 'del']
};
const ADD_KINDS = ['flower', 'butterfly', 'mushroom', 'cloud'];

/* 固定槽位表（手排无重叠；天带 6 + 草带 8 = 14 槽 → 章 4 元素上限 13 + 剩余空闲槽供 add）
   kinds = 该槽允许的元素类型；增删差异的 add 元素只能落在空闲槽 */
const SLOTS = [
  { id: 'A', x: 660, y: 80,  zone: 'sky',   kinds: ['sun', 'cloud'] },
  { id: 'B', x: 255, y: 68,  zone: 'sky',   kinds: ['cloud'] },
  { id: 'C', x: 445, y: 100, zone: 'sky',   kinds: ['cloud', 'butterfly'] },
  { id: 'D', x: 115, y: 118, zone: 'sky',   kinds: ['cloud', 'butterfly'] },
  { id: 'E', x: 560, y: 200, zone: 'sky',   kinds: ['butterfly'] },
  { id: 'F', x: 340, y: 206, zone: 'sky',   kinds: ['butterfly'] },
  { id: 'G', x: 95,  y: 335, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'H', x: 225, y: 408, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'I', x: 380, y: 318, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'J', x: 505, y: 396, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'K', x: 640, y: 325, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'L', x: 733, y: 408, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'M', x: 283, y: 282, zone: 'grass', kinds: ['flower', 'mushroom'] },
  { id: 'N', x: 735, y: 268, zone: 'grass', kinds: ['flower'] }
];

/* ---------- 各章元素配额（others = 除太阳/小兔外的元素数；min 之和保证 N 落入章区间） ---------- */
const QUOTA = {
  1: { N: [6, 8],   cloud: [1, 2], butterfly: [0, 1], flower: [3, 3], mushroom: [0, 1] },
  2: { N: [8, 10],  cloud: [1, 2], butterfly: [1, 2], flower: [3, 4], mushroom: [1, 2] },
  3: { N: [10, 12], cloud: [2, 3], butterfly: [1, 2], flower: [4, 4], mushroom: [1, 2] },
  4: { N: [12, 13], cloud: [2, 3], butterfly: [2, 2], flower: [4, 5], mushroom: [2, 2] }
};

/* ---------- 图标（全部内嵌 SVG，描边 2.5px 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="20" cy="24" r="15" fill="#FFF9EE" stroke="#FFF" stroke-width="3"/>' +
    '<circle cx="20" cy="24" r="8" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M20 16 V12 M26 18 L29 15 M14 18 L11 15" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="34" cy="14" r="5" fill="#E85D75" stroke="' + INK + '" stroke-width="2.5"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 放大镜（题面图标） */
  look: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="27" cy="27" r="16" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M39 39 L52 52" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M20 27 a7 7 0 0 1 7 -7" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/></svg>'
};
