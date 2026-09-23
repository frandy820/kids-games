/* ============================================================
 * 涂色本（color）— 线稿库 + 推荐配色 + 关卡数据
 * 线稿全部内嵌 SVG（viewBox 200×200，闭区域 class="rg"，可填 6-10 个/张；
 * 装饰细节 class="det" 且 pointer-events:none，不抢点击）。
 * 静态 20 关 = 10 张两轮复用（base/alt 两套推荐配色）；flat≥20 为生成关。
 * ============================================================ */

/* 12 色高饱和儿童色板（调色盘豁免"≤3 色并置"约束） */
const COL_PAL = ['#E0503C', '#F0913D', '#F5C445', '#8FBF7F', '#55925A', '#5FC4CE',
  '#6E9BD8', '#9B6BC7', '#F2A9BE', '#A9744F', '#8A9BAE', '#4A3B2E'];

/* 描边统一 3px 暖棕（spec §3：线条 3px；风格圆润） */
const CS = 'stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

/* 几何构件助手（class="rg"=可填区域，绘制顺序即区域顺序） */
const _e = (cx, cy, rx, ry, tr) => '<ellipse class="rg" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"' + (tr ? ' transform="' + tr + '"' : '') + '/>';
const _c = (cx, cy, r) => '<circle class="rg" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
const _p = d => '<path class="rg" d="' + d + '"/>';
const _r = (x, y, w, h, rx, tr) => '<rect class="rg" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '"' + (tr ? ' transform="' + tr + '"' : '') + '/>';
/* 装饰细节（不可填、不响应指针）：fill 由内联指定或 none */
const _d = inner => '<g class="det">' + inner + '</g>';
const _dl = d => '<path d="' + d + '" fill="none" ' + CS + '/>';
const _dc = (cx, cy, r, f) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (f || '#4A3B2E') + '"/>';

/* 笑脸细节（眼+腮+嘴，居中于 ex,ey） */
const _face = (ex, ey, s, noMouth) => _d(
  _dl('M' + (ex - 9 * s) + ' ' + ey + ' q3 ' + (-4 * s) + ' 6 0 M' + (ex + 3 * s) + ' ' + ey + ' q3 ' + (-4 * s) + ' 6 0') +
  (noMouth ? '' : _dl('M' + (ex - 5 * s) + ' ' + (ey + 8 * s) + ' q5 ' + (5 * s) + ' 10 0')));

/* ---------- 10 张线稿 ----------
 * 每张返回 SVG 内部标记（区域顺序在注释中逐一列出，推荐配色数组按此顺序对齐） */
const COL_PICS = [
  { id: 'flower', name: '花', art() {
      /* 区域: 0茎 1左叶 2右叶 3-8六花瓣 9花心 */
      let petals = '';
      for (let k = 0; k < 6; k++) petals += _e(144, 78, 26, 17, 'rotate(' + (k * 60) + ' 100 78)');
      return _r(94, 100, 12, 84, 6) +
        _e(78, 150, 22, 11, 'rotate(-30 78 150)') + _e(122, 160, 22, 11, 'rotate(30 122 160)') +
        petals + _c(100, 78, 20) +
        _d(_dl('M95 84 q5 5 10 0')) + _face(100, 78, 1, true);
    } },
  { id: 'butterfly', name: '蝴蝶', art() {
      /* 区域: 0头 1身体 2左上翅 3右上翅 4左下翅 5右下翅 */
      return _c(100, 58, 14) + _e(100, 112, 13, 40) +
        _e(58, 86, 34, 26, 'rotate(-20 58 86)') + _e(142, 86, 34, 26, 'rotate(20 142 86)') +
        _e(66, 138, 25, 19, 'rotate(18 66 138)') + _e(134, 138, 25, 19, 'rotate(-18 134 138)') +
        _d(_dl('M92 47 Q84 30 74 26 M108 47 Q116 30 126 26') +
          '<circle cx="74" cy="26" r="4" fill="#4A3B2E"/><circle cx="126" cy="26" r="4" fill="#4A3B2E"/>' +
          '<circle cx="58" cy="82" r="6" fill="#FFFDF7" ' + CS + '/><circle cx="142" cy="82" r="6" fill="#FFFDF7" ' + CS + '/>' +
          '<circle cx="68" cy="136" r="4" fill="#FFFDF7" ' + CS + '/><circle cx="132" cy="136" r="4" fill="#FFFDF7" ' + CS + '/>') +
        _face(100, 56, 0.8, true);
    } },
  { id: 'fish', name: '小鱼', art() {
      /* 区域: 0身体 1尾巴 2背鳍 3腹鳍 4侧鳍 5-7泡泡 */
      return _p('M64 80 Q90 42 120 72 Q94 66 64 80 Z') +
        _p('M76 128 Q84 156 108 150 Q94 136 76 128 Z') +
        _e(92, 100, 52, 34) + _p('M140 100 L174 72 Q182 100 174 128 Z') +
        _e(96, 108, 14, 8, 'rotate(-25 96 108)') +
        _c(160, 44, 7) + _c(174, 64, 5) + _c(152, 24, 5) +
        _d('<circle cx="68" cy="92" r="7" fill="#FFFDF7" ' + CS + '/>' + _dc(68, 92, 3) +
          _dl('M56 108 q6 6 14 4 M104 78 q6 12 0 22'));
    } },
  { id: 'house', name: '房子', art() {
      /* 区域: 0烟囱 1屋顶 2墙 3阁楼窗 4左窗 5右窗 6门 */
      return _r(130, 56, 16, 34, 3) +
        _p('M38 108 L100 50 L162 108 Z') + _r(48, 104, 104, 72, 4) +
        _c(100, 86, 12) + _r(58, 118, 26, 26, 4) + _r(116, 118, 26, 26, 4) +
        _p('M88 176 v-20 a13 13 0 0 1 26 0 v20 Z') +
        _d(_dl('M71 118 v26 M58 131 h26 M129 118 v26 M116 131 h26') + _dc(108, 158, 3) +
          _dl('M22 66 q8 -8 16 0 M30 58 q8 -8 16 0 M20 78 q8 -8 16 0'));
    } },
  { id: 'rabbit', name: '小兔子', art() {
      /* 区域: 0左外耳 1右外耳 2左内耳 3右内耳 4身体 5左脚 6右脚 7头 8肚皮 */
      return _e(84, 44, 11, 26, 'rotate(-12 84 44)') + _e(116, 44, 11, 26, 'rotate(12 116 44)') +
        _e(84, 47, 5, 15, 'rotate(-12 84 47)') + _e(116, 47, 5, 15, 'rotate(12 116 47)') +
        _e(100, 140, 36, 32) + _e(84, 172, 13, 7) + _e(116, 172, 13, 7) +
        _c(100, 92, 30) + _e(100, 146, 20, 16) +
        _d(_dc(89, 88, 3.5) + _dc(111, 88, 3.5) +
          '<ellipse cx="84" cy="98" rx="5.5" ry="3.8" fill="#F2B8C6" opacity=".85"/><ellipse cx="116" cy="98" rx="5.5" ry="3.8" fill="#F2B8C6" opacity=".85"/>' +
          _dl('M100 94 v5 M95 102 q5 4 10 0 M74 92 h-12 M74 98 h-12 M126 92 h12 M126 98 h12'));
    } },
  { id: 'balloon', name: '气球', art() {
      /* 区域: 0球1 1结1 2球2 3结2 4球3 5结3 6球4 7结4 */
      return _e(62, 74, 28, 34) + _p('M56 106 l6 10 l6 -10 Z') +
        _e(140, 66, 28, 34) + _p('M134 98 l6 10 l6 -10 Z') +
        _e(88, 134, 26, 32) + _p('M82 164 l6 9 l6 -9 Z') +
        _e(148, 138, 24, 29) + _p('M142 165 l6 9 l6 -9 Z') +
        _d(_dl('M62 116 q-14 22 2 40 q12 14 -2 34 M140 108 q16 20 0 38 q-12 16 4 36 M88 173 q-10 16 4 30 M148 174 q12 16 -2 32') +
          _dl('M50 62 q6 -8 14 -6 M128 54 q6 -8 14 -6'));
    } },
  { id: 'tree', name: '大树', art() {
      /* 区域: 0树干 1左冠 2右冠 3顶冠 4-6苹果 7草地 */
      return _r(90, 112, 20, 60, 6) +
        _c(72, 84, 34) + _c(128, 84, 34) + _c(100, 56, 36) +
        _c(84, 90, 7) + _c(120, 72, 7) + _c(110, 106, 7) +
        _p('M14 188 Q50 172 100 184 Q150 172 186 188 Z') +
        _d(_dl('M96 130 q4 3 0 8 M104 136 q-4 3 0 8'));
    } },
  { id: 'sun', name: '太阳', art() {
      /* 区域: 0脸 1-8八道光芒 */
      let rays = '';
      for (let k = 0; k < 8; k++) rays += _r(95, 30, 10, 22, 5, 'rotate(' + (k * 45) + ' 100 100)');
      return rays + _c(100, 100, 42) +
        _d(_dl('M82 94 q4 -6 9 0 M109 94 q4 -6 9 0') +
          '<ellipse cx="80" cy="106" rx="6" ry="4" fill="#F2B8C6" opacity=".85"/><ellipse cx="120" cy="106" rx="6" ry="4" fill="#F2B8C6" opacity=".85"/>' +
          _dl('M86 110 q14 12 28 0'));
    } },
  { id: 'boat', name: '小船', art() {
      /* 区域: 0大帆 1小帆 2桅杆 3旗 4船身 5云 6后浪 7前浪 */
      return _p('M92 58 L92 128 L40 128 Z') + _p('M108 64 L108 122 L148 122 Z') +
        _r(96, 52, 8, 86, 4) + _p('M104 50 L132 58 L104 66 Z') +
        _p('M34 138 L166 138 L146 172 L54 172 Z') + _e(146, 32, 24, 13) +
        _p('M6 156 Q28 144 50 156 Q72 144 94 156 Q116 144 138 156 Q160 144 182 156 L194 162 L194 200 L6 200 Z') +
        _p('M6 178 Q28 166 50 178 Q72 166 94 178 Q116 166 138 178 Q160 166 182 178 L194 184 L194 200 L6 200 Z');
    } },
  { id: 'cake', name: '蛋糕', art() {
      /* 区域: 0盘 1底层 2顶层 3糖霜 4蜡烛 5火苗 6-7樱桃 */
      return _e(100, 172, 66, 12) +
        _r(52, 128, 96, 40, 8) + _r(64, 88, 72, 40, 8) +
        _p('M64 96 Q70 80 78 92 Q84 78 92 90 Q98 76 106 88 Q114 78 120 92 Q128 80 136 96 Z') +
        _r(95, 62, 10, 28, 4) + _p('M100 42 Q108 50 100 58 Q92 50 100 42 Z') +
        _c(74, 82, 7) + _c(126, 82, 7) +
        _d(_dl('M64 146 h72 M64 158 h72') +
          '<circle cx="82" cy="112" r="2.5" fill="#4A3B2E"/><circle cx="100" cy="108" r="2.5" fill="#4A3B2E"/><circle cx="118" cy="112" r="2.5" fill="#4A3B2E"/>');
    } }
];

/* ---------- 推荐配色（引导用，不强制：任意色填满都 3 星） ----------
 * 数组下标 = 区域顺序，值 = 调色盘色号 */
const COL_REC = {
  base: {
    flower:   [4, 3, 3, 8, 2, 8, 2, 8, 2, 1],
    butterfly:[2, 9, 5, 6, 3, 4],
    fish:     [2, 2, 1, 1, 1, 5, 5, 5],
    house:    [9, 0, 2, 6, 5, 5, 9],
    rabbit:   [8, 8, 8, 8, 2, 9, 9, 2, 3],
    balloon:  [0, 9, 2, 9, 3, 9, 6, 9],
    tree:     [9, 3, 3, 4, 0, 0, 0, 4],
    sun:      [1, 1, 1, 1, 1, 1, 1, 1, 2],
    boat:     [8, 8, 9, 0, 9, 5, 6, 5],
    cake:     [10, 8, 2, 8, 6, 1, 0, 0]
  },
  alt: {
    flower:   [4, 3, 3, 7, 6, 7, 6, 7, 6, 2],
    butterfly:[2, 9, 7, 8, 2, 1],
    fish:     [7, 7, 6, 6, 6, 5, 5, 5],
    house:    [9, 6, 3, 2, 8, 8, 0],
    rabbit:   [7, 7, 8, 8, 6, 1, 1, 6, 5],
    balloon:  [8, 9, 5, 9, 7, 9, 1, 9],
    tree:     [9, 1, 2, 1, 0, 0, 0, 4],
    sun:      [1, 0, 1, 0, 1, 0, 1, 0, 2],
    boat:     [6, 6, 9, 2, 9, 10, 5, 4],
    cake:     [10, 3, 2, 3, 7, 1, 2, 2]
  }
};

/* ---------- 关卡表 ----------
 * v1（2026-09-05）：静态 20 关自由涂色 + 生成关随机底图——r6 后仅 ch1 沿用其机制。
 * r6（2026-09-13 难度改造，真值源=SPEC-BATCH2.md §5）：
 *   ch1 flat0-4  free  自由涂色（v1 机制零改动，教学/奖励底座）
 *   ch2 flat5-9  match 参考图记忆配色（参考图首次填涂尝试后隐藏；逐格判定制）
 *   ch3 flat10-14 mix  三原色调色（当前目标桶制；混色封闭表 6 条）
 *   ch4 flat15-19 pat  规律涂色（前 3 格预涂第 4 格起自推；lv0-2 固定 AB/ABC/AAB，lv3-4 seeded 生成）
 *   flat≥20      gen   生成关混排（mv 首抽 1/3 分段选模式，参数同式 seeded）
 * 全部确定性：mulberry32(flat*7919+13)，RNG 取数序=SPEC §5 定版（verify 同式副本对账）。 */
const COL_CH_LEN = 5;
const COL_TOTAL_STATIC = 20;
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- r6 封闭数据（verify 内以 SPEC 文字独立重列，禁引此处互证） ---------- */
/* 混色封闭表 6 条（key=入缸顺序对；红0 黄2 蓝6 → 橙1 绿3 紫7）：
   红+黄=橙 / 黄+红=橙 / 黄+蓝=绿 / 蓝+黄=绿 / 红+蓝=紫 / 蓝+红=紫；
   同色对与表外组合=错混（miss +「再试试别的两个颜色」方向锚）。 */
const R6_MIX_TABLE = { '0+2': 1, '2+0': 1, '2+6': 3, '6+2': 3, '0+6': 7, '6+0': 7 };
const R6_MIX_PRIM = [0, 2, 6];                        /* 三原色（COL_PAL 下标：红/黄/蓝） */
const R6_MIX_TARGETS = [1, 3, 7];                     /* 目标二级色（橙/绿/紫） */
/* ch4 固定规律 3 套（lv0-2；period 周期=COL_PAL 下标序列） */
const R6_PAT_FIXED = [
  { period: [0, 2], cells: 10 },                      /* lv0 AB  红-黄 */
  { period: [0, 6, 3], cells: 10 },                   /* lv1 ABC 红-蓝-绿 */
  { period: [1, 1, 7], cells: 10 }                    /* lv2 AAB 橙-橙-紫 */
];
const R6_PAT_PRE = 3;                                 /* 前 3 格预涂（第 4 格起自己推） */
const R6_PAT_POOL = [0, 1, 2, 3, 5, 6, 7, 8];         /* 生成规律取色池（高区分 8 色） */

/* Fisher-Yates 洗牌（RNG 取数序定版：i 从尾往前，j=⌊rnd()*(i+1)⌋） */
function r6Shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
/* mix 关体（RNG 取数序：picIdx → 目标顺序洗牌 → 每目标 1-2 区 → 区域索引洗牌取前 K 依序分配） */
function colMixBody(flat, rnd) {
  const picIdx = Math.floor(rnd() * COL_PICS.length);
  const targets = r6Shuffle(R6_MIX_TARGETS.slice(), rnd);
  const counts = [1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2)];
  const nReg = colRegionCount(picIdx);
  const idxs = r6Shuffle(Array.from({ length: nReg }, (_, i) => i), rnd).slice(0, counts[0] + counts[1] + counts[2]);
  const marks = [];
  let pos = 0;
  for (let t = 0; t < 3; t++) for (let k = 0; k < counts[t]; k++) marks.push({ r: idxs[pos++], c: targets[t] });
  return { flat: flat, mode: 'mix', picIdx: picIdx, targets: targets, marks: marks,
    rec: COL_REC.base[COL_PICS[picIdx].id].slice() };   /* 非目标区预涂（画面上下文） */
}
/* pat 生成体（RNG 取数序：plen → (plen=3 时) 型别 abc/aab → 取色去重洗牌） */
function r6PatBody(rnd) {
  const plen = rnd() < 0.5 ? 2 : 3;
  let period;
  if (plen === 2) period = r6Shuffle(R6_PAT_POOL.slice(), rnd).slice(0, 2);
  else if (rnd() < 0.5) period = r6Shuffle(R6_PAT_POOL.slice(), rnd).slice(0, 3);
  else { const c2 = r6Shuffle(R6_PAT_POOL.slice(), rnd).slice(0, 2); period = [c2[0], c2[0], c2[1]]; }
  return { period: period, cells: 10 };
}
function colGetLevel(flat) {
  if (flat < 5) {                                     /* ch1 free：v1 行为零改动 */
    const picIdx = flat % 10;
    return { flat: flat, mode: 'free', picIdx: picIdx, rec: COL_REC.base[COL_PICS[picIdx].id].slice(), gen: false };
  }
  if (flat < 10) {                                    /* ch2 match：base 推荐=判定答案 */
    const picIdx = flat - 5;
    return { flat: flat, mode: 'match', picIdx: picIdx, rec: COL_REC.base[COL_PICS[picIdx].id].slice(), gen: false };
  }
  if (flat < 15) {                                    /* ch3 mix */
    const lv = colMixBody(flat, mulberry32(flat * 7919 + 13));
    lv.gen = false; return lv;
  }
  if (flat < 20) {                                    /* ch4 pat：lv0-2 固定 / lv3-4 生成 */
    const li = flat - 15, seeded = li >= 3;
    const p = seeded ? r6PatBody(mulberry32(flat * 7919 + 13))
      : { period: R6_PAT_FIXED[li].period.slice(), cells: R6_PAT_FIXED[li].cells };
    return { flat: flat, mode: 'pat', period: p.period, cells: p.cells, pre: R6_PAT_PRE, gen: seeded };
  }
  /* 生成关混排：mv 首抽 1/3 分段（mv<1/3 match / <2/3 mix / else pat），内容续用同一流 */
  const rnd = mulberry32(flat * 7919 + 13);
  const mv = rnd();
  if (mv < 1 / 3) {                                   /* match：v1 生成配色机制（取数序沿用） */
    const picIdx = Math.floor(rnd() * COL_PICS.length);
    const nSub = 3 + Math.floor(rnd() * 3);           /* 推荐子色板 3-5 色，保证协调 */
    const sub = [];
    while (sub.length < nSub) {
      const c = Math.floor(rnd() * COL_PAL.length);
      if (sub.indexOf(c) < 0) sub.push(c);
    }
    const nReg = colRegionCount(picIdx);
    const rec = [];
    for (let i = 0; i < nReg; i++) rec.push(sub[Math.floor(rnd() * sub.length)]);
    return { flat: flat, mode: 'match', picIdx: picIdx, rec: rec, gen: true };
  }
  if (mv < 2 / 3) { const lv = colMixBody(flat, rnd); lv.gen = true; return lv; }
  const p = r6PatBody(rnd);
  return { flat: flat, mode: 'pat', period: p.period, cells: p.cells, pre: R6_PAT_PRE, gen: true };
}
/* 区域数缓存（pics 是函数式生成，数 .rg 个数一次即可） */
const _regCountCache = {};
function colRegionCount(picIdx) {
  if (!(picIdx in _regCountCache)) {
    const div = document.createElement('div');
    div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' + COL_PICS[picIdx].art() + '</svg>';
    _regCountCache[picIdx] = div.querySelectorAll('.rg').length;
  }
  return _regCountCache[picIdx];
}
