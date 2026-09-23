/* ================= blocks 游戏数据（章配置 / 语音文案与题面 clip / 等轴测几何 + 投影卡 SVG 工具）
   题面语音=封闭句单 clip（SPEC-BATCH14 §0.23/§1）：blo_q_count/fill/front/top 四条覆盖四题型全组合；
   数词 blo_n_1..12 为本游戏自建副本（§0.25 禁跨游戏复用），sayR 读题备用（选项数字大字显示不走语音）
   等轴测渲染（SPEC §1 本款最大难点）：
   - 每立方体三面平行四边形：top 最亮 / right 中 / left 最暗（暖色系）
   - 画序=从后到前（depth=r+c 升序）从下到上（同柱 k 升序）→ 后排先画被前排正确遮挡
   - 全部顶点由 isoFaces() 同一公式生成 → 相邻面/相邻层共享顶点零错位（§0.15 禁手拼） */
'use strict';

const INK = '#4A3B2E';

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 count 数方块（3×2 基底无空列，被遮挡也要数）
   ch2 fill 补方块（缺损堆+虚线目标盒，缺 2-6）
   ch3 front 正视图（每列取 max h 条形投影，3 选 1 图卡）
   ch4 top 俯视图（footprint 二值网格，3 选 1 图卡）
   hint=章末预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '数方块', hint: '缺了洞洞的方块堆，补一补' },
  2: { name: '补方块', hint: '换个方向看一看方块' },
  3: { name: '正视图', hint: '从上面往下看一看' },
  4: { name: '俯视图', hint: '新一轮空间方块挑战' }
};
const GEN_HINTS = ['数方块再数一次', '补齐方块挑战', '看一看正视图', '俯视图挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/manifest.json 严格一致 §0.18）
   四题面全封闭句单 clip；wrong 专属 clip blo_wrong（§0.24） ---------- */
const VOICE = {
  watch:  { key: 'blo_tut_watch', text: '看！方块叠叠高' },
  turn:   { key: 'blo_tut_turn',  text: '你来数一数' },
  hint:   { key: 'blo_hint',      text: '看不见的也要数一数' },
  wrong:  { key: 'blo_wrong',     text: '再想一想，数一数' },
  qcount: { key: 'blo_q_count',   text: '数一数，一共有几个方块' },
  qfill:  { key: 'blo_q_fill',    text: '数一数，还缺几个方块' },
  qfront: { key: 'blo_q_front',   text: '从前面看，是哪一个呀' },
  qtop:   { key: 'blo_q_top',     text: '从上面往下看，是哪一个呀' }
};
/* 题型 → 题面 clip 单元（全封闭句，无拼接） */
const qVoice = q => q.kind === 'count' ? VOICE.qcount : q.kind === 'fill' ? VOICE.qfill :
  q.kind === 'front' ? VOICE.qfront : VOICE.qtop;

/* ---------- 中文数词 1-12（blo_n_* 副本在 manifest；sayR 读题备用） ---------- */
const NUM_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
  9: '九', 10: '十', 11: '十一', 12: '十二' };
const numCn = n => NUM_CN[n] || String(n);
const nKey = n => 'blo_n_' + n;

/* ---------- 等轴测几何（SPEC §1）：单位向量 c=(ux,uy) 右前 / r=(-ux,uy) 左前 / z=(0,-uz)
   格 (r,c) 北角 N=(x,y)，x=(c-r)*ux，y=(c+r)*uy；第 k 层块底面抬升 k*uz ---------- */
const ISO = { ux: 34, uy: 17, uz: 38 };
const CUBE = { top: '#F8D494', right: '#E8975A', left: '#C7793F', edge: '#4A3B2E' };
const GROUND = { fill: '#F3E7D0', line: '#D9C5A6' };

/* 格 (r,c) 第 k 层立方体的三面 path（可见面=top+right(+c 法线朝屏幕右前)+left(+r 法线朝屏幕左前)；
   所有顶点同公式 → 层间/面间共享顶点，几何零错位） */
function isoFaces(r, c, k) {
  const ux = ISO.ux, uy = ISO.uy, uz = ISO.uz;
  const x = (c - r) * ux, y = (c + r) * uy - k * uz;
  const eX = x + ux, eY = y + uy, sY = y + 2 * uy, wX = x - ux, wY = y + uy;
  return {
    top:   'M' + x + ',' + (y - uz) + ' L' + eX + ',' + (eY - uz) + ' L' + x + ',' + (sY - uz) + ' L' + wX + ',' + (wY - uz) + ' Z',
    right: 'M' + eX + ',' + eY + ' L' + x + ',' + sY + ' L' + x + ',' + (sY - uz) + ' L' + eX + ',' + (eY - uz) + ' Z',
    left:  'M' + x + ',' + sY + ' L' + wX + ',' + wY + ' L' + wX + ',' + (wY - uz) + ' L' + x + ',' + (sY - uz) + ' Z'
  };
}
/* 格 (r,c) 地面菱形（z=0，含 h=0 空格也画 → 孩子看得到基底格，top 章教学关键） */
const isoGround = (r, c) => {
  const ux = ISO.ux, uy = ISO.uy;
  const x = (c - r) * ux, y = (c + r) * uy;
  return 'M' + x + ',' + y + ' L' + (x + ux) + ',' + (y + uy) + ' L' + x + ',' + (y + 2 * uy) + ' L' + (x - ux) + ',' + (y + uy) + ' Z';
};
/* 格 (r,c) 在高度层 k 的顶面菱形四角中点集合（虚线目标盒用；k=目标高 gt → 顶面 z=gt*uz） */
function isoTopDiamond(r, c, k) {
  const ux = ISO.ux, uy = ISO.uy, uz = ISO.uz;
  const x = (c - r) * ux, y = (c + r) * uy - k * uz;
  return { n: [x, y - uz], e: [x + ux, y + uy - uz], s: [x, y + 2 * uy - uz], w: [x - ux, y + uy - uz] };
}
/* 竖棱（东/南/西角）从层 k1 到 k2 的线段（fill 缺口虚线围栏用） */
function isoEdge(r, c, which, k1, k2) {
  const ux = ISO.ux, uy = ISO.uy, uz = ISO.uz;
  const x = (c - r) * ux, y = (c + r) * uy;
  const pt = which === 'e' ? [x + ux, y + uy] : which === 's' ? [x, y + 2 * uy] : [x - ux, y + uy];
  return 'M' + pt[0] + ',' + (pt[1] - k1 * uz) + ' L' + pt[0] + ',' + (pt[1] - k2 * uz);
}

/* ---------- 场景 SVG：地面格 + 柱堆（画序 depth=r+c 升序、同 depth r 升序、柱内 k 升序）
   + fill 型虚线目标盒（目标顶菱形 + 缺口竖围栏，画最后 fill=none 不遮挡）
   返回 { svg, cells }：cells=画序立方体列表（教学演示逐柱高亮用） ---------- */
function sceneSvg(q) {
  const R = q.R, C = q.C, cols = q.cols;
  const cubes = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
    for (let k = 0; k < cols[r][c]; k++) cubes.push({ r: r, c: c, k: k });
  cubes.sort((a, b) => (a.r + a.c) - (b.r + b.c) || a.r - b.r || a.k - b.k);
  /* 包围盒：地面四角全枚举 + 每柱顶面最高点 */
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const grow = (px, py) => { if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const x = (c - r) * ISO.ux, y = (c + r) * ISO.uy;
    /* 审查 M3：fill 型虚线目标盒顶菱形按 goal 高（可高于当前柱），一并计入顶界防裁剪 */
    const top = q.goal ? Math.max(q.goal[r][c], cols[r][c]) : cols[r][c];
    grow(x - ISO.ux, y - top * ISO.uz - ISO.uz);
    grow(x + ISO.ux, y + 2 * ISO.uy);
  }
  /* 审查 M3：教学角标区（最南柱下方 15+圆半径 14+文字下延余量）计入底界防裁剪 */
  grow(0, (R - 1 + C - 1) * ISO.uy + 2 * ISO.uy + 15 + 16);
  const pad = 10;
  const vb = (minX - pad) + ' ' + (minY - pad) + ' ' + (maxX - minX + 2 * pad) + ' ' + (maxY - minY + 2 * pad);
  let g = '';
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)      /* 地面格（含空格） */
    g += '<path d="' + isoGround(r, c) + '" fill="' + GROUND.fill + '" stroke="' + GROUND.line + '" stroke-width="1.6"/>';
  let s = '';
  cubes.forEach(u => {                                          /* 立方体三面（共享顶点） */
    const f = isoFaces(u.r, u.c, u.k);
    s += '<g class="cu" data-r="' + u.r + '" data-c="' + u.c + '" data-k="' + u.k + '">' +
      '<path class="f-left" d="' + f.left + '" fill="' + CUBE.left + '" stroke="' + CUBE.edge + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path class="f-right" d="' + f.right + '" fill="' + CUBE.right + '" stroke="' + CUBE.edge + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path class="f-top" d="' + f.top + '" fill="' + CUBE.top + '" stroke="' + CUBE.edge + '" stroke-width="1.5" stroke-linejoin="round"/></g>';
  });
  let d = '';
  if (q.kind === 'fill') {                                      /* 虚线目标盒（SPEC §1） */
    const DASH = 'stroke="#E8873A" stroke-width="2.2" fill="none" stroke-dasharray="7 5"';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const gt = q.goal[r][c], h = cols[r][c];
      if (gt <= 0) continue;
      const t = isoTopDiamond(r, c, gt);                        /* 目标顶菱形 */
      d += '<path ' + DASH + ' d="M' + t.n[0] + ',' + t.n[1] + ' L' + t.e[0] + ',' + t.e[1] +
        ' L' + t.s[0] + ',' + t.s[1] + ' L' + t.w[0] + ',' + t.w[1] + ' Z"/>';
      if (gt > h) {                                             /* 缺口：东/南/西竖围栏（现高→目标高） */
        d += '<path ' + DASH + ' d="' + isoEdge(r, c, 'e', h, gt) + '"/>' +
             '<path ' + DASH + ' d="' + isoEdge(r, c, 's', h, gt) + '"/>' +
             '<path ' + DASH + ' d="' + isoEdge(r, c, 'w', h, gt) + '"/>';
      }
    }
  }
  /* 柱底数数角标（教学演示逐柱点数用，默认隐藏；圆片+数字在柱南角下方） */
  let badges = '';
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const x = (c - r) * ISO.ux, y = (c + r) * ISO.uy + 2 * ISO.uy + 15;
    badges += '<g class="dbadge" data-r="' + r + '" data-c="' + c + '" style="display:none">' +
      '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#FFF9EE" stroke="#E8975A" stroke-width="2.5"/>' +
      '<text x="' + x + '" y="' + (y + 6.5) + '" text-anchor="middle" font-size="19" font-weight="800" fill="' + INK +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + cols[r][c] + '</text></g>';
  }
  const svg = '<svg class="scene" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g class="ground">' + g + '</g><g class="stack">' + s + '</g>' +
    (d ? '<g class="goalbox">' + d + '</g>' : '') + '<g class="badges">' + badges + '</g></svg>';
  return { svg: svg, cells: cubes };
}

/* ---------- 正视图投影卡（SPEC §1：每列 c 取 max h over r 的条形投影图卡） ---------- */
const FRONT_CARD = { cw: 30, ch: 26, gap: 12 };
function frontCardSvg(profile) {
  const cw = FRONT_CARD.cw, ch = FRONT_CARD.ch, gap = FRONT_CARD.gap, pad = 8;
  const n = profile.length, top = 3 * ch;
  const W = n * cw + (n - 1) * gap + 2 * pad, H = top + 2 * pad + 6;
  let s = '';
  for (let c = 0; c < n; c++) {
    const x0 = pad + c * (cw + gap);
    for (let b = 0; b < profile[c]; b++) {
      const y0 = pad + top - (b + 1) * ch;
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + cw + '" height="' + ch + '" rx="3" fill="' + CUBE.right +
        '" stroke="' + INK + '" stroke-width="1.6"/>';
    }
  }
  s += '<path d="M' + (pad - 3) + ' ' + (pad + top + 3) + ' H' + (W - pad + 3) + '" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}

/* ---------- 俯视图投影卡（footprint 二值网格：行 r=0 后排在最上，h>0 亮格） ---------- */
const TOP_CARD = { gw: 30 };
function topCardSvg(foot) {
  const gw = TOP_CARD.gw, pad = 7;
  const R = foot.length, C = foot[0].length;
  const W = C * gw + 2 * pad, H = R * gw + 2 * pad;
  let s = '';
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
    s += '<rect x="' + (pad + c * gw) + '" y="' + (pad + r * gw) + '" width="' + gw + '" height="' + gw + '" rx="3" fill="' +
      (foot[r][c] ? CUBE.right : GROUND.fill) + '" stroke="' + INK + '" stroke-width="1.6"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="8" y="20" width="28" height="14" rx="3" fill="#E8975A" stroke="#FFF" stroke-width="2.2"/>' +
    '<path d="M15 20 L22 13 L36 20 Z" fill="#F8D494" stroke="#FFF" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M8 20 L15 13 L22 20 Z" fill="#C7793F" stroke="#FFF" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<rect x="8" y="6" width="28" height="14" rx="3" fill="#F8D494" stroke="#FFF" stroke-width="2.2"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 题面小图标：等轴测三小块叠高（题面卡左侧视觉锚点，非装饰：与场景同几何语言） */
  blocksMini: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M29 40 L43 33 L57 40 L43 47 Z" fill="#C7793F" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M15 33 L29 26 L43 33 L29 40 Z" fill="#F8D494" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M1 40 L15 33 L29 40 L15 47 Z" fill="#F8D494" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M29 26 L43 19 L57 26 L43 33 Z" fill="#F8D494" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M15 19 L29 12 L43 19 L29 26 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M1 26 L15 19 L29 26 L15 33 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></svg>'
};
