/* ================= pattern 游戏数据 =================
   图案池 12 种：6 形状 × 6 颜色组合（每形状恰 2 色、每色恰 2 形状）
   → 同形状/同色干扰项天然存在（双维度关的"半对"干扰全靠它）
   SVG 全部程序合成：形状渲染器（64×64 空间，2.5px 暖棕描边、圆润无尖角）+ 数量网格布局 */
'use strict';

const INK = '#4A3B2E';

const COLORS = {
  red: '#E86A5E', orange: '#F2994A', yellow: '#F2C94C',
  green: '#8FBF7F', blue: '#7FA8D9', purple: '#B79CE0'
};
const COLOR_KEYS = Object.keys(COLORS); // dualP 双轴独立周期第三色抽取域（r27）

/* ---------- 形状渲染器：64×64 空间 markup，C=填色 ---------- */
const SHAPE_DRAW = {
  ball: function (C) {
    return '<circle cx="32" cy="32" r="22" fill="' + C + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="23.5" cy="24" rx="5.5" ry="8.5" fill="#FFF" opacity=".35" transform="rotate(-24 23.5 24)"/>';
  },
  cushion: function (C) {
    return '<rect x="10" y="10" width="44" height="44" rx="13" fill="' + C + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="21.5" cy="21.5" rx="5" ry="7" fill="#FFF" opacity=".35" transform="rotate(-24 21.5 21.5)"/>';
  },
  drop: function (C) {
    return '<path d="M32 8 C41 22 47 33 49 41 C51 50 42 55 32 55 C22 55 13 50 15 41 C17 33 23 22 32 8 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<ellipse cx="25" cy="42" rx="3.5" ry="5.5" fill="#FFF" opacity=".35" transform="rotate(-15 25 42)"/>';
  },
  star: function (C) {
    return '<path d="M32 6 Q36 25 58 32 Q36 39 32 58 Q28 39 6 32 Q28 25 32 6 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="32" r="3.4" fill="#FFF" opacity=".65"/>';
  },
  heart: function (C) {
    return '<path d="M32 55 C10 41 8 25 18 17 C25 12 31 16 32 21 C33 16 39 12 46 17 C56 25 54 41 32 55 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<ellipse cx="22" cy="25" rx="4" ry="5.5" fill="#FFF" opacity=".35" transform="rotate(-24 22 25)"/>';
  },
  flower: function (C) {
    const petal = function (x, y) {
      return '<circle cx="' + x + '" cy="' + y + '" r="8.5" fill="' + C + '" stroke="' + INK + '" stroke-width="2.5"/>';
    };
    return petal(32, 14) + petal(46, 24) + petal(41, 41) + petal(23, 41) + petal(18, 24) +
      '<circle cx="32" cy="29" r="9" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>';
  }
};

/* ---------- 数量卡布局：n 个小图案在 64×64 内的行式排布（1-9） ---------- */
const COUNT_ROWS = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3] };
function countLayout(n) {
  const rows = COUNT_ROWS[Math.max(1, Math.min(9, n | 0))];
  const cols = Math.max.apply(null, rows), nr = rows.length, gap = 3;
  const s = Math.floor(Math.min((64 - 6 - (cols - 1) * gap) / cols, (64 - 6 - (nr - 1) * gap) / nr));
  const out = [];
  const y0 = (64 - (nr * s + (nr - 1) * gap)) / 2 + s / 2;
  rows.forEach(function (m, r) {
    const x0 = (64 - (m * s + (m - 1) * gap)) / 2 + s / 2;
    for (let c = 0; c < m; c++) out.push({ x: x0 + c * (s + gap), y: y0 + r * (s + gap), s: s });
  });
  return out;
}

/* ---------- 图案 → SVG（count=1 单图案；>1 数量网格） ---------- */
function iconSVG(item) {
  const C = COLORS[item.color] || COLORS.red;
  const n = item.count || 1;
  const inner = countLayout(n).map(function (p) {
    return '<g transform="translate(' + (p.x - p.s / 2) + ' ' + (p.y - p.s / 2) + ') scale(' + (p.s / 64) + ')">' +
      SHAPE_DRAW[item.shape](C) + '</g>';
  }).join('');
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' + inner + '</svg>';
}

/* ---------- 图案池 12 种（每 (形状,颜色) 组合唯一） ---------- */
const POOL = [
  ['ball', 'red'], ['cushion', 'yellow'], ['drop', 'orange'], ['star', 'red'], ['heart', 'blue'], ['flower', 'orange'],
  ['ball', 'blue'], ['cushion', 'green'], ['drop', 'purple'], ['star', 'yellow'], ['heart', 'green'], ['flower', 'purple']
].map(function (p) { return { shape: p[0], color: p[1], count: 1 }; });

function poolItem(shape, color) {
  for (let i = 0; i < POOL.length; i++) {
    if (POOL[i].shape === shape && POOL[i].color === color) return { shape: shape, color: color, count: 1 };
  }
  return { shape: 'ball', color: 'red', count: 1 };
}
/* 同形状的另一枚（颜色不同）/ 同颜色的另一枚（形状不同）——双维度关干扰项 */
function sameShape(item) {
  for (let i = 0; i < POOL.length; i++) {
    if (POOL[i].shape === item.shape && POOL[i].color !== item.color) return cloneItem(POOL[i]);
  }
  return null;
}
function sameColor(item) {
  for (let i = 0; i < POOL.length; i++) {
    if (POOL[i].color === item.color && POOL[i].shape !== item.shape) return cloneItem(POOL[i]);
  }
  return null;
}
function cloneItem(it) { return { shape: it.shape, color: it.color, count: it.count || 1 }; }

/* ---------- 问号卡面 ---------- */
const QUESTION_SVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
  '<text x="32" y="47" font-size="44" font-weight="bold" text-anchor="middle" fill="#FFFFFF" stroke="#4A3B2E" stroke-width="2" paint-order="stroke" font-family="sans-serif">?</text></svg>';

/* ---------- 通用图标 ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="7" y="10" width="20" height="26" rx="5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" transform="rotate(-9 17 23)"/>' +
    '<rect x="18" y="9" width="20" height="26" rx="5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" transform="rotate(9 28 22)"/>' +
    '<path d="M28 18 l2.2 4.4 4.8.6 -3.5 3.4.9 4.8 -4.4 -2.3 -4.4 2.3.9 -4.8 -3.5 -3.4 4.8 -.6 Z" fill="#E8975A"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};

/* ---------- 确定性随机（与 batch1/2 同实现） ---------- */
function mulberry32(a) {
  return function () {
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
