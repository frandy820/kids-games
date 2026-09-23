/* ================= sudoku 游戏数据 =================
   6 种内嵌 SVG 动物头像（风格与 batch2/memory 一致：2.5px 暖棕描边、圆润无尖角）
   + 完整解模板（4×4 两个 / 6×6 两个，写死且已人工验证）
   + 关卡规格表 + 确定性随机（mulberry32，与前三批同实现）
   纯生成/求解引擎在 game-core.js（UI 与 ?verify=1 共用同一代码路径） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 动物池：6 种（前 5 种与 batch2/memory 同款，新增小猪） ---------- */
const ANIMALS = [
  { name: '小猫', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" class="an">' +
    '<path d="M17 24 Q9 7 28 13 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M47 24 Q55 7 36 13 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M19 20 Q16 12 24 15 Z" fill="#F2B8C6"/><path d="M45 20 Q48 12 40 15 Z" fill="#F2B8C6"/>' +
    '<circle cx="32" cy="39" r="19" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25" cy="37" r="2.7" fill="' + INK + '"/><circle cx="39" cy="37" r="2.7" fill="' + INK + '"/>' +
    '<path d="M30 44 q2 2.5 4 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 41 l-2 2.5 h4 Z" fill="#E8837B" stroke="none"/>' +
    '<ellipse cx="17" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/><ellipse cx="47" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/></svg>' },
  { name: '小狗', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" class="an">' +
    '<ellipse cx="14" cy="37" rx="9" ry="15" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(14 14 37)"/>' +
    '<ellipse cx="50" cy="37" rx="9" ry="15" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-14 50 37)"/>' +
    '<circle cx="32" cy="37" r="19" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="10" ry="7" fill="#FBF7F0" stroke="none"/>' +
    '<ellipse cx="32" cy="41" rx="3.6" ry="2.8" fill="' + INK + '"/>' +
    '<circle cx="24.5" cy="35" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="35" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  { name: '小熊', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" class="an">' +
    '<circle cx="17" cy="19" r="8.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="47" cy="19" r="8.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="17" cy="19" r="3.8" fill="#E8C9A8"/><circle cx="47" cy="19" r="3.8" fill="#E8C9A8"/>' +
    '<circle cx="32" cy="39" r="19" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="9.5" ry="6.5" fill="#EFD9BC" stroke="none"/>' +
    '<ellipse cx="32" cy="42" rx="3.4" ry="2.6" fill="' + INK + '"/>' +
    '<circle cx="25" cy="36" r="2.7" fill="' + INK + '"/><circle cx="39" cy="36" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  { name: '小象', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" class="an">' +
    '<ellipse cx="13" cy="36" rx="10" ry="16" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5" transform="rotate(10 13 36)"/>' +
    '<ellipse cx="51" cy="36" rx="10" ry="16" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-10 51 36)"/>' +
    '<circle cx="32" cy="36" r="19" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M26 44 Q25 55 33 56 Q39 57 40 51" stroke="' + INK + '" stroke-width="9" fill="none" stroke-linecap="round" opacity=".999"/>' +
    '<path d="M26 44 Q25 55 33 56 Q39 57 40 51" stroke="#CFC5E3" stroke-width="5.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24.5" cy="34" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="34" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="15" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="49" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  { name: '小青蛙', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" class="an">' +
    '<circle cx="19" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="45" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="19" cy="21" r="4" fill="' + INK + '"/><circle cx="45" cy="21" r="4" fill="' + INK + '"/>' +
    '<circle cx="20.5" cy="19.5" r="1.4" fill="#FFF"/><circle cx="46.5" cy="19.5" r="1.4" fill="#FFF"/>' +
    '<ellipse cx="32" cy="41" rx="21" ry="17" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M23 42 q9 8 18 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="13" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/><circle cx="51" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/></svg>' },
  { name: '小猪', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" class="an">' +
    '<path d="M17 23 Q10 8 27 14 Z" fill="#F5C0C5" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M47 23 Q54 8 37 14 Z" fill="#F5C0C5" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M19 19 Q16 12 24 14 Z" fill="#F2B8C6"/><path d="M45 19 Q48 12 40 14 Z" fill="#F2B8C6"/>' +
    '<circle cx="32" cy="38" r="19" fill="#F5C0C5" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="45" rx="9" ry="6.5" fill="#E8837B" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="28.5" cy="45" rx="1.7" ry="2.4" fill="' + INK + '"/><ellipse cx="35.5" cy="45" rx="1.7" ry="2.4" fill="' + INK + '"/>' +
    '<circle cx="24.5" cy="34" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="34" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="15" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="49" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' }
];

/* ---------- 通用图标 ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="5" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="23" y="5" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="5" y="23" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="23" y="23" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<circle cx="13" cy="13" r="4.5" fill="#E8975A"/><circle cx="31" cy="31" r="4.5" fill="#F2C94C"/>' +
    '<circle cx="31" cy="13" r="4.5" fill="#8FBF7F"/><circle cx="13" cy="31" r="4.5" fill="#CFC5E3"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  lamp: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 8 Q46 16 46 30 Q46 40 38 44 L38 50 H26 L26 44 Q18 40 18 30 Q18 16 32 8 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M27 55 h10 M29 60 h6" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  paw: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#4A3B2E">' +
    '<ellipse cx="32" cy="42" rx="13" ry="10"/>' +
    '<circle cx="15" cy="27" r="5.5"/><circle cx="27" cy="19" r="5.5"/>' +
    '<circle cx="39" cy="19" r="5.5"/><circle cx="50" cy="27" r="5.5"/></svg>'
};

/* ---------- 棋盘几何：4×4 宫 2×2；6×6 宫 2×3 ---------- */
const SIZES = {
  4: { n: 4, boxR: 2, boxC: 2 },
  6: { n: 6, boxR: 2, boxC: 3 }
};

/* ---------- 基础完整解模板（写死；值 0..n-1，行优先展开）
   全部经人工+程序双重验证：每行/列/宫恰为 0..n-1 的排列 ---------- */
const TEMPLATES = {
  4: [
    [0,1,2,3, 2,3,0,1, 1,0,3,2, 3,2,1,0],
    [0,1,2,3, 2,3,0,1, 3,2,1,0, 1,0,3,2]
  ],
  6: [
    [0,1,2,3,4,5, 3,4,5,0,1,2, 1,2,3,4,5,0, 4,5,0,1,2,3, 2,3,4,5,0,1, 5,0,1,2,3,4],
    [0,1,2,3,4,5, 3,4,5,0,1,2, 2,0,1,4,5,3, 4,5,3,2,0,1, 1,2,0,5,3,4, 5,3,4,1,2,0]
  ]
};

/* ---------- 关卡规格：静态 20 关（4 章 × 5）
   章 1-2 = 4×4 挖 5→7；章 3-4 = 6×6 挖 9→12（holes=挖洞目标，落在 SPEC 区间内） ---------- */
const LEVEL_SPECS = [
  { n: 4, holes: 5 }, { n: 4, holes: 5 }, { n: 4, holes: 6 }, { n: 4, holes: 6 }, { n: 4, holes: 6 },
  { n: 4, holes: 7 }, { n: 4, holes: 7 }, { n: 4, holes: 7 }, { n: 4, holes: 7 }, { n: 4, holes: 7 },
  { n: 6, holes: 9 }, { n: 6, holes: 9 }, { n: 6, holes: 10 }, { n: 6, holes: 10 }, { n: 6, holes: 10 },
  { n: 6, holes: 11 }, { n: 6, holes: 11 }, { n: 6, holes: 12 }, { n: 6, holes: 12 }, { n: 6, holes: 12 }
];
const CH_LEN = 5; // 5 关 = 1 章

/* ---------- 确定性随机（与 batch1/2/3 同实现） ---------- */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
