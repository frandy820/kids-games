/* tangram 数据层：形状表 / 模板库（design.py 校验通过 + solve7.py 搜索补足）/ 关卡编排 / 确定性生成 */
'use strict';

/* 单位坐标形状（与 _tools/design.py 一致）：rot 单位=45°，锚点=旋转后顶点0 */
const SHAPES = {
  LT: [[0, 0], [4, 0], [2, 2]],      // 大三角（等腰直角 腿4 面积4）
  MT: [[0, 0], [2, 0], [0, 2]],      // 中三角（腿2 面积2）
  ST: [[0, 0], [2, 0], [1, 1]],      // 小三角（斜边2 面积1）
  SQ: [[0, 0], [1, 1], [2, 0], [1, -1]], // 正方形（斜放基准 面积2）
  PA: [[0, 0], [2, 0], [3, 1], [1, 1]]   // 平行四边形（面积2）
};
const AREA = { LT: 4, MT: 2, ST: 1, SQ: 2, PA: 2 };
const PIECE_COL = { LT: '#E8975A', MT: '#8FBF7F', ST: '#F2B8C6', SQ: '#E8B04F', PA: '#8A9BAE' };
/* 旋转外观等价周期（45°步数）：等腰直角三角转180°占位不同→周期8；正方形90°→2；平四180°→4 */
const ROT_PERIOD = { LT: 8, MT: 8, ST: 8, SQ: 2, PA: 4 };

/* 模板库（全部经 design.py 重叠校验 OK；square7 等 7 块形由 _tools/solve7.py 精确搜索产出） */
const TPL = {
  /* 第一章 2-3 块 */
  mountain2: [{ t: 'LT', x: 4, y: 3, r: 4 }, { t: 'MT', x: 6, y: 3, r: 4 }],
  mountain3: [{ t: 'LT', x: 4, y: 3, r: 4 }, { t: 'MT', x: 6, y: 3, r: 4 }, { t: 'ST', x: 8, y: 3, r: 4 }],
  tree: [{ t: 'LT', x: 4, y: 2, r: 4 }, { t: 'SQ', x: 1.2928932188134525, y: 2, r: 1 }],
  flag: [{ t: 'PA', x: 2, y: 1, r: 2 }, { t: 'SQ', x: 2, y: 1, r: 1 }, { t: 'ST', x: 3.414213562373095, y: 2.414213562373095, r: 6 }],
  rocket: [{ t: 'ST', x: 3, y: 3, r: 4 }, { t: 'PA', x: 2, y: 3, r: 2 }, { t: 'SQ', x: 2, y: 5, r: 1 }],
  /* 第二章 4-5 块 */
  house4: [{ t: 'LT', x: 4, y: 2, r: 4 }, { t: 'MT', x: 1, y: 2, r: 0 }, { t: 'ST', x: 3, y: 2, r: 2 }, { t: 'ST', x: 3, y: 4, r: 0 }],
  candle4: [{ t: 'PA', x: 2, y: 1, r: 2 }, { t: 'ST', x: 2, y: 1, r: 4 }, { t: 'MT', x: 0, y: 4, r: 0 }, { t: 'SQ', x: 2, y: 5, r: 1 }],
  bridge5: [{ t: 'ST', x: 0, y: 2, r: 2 }, { t: 'ST', x: 4, y: 2, r: 0 }, { t: 'SQ', x: 1, y: 0.2928932188134525, r: 0 }, { t: 'PA', x: 1, y: 4, r: 0 }, { t: 'PA', x: 4, y: 3, r: 4 }],
  /* solve7.py 边邻接生长搜索产出（grow 模式：连通由构造保证；每形再过 connectivity() 严格共享边判据
     + VLM 单形大图终审连通/可辨识。bridge7/T7A/T7B 旧池经严格判据实证不连通（点接触=视觉漂浮）已全部移除） */
  T7S: [{ t: 'LT', x: 4, y: 4, r: 4 }, { t: 'LT', x: 0, y: 4, r: 6 }, { t: 'MT', x: 4, y: 0, r: 2 }, { t: 'ST', x: 4, y: 2, r: 2 }, { t: 'ST', x: 1, y: 1, r: 0 }, { t: 'SQ', x: 3, y: 3, r: 6 }, { t: 'PA', x: 0, y: 0, r: 0 }],
  bird7: [{ t: 'LT', x: 5, y: 5, r: 6 }, { t: 'LT', x: 6, y: 4, r: 2 }, { t: 'MT', x: 6, y: 7, r: 6 }, { t: 'ST', x: 3, y: 5, r: 0 }, { t: 'ST', x: 4, y: 8, r: 6 }, { t: 'SQ', x: 4, y: 6, r: 4 }, { t: 'PA', x: 4, y: 5, r: 4 }],
  fox7: [{ t: 'LT', x: 2, y: 5, r: 0 }, { t: 'LT', x: 7, y: 4, r: 2 }, { t: 'MT', x: 6, y: 3, r: 0 }, { t: 'ST', x: 6, y: 2, r: 2 }, { t: 'ST', x: 8, y: 3, r: 2 }, { t: 'SQ', x: 2, y: 5, r: 2 }, { t: 'PA', x: 5, y: 3, r: 6 }],
  fish7: [{ t: 'LT', x: 0, y: 6, r: 6 }, { t: 'LT', x: 4, y: 6, r: 4 }, { t: 'MT', x: 3, y: 6, r: 2 }, { t: 'ST', x: 4, y: 4, r: 2 }, { t: 'ST', x: 0, y: 2, r: 0 }, { t: 'SQ', x: 3, y: 5, r: 6 }, { t: 'PA', x: 5, y: 3, r: 2 }],
  chick7: [{ t: 'LT', x: 1, y: 0, r: 0 }, { t: 'LT', x: 4, y: 1, r: 2 }, { t: 'MT', x: 1, y: 2, r: 0 }, { t: 'ST', x: 3, y: 6, r: 6 }, { t: 'ST', x: 2, y: 2, r: 4 }, { t: 'SQ', x: 5, y: 0, r: 2 }, { t: 'PA', x: 5, y: 0, r: 0 }],
  plane7: [{ t: 'LT', x: 7, y: 2, r: 2 }, { t: 'LT', x: 5, y: 8, r: 6 }, { t: 'MT', x: 4, y: 3, r: 0 }, { t: 'ST', x: 7, y: 6, r: 2 }, { t: 'ST', x: 5, y: 4, r: 2 }, { t: 'SQ', x: 6, y: 3, r: 6 }, { t: 'PA', x: 5, y: 3, r: 4 }],
  cat7: [{ t: 'LT', x: 4, y: 7, r: 4 }, { t: 'LT', x: 4, y: 3, r: 2 }, { t: 'MT', x: 4, y: 4, r: 6 }, { t: 'ST', x: 6, y: 2, r: 2 }, { t: 'ST', x: 5, y: 3, r: 6 }, { t: 'SQ', x: 6, y: 0, r: 2 }, { t: 'PA', x: 3, y: 8, r: 4 }]
};
/* 7 块池（章 3-4 + 无限生成共用）：全部严格连通（verify 有 tplConnected 断言） */
const T7_POOL = ['T7S', 'bird7', 'fox7', 'fish7', 'chick7', 'plane7', 'cat7'];

/* 静态关卡编排（4 章 20 关）：难度=块数递增；章 3-4 为 7 块形（T7_POOL 轮转，散布不同=关卡差异） */
const CH_LEN = 5;
const STATIC_LEVELS = [
  ['mountain2', 'tree', 'mountain3', 'rocket', 'flag'],           // 第 1 章 2-3 块
  ['house4', 'candle4', 'bridge5', 'house4', 'candle4'],           // 第 2 章 4-5 块（复用配不同散布）
  ['T7S', 'bird7', 'fox7', 'fish7', 'chick7'],                     // 第 3 章 7 块
  ['plane7', 'cat7', 'bird7', 'fox7', 'fish7']                     // 第 4 章 7 块（复用配不同散布）
];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const SQ2D2 = Math.SQRT2 / 2;
/* 取第 flat 关模板（静态 20 + 无限生成：T7_POOL 确定性轮转；回退目标也严格连通） */
function tplOf(flat) {
  let name;
  if (flat < 20) name = STATIC_LEVELS[Math.floor(flat / CH_LEN)][flat % CH_LEN];
  else name = T7_POOL[(flat - 20) % T7_POOL.length];
  if (!TPL[name]) name = 'T7S';   // 模板缺失回退（保可玩，回退形本身严格连通）
  return { name, pcs: TPL[name] };
}
const GEN_HINTS = ['更大的拼图图形哦', '更多块块的挑战哦', '新的七巧板图形哦'];
function nextHint(ci) {
  if (ci == null) return '明天有' + GEN_HINTS[0];
  return (ci < 2 ? '块数更多的拼图哦' : '明天有' + GEN_HINTS[ci % GEN_HINTS.length]);
}
